"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, verifyPassword, hashPassword } from "@/lib/auth";
import { verifySession } from "@/lib/dal";
import { z } from "zod";

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

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  await createSession(user);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
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

  return { success: true };
}
