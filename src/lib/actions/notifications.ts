"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { NotificationType } from "@prisma/client";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  createdAt: Date;
  isRead: boolean;
};

export async function getMyNotifications(): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  const session = await verifySession();

  // Get disabled types for this user
  const disabledPrefs = await prisma.notificationPreference.findMany({
    where: { userId: session.id, enabled: false },
    select: { type: true },
  });
  const disabledTypes = disabledPrefs.map((p) => p.type);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const notifications = await prisma.notification.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      // Actor exclusion: show notifications where actorId is null (public) or not the current user
      OR: [{ actorId: null }, { actorId: { not: session.id } }],
      ...(disabledTypes.length > 0 ? { type: { notIn: disabledTypes } } : {}),
    },
    include: {
      reads: {
        where: { userId: session.id },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const items: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: n.createdAt,
    isRead: n.reads.length > 0,
  }));

  const unreadCount = items.filter((i) => !i.isRead).length;

  return { items, unreadCount };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const session = await verifySession();

  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: { notificationId, userId: session.id },
    },
    create: { notificationId, userId: session.id },
    update: {},
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await verifySession();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const unread = await prisma.notification.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      OR: [{ actorId: null }, { actorId: { not: session.id } }],
      reads: { none: { userId: session.id } },
    },
    select: { id: true },
  });

  if (unread.length === 0) return;

  await prisma.notificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId: session.id })),
    skipDuplicates: true,
  });
}

export async function updateNotificationPreference(
  type: NotificationType,
  enabled: boolean
): Promise<{ error?: string }> {
  const session = await verifySession();

  try {
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: session.id, type } },
      create: { userId: session.id, type, enabled },
      update: { enabled },
    });
    return {};
  } catch {
    return { error: "Failed to update preference" };
  }
}
