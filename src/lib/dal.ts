import { redirect } from "next/navigation";
import { getSession, SessionUser } from "./auth";

const ROLE_HIERARCHY = { VIEWER: 0, STAFF: 1, ADMIN: 2 } as const;

export async function verifySession(): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function verifyAdmin(): Promise<SessionUser> {
  const session = await verifySession();

  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return session;
}

export async function verifyRole(minRole: "STAFF" | "ADMIN"): Promise<SessionUser> {
  const session = await verifySession();
  const roleLevel = ROLE_HIERARCHY[session.role as keyof typeof ROLE_HIERARCHY] ?? 0;
  if (roleLevel < ROLE_HIERARCHY[minRole]) {
    redirect("/dashboard?error=insufficient_permissions");
  }
  return session;
}
