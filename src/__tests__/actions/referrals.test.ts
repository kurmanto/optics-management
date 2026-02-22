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

describe("generateReferralCode", () => {
  it("returns existing code when customer already has one", async () => {
    const prisma = await getPrisma();
    prisma.referral.findFirst.mockResolvedValue({ id: "ref-1", code: "MV-ALGO-1234" });

    const { generateReferralCode } = await import("@/lib/actions/referrals");
    const result = await generateReferralCode("cust-1");
    expect(result).toEqual({ code: "MV-ALGO-1234", referralId: "ref-1" });
    // Should NOT call customer lookup since existing code found
    expect(prisma.customer.findUnique).not.toHaveBeenCalled();
  });

  it("creates new referral code when none exists", async () => {
    const prisma = await getPrisma();
    prisma.referral.findFirst.mockResolvedValue(null);
    prisma.customer.findUnique.mockResolvedValue({ firstName: "Alice", lastName: "Brown" });
    prisma.referral.findUnique.mockResolvedValue(null); // no collision
    prisma.referral.create.mockResolvedValue({ id: "ref-2", code: "MV-ALBR-5678" });

    const { generateReferralCode } = await import("@/lib/actions/referrals");
    const result = await generateReferralCode("cust-1");
    expect(result).toHaveProperty("code");
    expect(result).toHaveProperty("referralId");
    expect(prisma.referral.create).toHaveBeenCalled();
  });

  it("returns error when customer not found", async () => {
    const prisma = await getPrisma();
    prisma.referral.findFirst.mockResolvedValue(null);
    prisma.customer.findUnique.mockResolvedValue(null);

    const { generateReferralCode } = await import("@/lib/actions/referrals");
    const result = await generateReferralCode("cust-missing");
    expect(result).toHaveProperty("error");
  });
});

describe("validateReferralCode", () => {
  it("returns error when code not found", async () => {
    const prisma = await getPrisma();
    prisma.referral.findUnique.mockResolvedValue(null);

    const { validateReferralCode } = await import("@/lib/actions/referrals");
    const result = await validateReferralCode("MV-XXXX-0000");
    expect((result as any).error).toMatch(/not found/i);
  });

  it("returns error when referral already used", async () => {
    const prisma = await getPrisma();
    prisma.referral.findUnique.mockResolvedValue({
      id: "ref-1",
      status: "QUALIFIED",
      referrer: { firstName: "Alice", lastName: "Brown" },
    });

    const { validateReferralCode } = await import("@/lib/actions/referrals");
    const result = await validateReferralCode("MV-ALGR-1234");
    expect((result as any).error).toMatch(/already been used/i);
  });

  it("returns referrer info on valid pending code", async () => {
    const prisma = await getPrisma();
    prisma.referral.findUnique.mockResolvedValue({
      id: "ref-1",
      status: "PENDING",
      referrer: { firstName: "Alice", lastName: "Brown" },
    });

    const { validateReferralCode } = await import("@/lib/actions/referrals");
    const result = await validateReferralCode("MV-ALBR-5678");
    expect(result).toMatchObject({
      referralId: "ref-1",
      referrerName: "Alice Brown",
      rewardAmount: 25,
    });
  });
});

describe("getCustomerReferrals", () => {
  it("returns given and received arrays with nested customer names", async () => {
    const prisma = await getPrisma();
    prisma.referral.findMany
      .mockResolvedValueOnce([
        {
          id: "ref-1",
          code: "MV-ALBR-1234",
          status: "PENDING",
          referred: { firstName: "Bob", lastName: "Jones" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "ref-2",
          code: "MV-XYZW-5678",
          status: "QUALIFIED",
          referrer: { firstName: "Alice", lastName: "Brown" },
        },
      ]);

    const { getCustomerReferrals } = await import("@/lib/actions/referrals");
    const result = await getCustomerReferrals("cust-1");

    expect(result.given).toHaveLength(1);
    expect(result.given[0].referred!.firstName).toBe("Bob");
    expect(result.received).toHaveLength(1);
    expect(result.received[0].referrer!.firstName).toBe("Alice");
  });

  it("returns empty arrays when both findMany return []", async () => {
    const prisma = await getPrisma();
    prisma.referral.findMany.mockResolvedValue([]);

    const { getCustomerReferrals } = await import("@/lib/actions/referrals");
    const result = await getCustomerReferrals("cust-no-referrals");

    expect(result.given).toEqual([]);
    expect(result.received).toEqual([]);
  });
});

describe("redeemReferral", () => {
  it("returns error when referral not found", async () => {
    const prisma = await getPrisma();
    prisma.referral.findUnique.mockResolvedValue(null);

    const { redeemReferral } = await import("@/lib/actions/referrals");
    const result = await redeemReferral("ref-missing", "cust-2", "order-1");
    expect(result).toHaveProperty("error");
  });

  it("returns error when referral already used", async () => {
    const prisma = await getPrisma();
    prisma.referral.findUnique.mockResolvedValue({
      id: "ref-1",
      referrerId: "cust-1",
      status: "QUALIFIED",
      code: "MV-ALGR-1234",
      referrer: { id: "cust-1", firstName: "Alice", lastName: "Brown" },
    });

    const { redeemReferral } = await import("@/lib/actions/referrals");
    const result = await redeemReferral("ref-1", "cust-2", "order-1");
    expect((result as any).error).toBe("Referral already used");
  });

  it("creates store credit and updates referral on success", async () => {
    const prisma = await getPrisma();
    prisma.referral.findUnique.mockResolvedValue({
      id: "ref-1",
      referrerId: "cust-1",
      status: "PENDING",
      code: "MV-ALBR-5678",
      referrer: { id: "cust-1", firstName: "Alice", lastName: "Brown" },
    });
    // $transaction calls fn(mock) — the mock is the prisma object itself
    // referral.update and storeCredit.create happen inside tx

    const { redeemReferral } = await import("@/lib/actions/referrals");
    const result = await redeemReferral("ref-1", "cust-2", "order-1");
    expect(result).toEqual({ success: true });
    expect(prisma.referral.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "QUALIFIED", rewardAmount: 25 }),
      })
    );
    expect(prisma.storeCredit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: "cust-1", amount: 25, type: "REFERRAL" }),
      })
    );
  });
});
