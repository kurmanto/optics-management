import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkAndUnlockCards", () => {
  it("does nothing when no locked cards with trigger rules", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([]);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).not.toHaveBeenCalled();
  });

  it("unlocks card when STYLE_QUIZ_COMPLETED and member has profile", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-1", triggerRule: { type: "STYLE_QUIZ_COMPLETED" }, progressGoal: null },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: { label: "Bold Trendsetter" } },
    ] as any);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-1" },
        data: expect.objectContaining({
          status: "UNLOCKED",
          unlockedBy: "system",
        }),
      })
    );
  });

  it("does NOT unlock STYLE_QUIZ_COMPLETED when no members have profile", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-1", triggerRule: { type: "STYLE_QUIZ_COMPLETED" }, progressGoal: null },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).not.toHaveBeenCalled();
  });

  it("unlocks card when REFERRAL_COUNT threshold met", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-2", triggerRule: { type: "REFERRAL_COUNT", threshold: 2 }, progressGoal: 2 },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);
    vi.mocked(prisma.referral.count).mockResolvedValue(3);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-2" },
        data: expect.objectContaining({ status: "UNLOCKED", progress: 3 }),
      })
    );
  });

  it("updates progress when REFERRAL_COUNT threshold NOT met", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-2", triggerRule: { type: "REFERRAL_COUNT", threshold: 5 }, progressGoal: 5 },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);
    vi.mocked(prisma.referral.count).mockResolvedValue(2);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-2" },
        data: { progress: 2 },
      })
    );
  });

  it("unlocks card when ORDER_COUNT threshold met", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-3", triggerRule: { type: "ORDER_COUNT", threshold: 3 }, progressGoal: 3 },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);
    vi.mocked(prisma.order.count).mockResolvedValue(4);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-3" },
        data: expect.objectContaining({ status: "UNLOCKED", progress: 4 }),
      })
    );
  });

  it("unlocks card when APPOINTMENT_BOOKED and future appointment exists", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-4", triggerRule: { type: "APPOINTMENT_BOOKED" }, progressGoal: null },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({ id: "apt-1" } as any);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-4" },
        data: expect.objectContaining({ status: "UNLOCKED" }),
      })
    );
  });

  it("does NOT unlock APPOINTMENT_BOOKED when no future appointment", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-4", triggerRule: { type: "APPOINTMENT_BOOKED" }, progressGoal: null },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).not.toHaveBeenCalled();
  });

  it("evaluates multiple cards in one call", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-1", triggerRule: { type: "STYLE_QUIZ_COMPLETED" }, progressGoal: null },
      { id: "card-2", triggerRule: { type: "REFERRAL_COUNT", threshold: 1 }, progressGoal: 1 },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: { label: "X" } },
    ] as any);
    vi.mocked(prisma.referral.count).mockResolvedValue(2);
    vi.mocked(prisma.unlockCard.update).mockResolvedValue({} as any);

    await checkAndUnlockCards("family-1");

    // Both cards should be unlocked
    expect(vi.mocked(prisma.unlockCard.update)).toHaveBeenCalledTimes(2);
  });

  it("never throws — logs error and returns", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockRejectedValue(new Error("DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(checkAndUnlockCards("family-1")).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("skips cards with null or invalid triggerRule", async () => {
    const { checkAndUnlockCards } = await import("@/lib/unlock-triggers");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.unlockCard.findMany).mockResolvedValue([
      { id: "card-x", triggerRule: {}, progressGoal: null },
    ] as any);
    vi.mocked(prisma.customer.findMany).mockResolvedValue([
      { id: "c1", styleProfile: null },
    ] as any);

    await checkAndUnlockCards("family-1");

    expect(vi.mocked(prisma.unlockCard.update)).not.toHaveBeenCalled();
  });
});
