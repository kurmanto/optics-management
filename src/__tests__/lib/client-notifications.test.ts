import { describe, it, expect, vi, beforeEach } from "vitest";

// Override the global mock to use the real implementation
vi.mock("@/lib/client-notifications", async () => {
  return await vi.importActual("@/lib/client-notifications");
});

vi.mock("@/lib/email", () => ({
  sendClientNotificationEmail: vi.fn(),
  sendMagicLinkEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvoiceEmail: vi.fn(),
  sendIntakeEmail: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createClientNotification", () => {
  it("creates notification when no preference exists", async () => {
    const { createClientNotification } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotificationPreference.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.clientNotification.create).mockResolvedValue({ id: "cn-1" } as any);
    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      email: "test@test.com",
      primaryCustomer: { firstName: "Alice" },
    } as any);
    vi.mocked(prisma.clientNotification.update).mockResolvedValue({} as any);

    await createClientNotification({
      clientAccountId: "ca-1",
      type: "ORDER_STATUS_UPDATE",
      title: "Order Ready",
      body: "Your order is ready for pickup.",
    });

    expect(prisma.clientNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientAccountId: "ca-1",
        type: "ORDER_STATUS_UPDATE",
        title: "Order Ready",
      }),
    });
  });

  it("skips notification when inAppEnabled is false", async () => {
    const { createClientNotification } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotificationPreference.findUnique).mockResolvedValue({
      inAppEnabled: false,
      emailEnabled: false,
    } as any);

    await createClientNotification({
      clientAccountId: "ca-1",
      type: "ORDER_STATUS_UPDATE",
      title: "Order Ready",
      body: "Your order is ready.",
    });

    expect(prisma.clientNotification.create).not.toHaveBeenCalled();
  });

  it("sends email when emailEnabled and sendEmail not false", async () => {
    const { createClientNotification } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");
    const { sendClientNotificationEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientNotificationPreference.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.clientNotification.create).mockResolvedValue({ id: "cn-1" } as any);
    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      email: "test@test.com",
      primaryCustomer: { firstName: "Alice" },
    } as any);
    vi.mocked(prisma.clientNotification.update).mockResolvedValue({} as any);

    await createClientNotification({
      clientAccountId: "ca-1",
      type: "EXAM_DUE_SOON",
      title: "Exam Due",
      body: "Time for a checkup.",
    });

    expect(sendClientNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "test@test.com", name: "Alice" })
    );
  });

  it("skips email when sendEmail is false", async () => {
    const { createClientNotification } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");
    const { sendClientNotificationEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientNotificationPreference.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.clientNotification.create).mockResolvedValue({ id: "cn-1" } as any);

    await createClientNotification({
      clientAccountId: "ca-1",
      type: "POINTS_EARNED",
      title: "Points",
      body: "+50 points",
      sendEmail: false,
    });

    expect(sendClientNotificationEmail).not.toHaveBeenCalled();
  });

  it("skips email when emailEnabled is false in preference", async () => {
    const { createClientNotification } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");
    const { sendClientNotificationEmail } = await import("@/lib/email");

    vi.mocked(prisma.clientNotificationPreference.findUnique).mockResolvedValue({
      inAppEnabled: true,
      emailEnabled: false,
    } as any);
    vi.mocked(prisma.clientNotification.create).mockResolvedValue({ id: "cn-1" } as any);

    await createClientNotification({
      clientAccountId: "ca-1",
      type: "TIER_UPGRADED",
      title: "Tier Up",
      body: "You reached Silver!",
    });

    expect(prisma.clientNotification.create).toHaveBeenCalled();
    expect(sendClientNotificationEmail).not.toHaveBeenCalled();
  });

  it("never throws even on error", async () => {
    const { createClientNotification } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientNotificationPreference.findUnique).mockRejectedValue(
      new Error("DB error")
    );

    // Should not throw
    await createClientNotification({
      clientAccountId: "ca-1",
      type: "ORDER_STATUS_UPDATE",
      title: "Test",
      body: "Test",
    });
    // If we get here, it didn't throw
    expect(true).toBe(true);
  });
});

describe("createClientNotificationForFamily", () => {
  it("looks up account by familyId and delegates", async () => {
    const { createClientNotificationForFamily } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findFirst).mockResolvedValue({ id: "ca-1" } as any);
    vi.mocked(prisma.clientNotificationPreference.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.clientNotification.create).mockResolvedValue({ id: "cn-1" } as any);
    vi.mocked(prisma.clientAccount.findUnique).mockResolvedValue({
      email: "test@test.com",
      primaryCustomer: { firstName: "Alice" },
    } as any);
    vi.mocked(prisma.clientNotification.update).mockResolvedValue({} as any);

    await createClientNotificationForFamily({
      familyId: "fam-1",
      type: "ORDER_STATUS_UPDATE",
      title: "Ready",
      body: "Pick up your order.",
    });

    expect(prisma.clientAccount.findFirst).toHaveBeenCalledWith({
      where: { familyId: "fam-1", isActive: true },
      select: { id: true },
    });
    expect(prisma.clientNotification.create).toHaveBeenCalled();
  });

  it("does nothing when no account found", async () => {
    const { createClientNotificationForFamily } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findFirst).mockResolvedValue(null);

    await createClientNotificationForFamily({
      familyId: "fam-no-account",
      type: "ORDER_STATUS_UPDATE",
      title: "Ready",
      body: "Pick up.",
    });

    expect(prisma.clientNotification.create).not.toHaveBeenCalled();
  });

  it("never throws even on error", async () => {
    const { createClientNotificationForFamily } = await import("@/lib/client-notifications");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.clientAccount.findFirst).mockRejectedValue(new Error("DB fail"));

    await createClientNotificationForFamily({
      familyId: "fam-1",
      type: "ORDER_STATUS_UPDATE",
      title: "Test",
      body: "Test",
    });
    // If we get here, it didn't throw
    expect(true).toBe(true);
  });
});
