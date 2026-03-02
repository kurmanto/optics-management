import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClientSession } from "../mocks/client-session";

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendClientNotificationEmail: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvoiceEmail: vi.fn(),
  sendIntakeEmail: vi.fn(),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifyClientSession } = await import("@/lib/client-dal");
  vi.mocked(verifyClientSession).mockResolvedValue(mockClientSession);
});

describe("getMyClientNotifications", () => {
  it("returns items and unread count scoped to clientAccountId", async () => {
    const { getMyClientNotifications } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    const mockItems = [
      { id: "n1", type: "ORDER_STATUS_UPDATE", title: "Ready", body: "Pick up.", href: null, isRead: false, createdAt: new Date() },
    ];

    vi.mocked(prisma.clientNotification.findMany).mockResolvedValue(mockItems as any);
    vi.mocked(prisma.clientNotification.count).mockResolvedValue(1);

    const result = await getMyClientNotifications();

    expect(result.items).toHaveLength(1);
    expect(result.unreadCount).toBe(1);
    expect(prisma.clientNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientAccountId: "client-1",
        }),
      })
    );
  });
});

describe("markClientNotificationRead", () => {
  it("marks notification as read", async () => {
    const { markClientNotificationRead } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotification.findUnique).mockResolvedValue({
      clientAccountId: "client-1",
    } as any);
    vi.mocked(prisma.clientNotification.update).mockResolvedValue({} as any);

    const result = await markClientNotificationRead("n1");
    expect(result).toEqual({});
    expect(prisma.clientNotification.update).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { isRead: true },
    });
  });

  it("returns error when notification not found", async () => {
    const { markClientNotificationRead } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotification.findUnique).mockResolvedValue(null);

    const result = await markClientNotificationRead("bad-id");
    expect(result).toEqual({ error: "Not found" });
  });

  it("returns error when notification belongs to another account", async () => {
    const { markClientNotificationRead } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotification.findUnique).mockResolvedValue({
      clientAccountId: "other-account",
    } as any);

    const result = await markClientNotificationRead("n1");
    expect(result).toEqual({ error: "Not found" });
  });
});

describe("markAllClientNotificationsRead", () => {
  it("marks all unread as read for current account", async () => {
    const { markAllClientNotificationsRead } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotification.updateMany).mockResolvedValue({ count: 3 } as any);

    const result = await markAllClientNotificationsRead();
    expect(result).toEqual({});
    expect(prisma.clientNotification.updateMany).toHaveBeenCalledWith({
      where: {
        clientAccountId: "client-1",
        isRead: false,
      },
      data: { isRead: true },
    });
  });
});

describe("updateClientNotificationPreference", () => {
  it("upserts preference for the given type", async () => {
    const { updateClientNotificationPreference } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotificationPreference.upsert).mockResolvedValue({} as any);

    const result = await updateClientNotificationPreference("EXAM_DUE_SOON", true, false);
    expect(result).toEqual({});
    expect(prisma.clientNotificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientAccountId_type: {
            clientAccountId: "client-1",
            type: "EXAM_DUE_SOON",
          },
        },
        create: expect.objectContaining({
          clientAccountId: "client-1",
          type: "EXAM_DUE_SOON",
          inAppEnabled: true,
          emailEnabled: false,
        }),
        update: {
          inAppEnabled: true,
          emailEnabled: false,
        },
      })
    );
  });
});

describe("getClientNotificationPreferences", () => {
  it("returns preferences for current account", async () => {
    const { getClientNotificationPreferences } = await import("@/lib/actions/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    const mockPrefs = [
      { type: "EXAM_DUE_SOON", inAppEnabled: true, emailEnabled: false },
    ];
    vi.mocked(prisma.clientNotificationPreference.findMany).mockResolvedValue(mockPrefs as any);

    const result = await getClientNotificationPreferences();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("EXAM_DUE_SOON");
  });
});
