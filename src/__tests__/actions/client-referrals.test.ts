import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClientSession } from "../mocks/client-session";

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifyClientSession } = await import("@/lib/client-dal");
  vi.mocked(verifyClientSession).mockResolvedValue(mockClientSession);
});

describe("getOrCreateReferralCode", () => {
  it("returns existing code if one exists", async () => {
    const { getOrCreateReferralCode } = await import("@/lib/actions/client-referrals");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.referral.findFirst).mockResolvedValue({ code: "MV-ABCD-1234" } as any);
    vi.mocked(prisma.referral.count).mockResolvedValue(3);

    const result = await getOrCreateReferralCode();
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.code).toBe("MV-ABCD-1234");
      expect(result.referralCount).toBe(3);
    }
    expect(vi.mocked(prisma.referral.create)).not.toHaveBeenCalled();
  });

  it("generates a new code when none exists", async () => {
    const { getOrCreateReferralCode } = await import("@/lib/actions/client-referrals");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.referral.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.referral.findUnique).mockResolvedValue(null); // no collision
    vi.mocked(prisma.referral.create).mockResolvedValue({ code: "MV-TEST-CODE" } as any);
    vi.mocked(prisma.referral.count).mockResolvedValue(0);

    const result = await getOrCreateReferralCode();
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.code).toMatch(/^MV-/);
      expect(result.referralCount).toBe(0);
    }
    expect(vi.mocked(prisma.referral.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referrerId: "customer-1",
          status: "PENDING",
        }),
      })
    );
  });

  it("returns error on database failure", async () => {
    const { getOrCreateReferralCode } = await import("@/lib/actions/client-referrals");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.referral.findFirst).mockRejectedValue(new Error("DB error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await getOrCreateReferralCode();
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Failed to get referral code.");
    }

    consoleSpy.mockRestore();
  });

  it("counts only QUALIFIED and REWARDED referrals", async () => {
    const { getOrCreateReferralCode } = await import("@/lib/actions/client-referrals");
    const { prisma } = await import("@/lib/prisma");

    vi.mocked(prisma.referral.findFirst).mockResolvedValue({ code: "MV-XXXX-1111" } as any);
    vi.mocked(prisma.referral.count).mockResolvedValue(5);

    await getOrCreateReferralCode();

    expect(vi.mocked(prisma.referral.count)).toHaveBeenCalledWith({
      where: {
        referrerId: "customer-1",
        status: { in: ["QUALIFIED", "REWARDED"] },
      },
    });
  });
});
