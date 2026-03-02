"use server";

import { prisma } from "@/lib/prisma";
import { verifyClientSession } from "@/lib/client-dal";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `MV-${seg1}-${seg2}`;
}

export async function getOrCreateReferralCode(): Promise<{
  code: string;
  referralCount: number;
} | { error: string }> {
  const session = await verifyClientSession();

  try {
    // Get primary customer for this portal account
    const customerId = session.primaryCustomerId;

    // Check for existing pending referral with a code
    const existing = await prisma.referral.findFirst({
      where: { referrerId: customerId, status: "PENDING", code: { not: null } },
      select: { code: true },
    });

    let code: string;
    if (existing?.code) {
      code = existing.code;
    } else {
      // Generate unique code
      code = generateCode();
      for (let i = 0; i < 10; i++) {
        const collision = await prisma.referral.findUnique({ where: { code } });
        if (!collision) break;
        code = generateCode();
      }

      await prisma.referral.create({
        data: {
          referrerId: customerId,
          code,
          status: "PENDING",
        },
      });
    }

    // Count qualified/rewarded referrals
    const referralCount = await prisma.referral.count({
      where: {
        referrerId: customerId,
        status: { in: ["QUALIFIED", "REWARDED"] },
      },
    });

    return { code, referralCount };
  } catch (e) {
    console.error("[client-referrals] Error:", e);
    return { error: "Failed to get referral code." };
  }
}
