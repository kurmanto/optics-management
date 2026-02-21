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

const validPolicyData = {
  providerName: "Sun Life",
  coverageType: "VISION",
  eligibilityIntervalMonths: 12,
};

describe("addInsurancePolicy", () => {
  it("returns error when providerName is missing", async () => {
    const { addInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await addInsurancePolicy("cust-1", { ...validPolicyData, providerName: "" });
    expect(result).toHaveProperty("error");
  });

  it("creates policy on valid data", async () => {
    const prisma = await getPrisma();
    prisma.insurancePolicy.create.mockResolvedValue({ id: "policy-1" });

    const { addInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await addInsurancePolicy("cust-1", validPolicyData);
    expect(result).toEqual({ id: "policy-1" });
    expect(prisma.insurancePolicy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: "cust-1", providerName: "Sun Life" }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.insurancePolicy.create.mockRejectedValue(new Error("DB error"));

    const { addInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await addInsurancePolicy("cust-1", validPolicyData);
    expect(result).toHaveProperty("error");
  });
});

describe("updateInsurancePolicy", () => {
  it("returns error when policy not found", async () => {
    const prisma = await getPrisma();
    prisma.insurancePolicy.findUnique.mockResolvedValue(null);

    const { updateInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await updateInsurancePolicy("policy-1", validPolicyData);
    expect((result as any).error).toBe("Policy not found");
  });

  it("updates policy successfully", async () => {
    const prisma = await getPrisma();
    prisma.insurancePolicy.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.insurancePolicy.update.mockResolvedValue({});

    const { updateInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await updateInsurancePolicy("policy-1", { ...validPolicyData, providerName: "Manulife" });
    expect(result).toEqual({ success: true });
  });
});

describe("deactivateInsurancePolicy", () => {
  it("returns error when policy not found", async () => {
    const prisma = await getPrisma();
    prisma.insurancePolicy.findUnique.mockResolvedValue(null);

    const { deactivateInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await deactivateInsurancePolicy("policy-1");
    expect((result as any).error).toBe("Policy not found");
  });

  it("sets isActive to false", async () => {
    const prisma = await getPrisma();
    prisma.insurancePolicy.findUnique.mockResolvedValue({ customerId: "cust-1" });
    prisma.insurancePolicy.update.mockResolvedValue({});

    const { deactivateInsurancePolicy } = await import("@/lib/actions/insurance");
    const result = await deactivateInsurancePolicy("policy-1");
    expect(result).toEqual({ success: true });
    expect(prisma.insurancePolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
  });
});
