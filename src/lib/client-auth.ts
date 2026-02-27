import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const CLIENT_SESSION_COOKIE = "mvo_client_session";
const CLIENT_LAST_ACTIVE_COOKIE = "mvo_client_last_active";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type ClientSessionUser = {
  clientAccountId: string;
  familyId: string;
  primaryCustomerId: string;
  email: string;
};

async function createClientSessionToken(clientAccountId: string): Promise<string> {
  const secret = process.env.CLIENT_SESSION_SECRET!;
  const payload = JSON.stringify({ clientAccountId, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");

  const { createHmac } = await import("crypto");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");

  return `${encoded}.${sig}`;
}

async function verifyClientSessionToken(
  token: string
): Promise<{ clientAccountId: string } | null> {
  try {
    const secret = process.env.CLIENT_SESSION_SECRET!;
    const [encoded, sig] = token.split(".");

    const { createHmac } = await import("crypto");
    const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());

    if (Date.now() - payload.iat > SESSION_MAX_AGE * 1000) return null;

    return { clientAccountId: payload.clientAccountId };
  } catch {
    return null;
  }
}

export async function createClientSession(clientAccountId: string) {
  const token = await createClientSessionToken(clientAccountId);
  const cookieStore = await cookies();

  cookieStore.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  cookieStore.set(CLIENT_LAST_ACTIVE_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  // Update last login
  await prisma.clientAccount.update({
    where: { id: clientAccountId },
    data: { lastLoginAt: new Date() },
  });
}

export async function getClientSession(): Promise<ClientSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;

  if (!token) return null;

  const payload = await verifyClientSessionToken(token);
  if (!payload) return null;

  const account = await prisma.clientAccount.findUnique({
    where: { id: payload.clientAccountId, isActive: true },
    select: {
      id: true,
      email: true,
      familyId: true,
      primaryCustomerId: true,
    },
  });

  if (!account) return null;

  return {
    clientAccountId: account.id,
    familyId: account.familyId,
    primaryCustomerId: account.primaryCustomerId,
    email: account.email,
  };
}

export async function destroyClientSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
  cookieStore.delete(CLIENT_LAST_ACTIVE_COOKIE);
}

export async function verifyClientPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashClientPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

// Re-export cookie names for middleware
export const CLIENT_COOKIE_NAMES = {
  session: CLIENT_SESSION_COOKIE,
  lastActive: CLIENT_LAST_ACTIVE_COOKIE,
} as const;
