import { describe, it, expect, vi, beforeEach } from "vitest";

// Override global mock with real module for this test file
vi.mock("@/lib/gamification", async () => await vi.importActual("@/lib/gamification"));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("awardPoints", () => {
  it("creates ledger entry and increments family total", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    // Mock $transaction to execute the callback
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: vi.fn() },
        family: {
          update: vi.fn()
            .mockResolvedValueOnce({ tierPointsTotal: 125, tierLevel: 0 })
        },
        unlockCard: { create: vi.fn() },
      });
    });

    const result = await awardPoints("family-1", 25, "Appointment Booked", "apt-1", "Appointment");

    expect(result).toBeDefined();
    expect(result!.newTotal).toBe(125);
    expect(result!.tierUpgraded).toBe(false);
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1);
  });

  it("detects tier upgrade from Bronze to Silver at 500", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    const mockUnlockCreate = vi.fn();
    const mockFamilyUpdate = vi.fn()
      .mockResolvedValueOnce({ tierPointsTotal: 525, tierLevel: 0 }) // after increment
      .mockResolvedValueOnce({ tierLevel: 1 }); // after tier update

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: vi.fn() },
        family: { update: mockFamilyUpdate },
        unlockCard: { create: mockUnlockCreate },
      });
    });

    const result = await awardPoints("family-1", 100, "Order Picked Up");

    expect(result!.tierUpgraded).toBe(true);
    expect(result!.newTierLevel).toBe(1);
    // Should create milestone unlock card
    expect(mockUnlockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: "family-1",
          title: "Silver Welcome",
          status: "UNLOCKED",
        }),
      })
    );
  });

  it("detects tier upgrade from Silver to Gold at 1500", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    const mockUnlockCreate = vi.fn();
    const mockFamilyUpdate = vi.fn()
      .mockResolvedValueOnce({ tierPointsTotal: 1600, tierLevel: 1 })
      .mockResolvedValueOnce({ tierLevel: 2 });

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: vi.fn() },
        family: { update: mockFamilyUpdate },
        unlockCard: { create: mockUnlockCreate },
      });
    });

    const result = await awardPoints("family-1", 150, "Referral Qualified");

    expect(result!.tierUpgraded).toBe(true);
    expect(result!.newTierLevel).toBe(2);
    expect(mockUnlockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Gold Welcome",
        }),
      })
    );
  });

  it("does not upgrade when total stays within same tier", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: vi.fn() },
        family: {
          update: vi.fn().mockResolvedValue({ tierPointsTotal: 450, tierLevel: 0 }),
        },
        unlockCard: { create: vi.fn() },
      });
    });

    const result = await awardPoints("family-1", 50, "Style Quiz Completed");

    expect(result!.tierUpgraded).toBe(false);
    expect(result!.newTierLevel).toBeUndefined();
  });

  it("sends POINTS_EARNED notification", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");
    const { createClientNotificationForFamily } = await import("@/lib/client-notifications");

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: vi.fn() },
        family: {
          update: vi.fn().mockResolvedValue({ tierPointsTotal: 75, tierLevel: 0 }),
        },
        unlockCard: { create: vi.fn() },
      });
    });

    await awardPoints("family-1", 50, "Style Quiz Completed");

    expect(createClientNotificationForFamily).toHaveBeenCalledWith(
      expect.objectContaining({
        familyId: "family-1",
        type: "POINTS_EARNED",
        title: "+50 Vision Points",
        body: "Style Quiz Completed",
      })
    );
  });

  it("sends TIER_UPGRADED notification on upgrade", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");
    const { createClientNotificationForFamily } = await import("@/lib/client-notifications");

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: vi.fn() },
        family: {
          update: vi.fn()
            .mockResolvedValueOnce({ tierPointsTotal: 550, tierLevel: 0 })
            .mockResolvedValueOnce({ tierLevel: 1 }),
        },
        unlockCard: { create: vi.fn() },
      });
    });

    await awardPoints("family-1", 100, "Order Picked Up");

    // Should be called twice: POINTS_EARNED + TIER_UPGRADED
    expect(createClientNotificationForFamily).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TIER_UPGRADED",
        title: "Silver Status!",
      })
    );
  });

  it("returns null and does not throw on error", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));

    const result = await awardPoints("family-1", 50, "Test");

    expect(result).toBeNull();
  });

  it("passes refId and refType to ledger entry", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    const mockLedgerCreate = vi.fn();

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: mockLedgerCreate },
        family: {
          update: vi.fn().mockResolvedValue({ tierPointsTotal: 100, tierLevel: 0 }),
        },
        unlockCard: { create: vi.fn() },
      });
    });

    await awardPoints("family-1", 100, "Order Picked Up", "order-123", "Order");

    expect(mockLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        familyId: "family-1",
        points: 100,
        reason: "Order Picked Up",
        refId: "order-123",
        refType: "Order",
      }),
    });
  });

  it("handles null refId gracefully", async () => {
    const { awardPoints } = await import("@/lib/gamification");
    const { prisma } = await import("@/lib/prisma");

    const mockLedgerCreate = vi.fn();

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
      return cb({
        pointsLedger: { create: mockLedgerCreate },
        family: {
          update: vi.fn().mockResolvedValue({ tierPointsTotal: 50, tierLevel: 0 }),
        },
        unlockCard: { create: vi.fn() },
      });
    });

    await awardPoints("family-1", 50, "Quiz");

    expect(mockLedgerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        refId: null,
        refType: null,
      }),
    });
  });
});
