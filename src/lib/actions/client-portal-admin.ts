"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { sendMagicLinkEmail } from "@/lib/email";
import { CreateClientAccountSchema, CreateUnlockCardSchema } from "@/lib/validations/client-portal";
import { UnlockCardStatus } from "@prisma/client";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 48; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

export async function createClientPortalAccount(formData: FormData): Promise<{ error?: string }> {
  const session = await verifyRole("STAFF");

  const raw = {
    familyId: formData.get("familyId") as string,
    primaryCustomerId: formData.get("primaryCustomerId") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || undefined,
  };

  const parsed = CreateClientAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check family exists
  const family = await prisma.family.findUnique({ where: { id: parsed.data.familyId } });
  if (!family) {
    return { error: "Family not found." };
  }

  // Check customer belongs to family
  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.primaryCustomerId },
  });
  if (!customer || customer.familyId !== parsed.data.familyId) {
    return { error: "Customer does not belong to this family." };
  }

  // Check no existing account for this email
  const existing = await prisma.clientAccount.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) {
    return { error: "A portal account already exists for this email." };
  }

  // Check no existing account for this customer
  const existingByCustomer = await prisma.clientAccount.findUnique({
    where: { primaryCustomerId: parsed.data.primaryCustomerId },
  });
  if (existingByCustomer) {
    return { error: "This customer already has a portal account." };
  }

  const account = await prisma.$transaction(async (tx) => {
    // Create account
    const acc = await tx.clientAccount.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        familyId: parsed.data.familyId,
        primaryCustomerId: parsed.data.primaryCustomerId,
      },
    });

    // Enable portal on family
    await tx.family.update({
      where: { id: parsed.data.familyId },
      data: { portalEnabled: true },
    });

    return acc;
  });

  void logAudit({
    userId: session.id,
    action: "CREATE",
    model: "ClientAccount",
    recordId: account.id,
    changes: { email: parsed.data.email, familyId: parsed.data.familyId },
  });

  return {};
}

export async function disableClientPortalAccount(clientAccountId: string): Promise<{ error?: string }> {
  const session = await verifyRole("ADMIN");

  const account = await prisma.clientAccount.findUnique({ where: { id: clientAccountId } });
  if (!account) {
    return { error: "Account not found." };
  }

  await prisma.clientAccount.update({
    where: { id: clientAccountId },
    data: { isActive: false },
  });

  void logAudit({
    userId: session.id,
    action: "UPDATE",
    model: "ClientAccount",
    recordId: clientAccountId,
    changes: { isActive: false },
  });

  return {};
}

export async function sendPortalInviteEmail(clientAccountId: string): Promise<{ error?: string }> {
  await verifyRole("STAFF");

  const account = await prisma.clientAccount.findUnique({
    where: { id: clientAccountId, isActive: true },
    include: { primaryCustomer: { select: { firstName: true, lastName: true } } },
  });

  if (!account) {
    return { error: "Account not found or inactive." };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.magicLink.create({
    data: {
      clientAccountId: account.id,
      token,
      channel: "EMAIL",
      destination: account.email,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const loginUrl = `${appUrl}/my/verify?token=${token}`;
  const name = `${account.primaryCustomer.firstName} ${account.primaryCustomer.lastName}`;

  try {
    await sendMagicLinkEmail({ to: account.email, name, loginUrl });
  } catch {
    return { error: "Failed to send email." };
  }

  return {};
}

export async function createUnlockCard(formData: FormData): Promise<{ error?: string }> {
  const session = await verifyRole("STAFF");

  let triggerRule: Record<string, unknown> | undefined;
  const triggerRuleRaw = formData.get("triggerRule") as string;
  if (triggerRuleRaw) {
    try {
      triggerRule = JSON.parse(triggerRuleRaw);
    } catch {
      return { error: "Invalid trigger rule JSON." };
    }
  }

  const raw = {
    familyId: formData.get("familyId") as string,
    customerId: (formData.get("customerId") as string) || undefined,
    type: formData.get("type") as string,
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    status: (formData.get("status") as string) || "LOCKED",
    value: formData.get("value") ? Number(formData.get("value")) : undefined,
    valueType: (formData.get("valueType") as string) || undefined,
    progressGoal: formData.get("progressGoal") ? Number(formData.get("progressGoal")) : undefined,
    triggerRule,
  };

  const parsed = CreateUnlockCardSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const card = await prisma.unlockCard.create({
    data: {
      familyId: parsed.data.familyId,
      customerId: parsed.data.customerId || null,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status as UnlockCardStatus,
      value: parsed.data.value,
      valueType: parsed.data.valueType,
      progressGoal: parsed.data.progressGoal,
      triggerRule: (parsed.data.triggerRule ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      unlockedAt: parsed.data.status === "UNLOCKED" ? new Date() : null,
      unlockedBy: parsed.data.status === "UNLOCKED" ? session.id : null,
    },
  });

  void logAudit({
    userId: session.id,
    action: "CREATE",
    model: "UnlockCard",
    recordId: card.id,
    changes: { title: parsed.data.title, type: parsed.data.type },
  });

  return {};
}

export async function updateUnlockCardStatus(
  cardId: string,
  newStatus: "LOCKED" | "UNLOCKED" | "CLAIMED" | "EXPIRED"
): Promise<{ error?: string }> {
  const session = await verifyRole("STAFF");

  const card = await prisma.unlockCard.findUnique({ where: { id: cardId } });
  if (!card) {
    return { error: "Card not found." };
  }

  const data: Record<string, unknown> = { status: newStatus as UnlockCardStatus };

  if (newStatus === "UNLOCKED") {
    data.unlockedAt = new Date();
    data.unlockedBy = session.id;
  } else if (newStatus === "CLAIMED") {
    data.claimedAt = new Date();
  }

  await prisma.unlockCard.update({
    where: { id: cardId },
    data,
  });

  void logAudit({
    userId: session.id,
    action: "STATUS_CHANGE",
    model: "UnlockCard",
    recordId: cardId,
    changes: { from: card.status, to: newStatus },
  });

  return {};
}
