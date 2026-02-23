"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword, hashPassword } from "@/lib/auth";
import { verifySession } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
};

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    return { error: "Invalid email or password" };
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const lockedTime = user.lockedUntil.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { error: `Account locked until ${lockedTime}. Too many failed attempts.` };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    const newAttempts = user.failedLoginAttempts + 1;
    const isLocked = newAttempts >= MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: isLocked
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : user.lockedUntil,
      },
    });

    if (isLocked) {
      void logAudit({ userId: user.id, action: "ACCOUNT_LOCKED", model: "User", recordId: user.id });
    } else {
      void logAudit({ userId: user.id, action: "LOGIN_FAILED", model: "User", recordId: user.id });
    }

    return { error: "Invalid email or password" };
  }

  // Successful login — reset lockout state
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  void logAudit({ userId: user.id, action: "LOGIN", model: "User", recordId: user.id });

  await createSession(user);
  redirect("/dashboard");
}

export async function logout() {
  const session = await verifySession().catch(() => null);
  if (session) {
    void logAudit({ userId: session.id, action: "LOGOUT", model: "User", recordId: session.id });
  }
  await destroySession();
  redirect("/login");
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "At least 12 characters")
    .regex(/[A-Z]/, "One uppercase letter required")
    .regex(/[a-z]/, "One lowercase letter required")
    .regex(/[0-9]/, "One number required")
    .regex(/[^A-Za-z0-9]/, "One special character required"),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type ChangePasswordState = {
  error?: string;
  success?: boolean;
};

export async function changePassword(
  prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await verifySession();

  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = ChangePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
  });

  if (!user) return { error: "User not found" };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash, mustChangePassword: false },
  });

  void logAudit({ userId: session.id, action: "PASSWORD_CHANGE", model: "User", recordId: session.id });

  return { success: true };
}
