import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { User } from "@prisma/client";

const SESSION_COOKIE = "mvo_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  fontSizePreference: 'SMALL' | 'MEDIUM' | 'LARGE';
};

// Create a signed session token (simple HMAC with session secret)
async function createSessionToken(userId: string): Promise<string> {
  const secret = process.env.SESSION_SECRET!;
  const payload = JSON.stringify({ userId, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");

  const { createHmac } = await import("crypto");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");

  return `${encoded}.${sig}`;
}

async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = process.env.SESSION_SECRET!;
    const [encoded, sig] = token.split(".");

    const { createHmac } = await import("crypto");
    const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());

    // Check token age (7 days)
    if (Date.now() - payload.iat > SESSION_MAX_AGE * 1000) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function createSession(user: User) {
  const token = await createSessionToken(user.id);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId, isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      fontSizePreference: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    fontSizePreference: user.fontSizePreference,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
