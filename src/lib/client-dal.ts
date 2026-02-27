import { redirect } from "next/navigation";
import { getClientSession, ClientSessionUser } from "./client-auth";

export async function verifyClientSession(): Promise<ClientSessionUser> {
  const session = await getClientSession();

  if (!session) {
    redirect("/my/login");
  }

  return session;
}
