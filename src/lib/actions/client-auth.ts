"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createClientSession,
  destroyClientSession,
  verifyClientPassword,
  hashClientPassword,
  getClientSession,
} from "@/lib/client-auth";
import { checkRateLimit, timingSafeDelay } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { sendMagicLinkEmail, sendPasswordResetEmail } from "@/lib/email";
import { MagicLinkRequestSchema, ClientLoginSchema, SetClientPasswordSchema } from "@/lib/validations/client-portal";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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

export async function requestMagicLink(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const raw = { email: formData.get("email") as string };
  const parsed = MagicLinkRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();

  // Rate limit: 5 requests per email per 15 minutes
  if (!checkRateLimit(`magic_link:${email}`, 5, 15 * 60 * 1000)) {
    // Always return success to prevent email enumeration
    await timingSafeDelay();
    return { success: true };
  }

  // Timing-safe: always delay the same amount regardless of outcome
  await timingSafeDelay();

  const account = await prisma.clientAccount.findUnique({
    where: { email, isActive: true },
    include: { primaryCustomer: { select: { firstName: true, lastName: true } } },
  });

  if (!account) {
    // Don't reveal whether email exists
    return { success: true };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await prisma.magicLink.create({
    data: {
      clientAccountId: account.id,
      token,
      channel: "EMAIL",
      destination: email,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const loginUrl = `${appUrl}/my/verify?token=${token}`;
  const name = `${account.primaryCustomer.firstName} ${account.primaryCustomer.lastName}`;

  try {
    await sendMagicLinkEmail({ to: email, name, loginUrl });
  } catch {
    // Don't reveal email delivery issues
  }

  return { success: true };
}

export async function verifyMagicLink(token: string): Promise<{ error?: string; resetPassword?: boolean }> {
  const link = await prisma.magicLink.findUnique({
    where: { token },
    include: { clientAccount: true },
  });

  if (!link) {
    return { error: "Invalid or expired link. Please request a new one." };
  }

  if (link.usedAt) {
    return { error: "This link has already been used. Please request a new one." };
  }

  if (new Date() > link.expiresAt) {
    return { error: "This link has expired. Please request a new one." };
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: link.id },
    data: { usedAt: new Date() },
  });

  // Reset failed login attempts on successful magic link
  await prisma.clientAccount.update({
    where: { id: link.clientAccountId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // Create session
  await createClientSession(link.clientAccountId);

  void logAudit({
    action: "CLIENT_LOGIN",
    model: "ClientAccount",
    recordId: link.clientAccountId,
    changes: { method: "magic_link" },
  });

  // If no password set, suggest setting one
  if (!link.clientAccount.passwordHash) {
    return { resetPassword: true };
  }

  return {};
}

export async function clientLogin(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = ClientLoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();

  // Rate limit
  if (!checkRateLimit(`client_login:${email}`, 10, 15 * 60 * 1000)) {
    return { error: "Too many login attempts. Please try again later." };
  }

  await timingSafeDelay();

  const account = await prisma.clientAccount.findUnique({
    where: { email, isActive: true },
  });

  if (!account || !account.passwordHash) {
    return { error: "Invalid email or password." };
  }

  // Check lockout
  if (account.lockedUntil && new Date() < account.lockedUntil) {
    return { error: "Account temporarily locked. Please try again later or use a sign-in link." };
  }

  const valid = await verifyClientPassword(parsed.data.password, account.passwordHash);

  if (!valid) {
    const newAttempts = account.failedLoginAttempts + 1;
    const lockout = newAttempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS)
      : null;

    await prisma.clientAccount.update({
      where: { id: account.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: lockout,
      },
    });

    void logAudit({
      action: "CLIENT_LOGIN_FAILED",
      model: "ClientAccount",
      recordId: account.id,
    });

    if (lockout) {
      return { error: "Account temporarily locked due to too many failed attempts." };
    }
    return { error: "Invalid email or password." };
  }

  // Reset failed attempts
  await prisma.clientAccount.update({
    where: { id: account.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await createClientSession(account.id);

  void logAudit({
    action: "CLIENT_LOGIN",
    model: "ClientAccount",
    recordId: account.id,
    changes: { method: "password" },
  });

  redirect("/my");
}

export async function clientLogout(): Promise<void> {
  const session = await getClientSession();

  if (session) {
    void logAudit({
      action: "CLIENT_LOGOUT",
      model: "ClientAccount",
      recordId: session.clientAccountId,
    });
  }

  await destroyClientSession();
  redirect("/my/login");
}

export async function setClientPassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await getClientSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = SetClientPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const hash = await hashClientPassword(parsed.data.password);

  await prisma.clientAccount.update({
    where: { id: session.clientAccountId },
    data: { passwordHash: hash },
  });

  void logAudit({
    action: "CLIENT_PASSWORD_CHANGE",
    model: "ClientAccount",
    recordId: session.clientAccountId,
  });

  return { success: true };
}

export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const raw = { email: formData.get("email") as string };
  const parsed = MagicLinkRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();

  if (!checkRateLimit(`password_reset:${email}`, 3, 15 * 60 * 1000)) {
    await timingSafeDelay();
    return { success: true };
  }

  await timingSafeDelay();

  const account = await prisma.clientAccount.findUnique({
    where: { email, isActive: true },
    include: { primaryCustomer: { select: { firstName: true, lastName: true } } },
  });

  if (!account) {
    return { success: true };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await prisma.magicLink.create({
    data: {
      clientAccountId: account.id,
      token,
      channel: "EMAIL",
      destination: email,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const resetUrl = `${appUrl}/my/verify?token=${token}&reset=1`;
  const name = `${account.primaryCustomer.firstName} ${account.primaryCustomer.lastName}`;

  try {
    await sendPasswordResetEmail({ to: email, name, resetUrl });
  } catch {
    // Silent failure
  }

  return { success: true };
}
