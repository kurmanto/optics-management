"use server";

import { ClientNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyClientSession } from "@/lib/client-dal";

export async function getMyClientNotifications() {
  const session = await verifyClientSession();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [items, unreadCount] = await Promise.all([
    prisma.clientNotification.findMany({
      where: {
        clientAccountId: session.clientAccountId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.clientNotification.count({
      where: {
        clientAccountId: session.clientAccountId,
        isRead: false,
      },
    }),
  ]);

  return { items, unreadCount };
}

export async function markClientNotificationRead(id: string): Promise<{ error?: string }> {
  const session = await verifyClientSession();

  const notification = await prisma.clientNotification.findUnique({
    where: { id },
    select: { clientAccountId: true },
  });

  if (!notification || notification.clientAccountId !== session.clientAccountId) {
    return { error: "Not found" };
  }

  await prisma.clientNotification.update({
    where: { id },
    data: { isRead: true },
  });

  return {};
}

export async function markAllClientNotificationsRead(): Promise<{ error?: string }> {
  const session = await verifyClientSession();

  await prisma.clientNotification.updateMany({
    where: {
      clientAccountId: session.clientAccountId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return {};
}

export async function updateClientNotificationPreference(
  type: ClientNotificationType,
  inAppEnabled: boolean,
  emailEnabled: boolean
): Promise<{ error?: string }> {
  const session = await verifyClientSession();

  await prisma.clientNotificationPreference.upsert({
    where: {
      clientAccountId_type: {
        clientAccountId: session.clientAccountId,
        type,
      },
    },
    create: {
      clientAccountId: session.clientAccountId,
      type,
      inAppEnabled,
      emailEnabled,
    },
    update: {
      inAppEnabled,
      emailEnabled,
    },
  });

  return {};
}

export async function getClientNotificationPreferences() {
  const session = await verifyClientSession();

  const prefs = await prisma.clientNotificationPreference.findMany({
    where: { clientAccountId: session.clientAccountId },
    select: {
      type: true,
      inAppEnabled: true,
      emailEnabled: true,
    },
  });

  return prefs;
}
