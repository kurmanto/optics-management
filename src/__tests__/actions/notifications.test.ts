import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

// ── Notification stubs ─────────────────────────────────────────────────────────

function makeNotification(overrides: {
  id?: string;
  type?: string;
  actorId?: string | null;
  reads?: { id: string }[];
}) {
  return {
    id: overrides.id ?? "notif-1",
    type: overrides.type ?? "ORDER_READY",
    title: "Test",
    body: "Test body",
    href: "/orders/1",
    createdAt: new Date(),
    actorId: overrides.actorId !== undefined ? overrides.actorId : "other-user",
    reads: overrides.reads ?? [],
  };
}

describe("getMyNotifications", () => {
  it("returns empty items and zero unreadCount when no notifications", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);

    const { getMyNotifications } = await import("@/lib/actions/notifications");
    const result = await getMyNotifications();

    expect(result.items).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });

  it("returns correct unreadCount for unread notifications", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([
      makeNotification({ id: "n1", reads: [] }),          // unread
      makeNotification({ id: "n2", reads: [{ id: "r1" }] }), // read
      makeNotification({ id: "n3", reads: [] }),          // unread
    ]);

    const { getMyNotifications } = await import("@/lib/actions/notifications");
    const result = await getMyNotifications();

    expect(result.unreadCount).toBe(2);
    expect(result.items).toHaveLength(3);
  });

  it("excludes disabled notification types", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.findMany.mockResolvedValue([
      { type: "ORDER_READY" },
    ]);
    // The action queries with type: { notIn: disabledTypes } — we just verify the query
    prisma.notification.findMany.mockResolvedValue([]);

    const { getMyNotifications } = await import("@/lib/actions/notifications");
    await getMyNotifications();

    const queryArgs = prisma.notification.findMany.mock.calls[0][0];
    expect(queryArgs.where).toMatchObject({
      type: { notIn: ["ORDER_READY"] },
    });
  });

  it("does not include type filter when all prefs enabled", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);

    const { getMyNotifications } = await import("@/lib/actions/notifications");
    await getMyNotifications();

    const queryArgs = prisma.notification.findMany.mock.calls[0][0];
    expect(queryArgs.where.type).toBeUndefined();
  });

  it("includes actor exclusion OR filter", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([]);

    const { getMyNotifications } = await import("@/lib/actions/notifications");
    await getMyNotifications();

    const queryArgs = prisma.notification.findMany.mock.calls[0][0];
    expect(queryArgs.where.OR).toContainEqual({ actorId: null });
    expect(queryArgs.where.OR).toContainEqual({
      actorId: { not: mockSession.id },
    });
  });

  it("maps isRead correctly based on reads array", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notification.findMany.mockResolvedValue([
      makeNotification({ id: "read-notif", reads: [{ id: "r1" }] }),
      makeNotification({ id: "unread-notif", reads: [] }),
    ]);

    const { getMyNotifications } = await import("@/lib/actions/notifications");
    const result = await getMyNotifications();

    const readItem = result.items.find((i) => i.id === "read-notif");
    const unreadItem = result.items.find((i) => i.id === "unread-notif");
    expect(readItem?.isRead).toBe(true);
    expect(unreadItem?.isRead).toBe(false);
  });
});

describe("markNotificationRead", () => {
  it("calls notificationRead.upsert with correct args", async () => {
    const prisma = await getPrisma();
    prisma.notificationRead.upsert.mockResolvedValue({});

    const { markNotificationRead } = await import("@/lib/actions/notifications");
    await markNotificationRead("notif-1");

    expect(prisma.notificationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          notificationId_userId: {
            notificationId: "notif-1",
            userId: mockSession.id,
          },
        },
        create: { notificationId: "notif-1", userId: mockSession.id },
        update: {},
      })
    );
  });
});

describe("markAllNotificationsRead", () => {
  it("does nothing when no unread notifications", async () => {
    const prisma = await getPrisma();
    prisma.notification.findMany.mockResolvedValue([]);

    const { markAllNotificationsRead } = await import("@/lib/actions/notifications");
    await markAllNotificationsRead();

    expect(prisma.notificationRead.createMany).not.toHaveBeenCalled();
  });

  it("calls createMany for all unread notifications", async () => {
    const prisma = await getPrisma();
    prisma.notification.findMany.mockResolvedValue([
      { id: "n1" },
      { id: "n2" },
    ]);
    prisma.notificationRead.createMany.mockResolvedValue({ count: 2 });

    const { markAllNotificationsRead } = await import("@/lib/actions/notifications");
    await markAllNotificationsRead();

    expect(prisma.notificationRead.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { notificationId: "n1", userId: mockSession.id },
          { notificationId: "n2", userId: mockSession.id },
        ],
        skipDuplicates: true,
      })
    );
  });
});

describe("updateNotificationPreference", () => {
  it("calls notificationPreference.upsert with type and enabled", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.upsert.mockResolvedValue({});

    const { updateNotificationPreference } = await import("@/lib/actions/notifications");
    const result = await updateNotificationPreference("ORDER_READY" as any, false);

    expect(result.error).toBeUndefined();
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type: { userId: mockSession.id, type: "ORDER_READY" } },
        create: { userId: mockSession.id, type: "ORDER_READY", enabled: false },
        update: { enabled: false },
      })
    );
  });

  it("returns error when upsert fails", async () => {
    const prisma = await getPrisma();
    prisma.notificationPreference.upsert.mockRejectedValue(new Error("DB fail"));

    const { updateNotificationPreference } = await import("@/lib/actions/notifications");
    const result = await updateNotificationPreference("ORDER_READY" as any, true);

    expect(result.error).toBeDefined();
  });
});
