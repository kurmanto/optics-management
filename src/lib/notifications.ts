import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

type Params = {
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  actorId?: string;
  refId?: string;
  refType?: string;
};

export async function createNotification(params: Params): Promise<void> {
  try {
    await prisma.notification.create({ data: { ...params } });
  } catch (err) {
    // Swallow — notification failure must never crash the primary action
    console.error("[createNotification]", err);
  }
}
