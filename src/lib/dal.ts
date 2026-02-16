import { redirect } from "next/navigation";
import { getSession, SessionUser } from "./auth";

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
