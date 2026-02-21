"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { createNotification } from "@/lib/notifications";

function generateCode(firstName: string, lastName: string): string {
  const first2 = (firstName || "XX").slice(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  const last2 = (lastName || "XX").slice(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `MV-${first2}${last2}-${digits}`;
}

export async function generateReferralCode(
  customerId: string
): Promise<{ code: string; referralId: string } | { error: string }> {
  const session = await verifySession();

  try {
    // Check if customer already has an active (PENDING) referral code
    const existing = await prisma.referral.findFirst({
      where: { referrerId: customerId, status: "PENDING", code: { not: null } },
      select: { id: true, code: true },
    });
    if (existing?.code) {
      return { code: existing.code, referralId: existing.id };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true },
    });
    if (!customer) return { error: "Customer not found" };

    // Generate unique code
    let code = generateCode(customer.firstName, customer.lastName);
    for (let i = 0; i < 10; i++) {
      const collision = await prisma.referral.findUnique({ where: { code } });
      if (!collision) break;
      code = generateCode(customer.firstName, customer.lastName);
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId: customerId,
        code,
        status: "PENDING",
      },
    });

    revalidatePath(`/customers/${customerId}`);
    return { code, referralId: referral.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate referral code" };
  }
}

export async function validateReferralCode(
  code: string
): Promise<{ referralId: string; referrerName: string; rewardAmount: number } | { error: string }> {
  await verifySession();

  try {
    const referral = await prisma.referral.findUnique({
      where: { code },
      include: { referrer: { select: { firstName: true, lastName: true } } },
    });

    if (!referral) return { error: "Referral code not found" };
    if (referral.status !== "PENDING") return { error: "This referral code has already been used" };

    return {
      referralId: referral.id,
      referrerName: `${referral.referrer.firstName} ${referral.referrer.lastName}`,
      rewardAmount: 25,
    };
  } catch (e) {
    console.error(e);
    return { error: "Failed to validate referral code" };
  }
}

export async function redeemReferral(
  referralId: string,
  referredCustomerId: string,
  orderId: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession();

  try {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      include: { referrer: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!referral) return { error: "Referral not found" };
    if (referral.status !== "PENDING") return { error: "Referral already used" };

    await prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: referralId },
        data: {
          referredId: referredCustomerId,
          status: "QUALIFIED",
          orderId,
          rewardAmount: 25,
          rewardPaidAt: new Date(),
        },
      });

      // Award $25 store credit to referrer
      await tx.storeCredit.create({
        data: {
          customerId: referral.referrerId,
          type: "REFERRAL",
          amount: 25,
          description: `Referral reward — code ${referral.code}`,
        },
      });
    });

    await createNotification({
      type: "ORDER_READY",
      title: "Referral Reward Earned",
      body: `${referral.referrer.firstName} ${referral.referrer.lastName} earned a $25 referral credit.`,
      href: `/customers/${referral.referrerId}`,
      actorId: session.id,
      refId: referralId,
      refType: "Referral",
    });

    revalidatePath(`/customers/${referral.referrerId}`);
    revalidatePath(`/customers/${referredCustomerId}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to redeem referral" };
  }
}

export async function getCustomerReferrals(customerId: string) {
  await verifySession();

  const [given, received] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerId: customerId },
      include: { referred: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where: { referredId: customerId },
      include: { referrer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { given, received };
}
