import { describe, it, expect } from "vitest";
import {
  computeLTV,
  computeOutstandingBalance,
  computeCustomerType,
  computeInsuranceEligibility,
  isUnder21,
  hasExamOnlyHistory,
} from "@/lib/utils/customer";

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function makeOrder(overrides: {
  status?: string;
  type?: string;
  totalReal?: number;
  balanceReal?: number;
  createdAt?: Date;
  pickedUpAt?: Date | null;
}) {
  return {
    status: overrides.status ?? "PICKED_UP",
    type: overrides.type ?? "GLASSES",
    totalReal: overrides.totalReal ?? 0,
    balanceReal: overrides.balanceReal ?? 0,
    createdAt: overrides.createdAt ?? new Date(),
    pickedUpAt: overrides.pickedUpAt ?? null,
  } as Parameters<typeof computeLTV>[0][number];
}

// ── computeLTV ─────────────────────────────────────────────────────────────────

describe("computeLTV", () => {
  it("returns 0 for empty orders", () => {
    expect(computeLTV([])).toBe(0);
  });

  it("sums totalReal for PICKED_UP orders only", () => {
    const orders = [
      makeOrder({ status: "PICKED_UP", totalReal: 300 }),
      makeOrder({ status: "PICKED_UP", totalReal: 200 }),
      makeOrder({ status: "READY", totalReal: 500 }),
    ];
    expect(computeLTV(orders)).toBe(500);
  });

  it("ignores cancelled, draft, and other non-picked-up orders", () => {
    const orders = [
      makeOrder({ status: "CANCELLED", totalReal: 1000 }),
      makeOrder({ status: "DRAFT", totalReal: 500 }),
      makeOrder({ status: "LAB_ORDERED", totalReal: 400 }),
    ];
    expect(computeLTV(orders)).toBe(0);
  });
});

// ── computeOutstandingBalance ──────────────────────────────────────────────────

describe("computeOutstandingBalance", () => {
  it("returns 0 when all orders are CANCELLED or PICKED_UP", () => {
    const orders = [
      makeOrder({ status: "CANCELLED", balanceReal: 500 }),
      makeOrder({ status: "PICKED_UP", balanceReal: 200 }),
    ];
    expect(computeOutstandingBalance(orders)).toBe(0);
  });

  it("sums balanceReal for active (non-terminal) orders", () => {
    const orders = [
      makeOrder({ status: "CONFIRMED", balanceReal: 300 }),
      makeOrder({ status: "READY", balanceReal: 150 }),
      makeOrder({ status: "CANCELLED", balanceReal: 999 }),
    ];
    expect(computeOutstandingBalance(orders)).toBe(450);
  });

  it("returns 0 for empty orders", () => {
    expect(computeOutstandingBalance([])).toBe(0);
  });
});

// ── computeCustomerType ────────────────────────────────────────────────────────

describe("computeCustomerType", () => {
  it("returns LEAD when no picked-up orders", () => {
    const orders = [makeOrder({ status: "DRAFT" })];
    expect(computeCustomerType(orders, new Date())).toBe("LEAD");
  });

  it("returns LEAD for empty orders", () => {
    expect(computeCustomerType([], new Date())).toBe("LEAD");
  });

  it("returns VIP when LTV >= 1500", () => {
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 1500, pickedUpAt: daysAgo(50) })];
    expect(computeCustomerType(orders, daysAgo(200))).toBe("VIP");
  });

  it("returns VIP when 3+ picked-up orders regardless of LTV", () => {
    const orders = [
      makeOrder({ status: "PICKED_UP", totalReal: 100, pickedUpAt: daysAgo(20) }),
      makeOrder({ status: "PICKED_UP", totalReal: 100, pickedUpAt: daysAgo(40) }),
      makeOrder({ status: "PICKED_UP", totalReal: 100, pickedUpAt: daysAgo(60) }),
    ];
    expect(computeCustomerType(orders, daysAgo(400))).toBe("VIP");
  });

  it("returns NEW when first and last pickup are within 90 days", () => {
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 200, pickedUpAt: daysAgo(30) })];
    expect(computeCustomerType(orders, daysAgo(100))).toBe("NEW");
  });

  it("returns ACTIVE when last pickup within 24 months", () => {
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 400, pickedUpAt: daysAgo(300) })];
    expect(computeCustomerType(orders, daysAgo(400))).toBe("ACTIVE");
  });

  it("returns LAPSED when last pickup between 24 and 36 months ago", () => {
    // 25 months ≈ 750 days
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 400, pickedUpAt: daysAgo(750) })];
    expect(computeCustomerType(orders, daysAgo(800))).toBe("LAPSED");
  });

  it("returns DORMANT when last pickup > 36 months ago", () => {
    // 37 months ≈ 1110 days
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 400, pickedUpAt: daysAgo(1110) })];
    expect(computeCustomerType(orders, daysAgo(1200))).toBe("DORMANT");
  });

  it("falls back to createdAt when pickedUpAt is null", () => {
    // Order picked up 30 days ago (by createdAt), no explicit pickedUpAt
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 200, createdAt: daysAgo(30), pickedUpAt: null })];
    // 30 days ago is within 90 days → NEW
    expect(computeCustomerType(orders, daysAgo(100))).toBe("NEW");
  });

  it("falls back to createdAt for DORMANT classification when pickedUpAt is null", () => {
    // Order with createdAt > 36 months ago, no pickedUpAt
    const orders = [makeOrder({ status: "PICKED_UP", totalReal: 200, createdAt: daysAgo(1110), pickedUpAt: null })];
    expect(computeCustomerType(orders, daysAgo(1200))).toBe("DORMANT");
  });
});

// ── computeInsuranceEligibility ────────────────────────────────────────────────

describe("computeInsuranceEligibility", () => {
  it("returns nulls when no lastClaimDate", () => {
    const result = computeInsuranceEligibility({
      lastClaimDate: null,
      eligibilityIntervalMonths: 12,
    });
    expect(result.nextDate).toBeNull();
    expect(result.daysUntil).toBeNull();
    expect(result.isEligibleSoon).toBe(false);
  });

  it("calculates next date by adding interval months", () => {
    // Use a mid-year noon-UTC date to avoid timezone rollback edge cases
    const lastClaim = new Date("2025-06-15T12:00:00Z");
    const result = computeInsuranceEligibility({
      lastClaimDate: lastClaim,
      eligibilityIntervalMonths: 12,
    });
    // Next date should be ~12 months later (June 2026)
    const expectedNextYear = 2026;
    expect(result.nextDate!.getUTCFullYear()).toBe(expectedNextYear);
    expect(result.nextDate!.getUTCMonth()).toBe(5); // June = month 5
  });

  it("isEligibleSoon is true when next date within 90 days", () => {
    const lastClaim = daysAgo(340); // next date ~25 days away for 12-month interval
    const result = computeInsuranceEligibility({
      lastClaimDate: lastClaim,
      eligibilityIntervalMonths: 12,
    });
    expect(result.isEligibleSoon).toBe(true);
  });

  it("isEligibleSoon is false when next date > 90 days away", () => {
    const lastClaim = new Date("2025-01-01"); // next date in 2026
    const result = computeInsuranceEligibility({
      lastClaimDate: lastClaim,
      eligibilityIntervalMonths: 24,
    });
    expect(result.isEligibleSoon).toBe(false);
  });

  it("daysUntil is negative when already past eligibility date", () => {
    const lastClaim = daysAgo(400); // past 12-month interval
    const result = computeInsuranceEligibility({
      lastClaimDate: lastClaim,
      eligibilityIntervalMonths: 12,
    });
    expect(result.daysUntil).toBeLessThan(0);
    expect(result.isEligibleSoon).toBe(true); // <= 90 still counts
  });
});

// ── isUnder21 ──────────────────────────────────────────────────────────────────

describe("isUnder21", () => {
  it("returns false for null dob", () => {
    expect(isUnder21(null)).toBe(false);
  });

  it("returns false for undefined dob", () => {
    expect(isUnder21(undefined)).toBe(false);
  });

  it("returns true for a 20-year-old", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 20);
    expect(isUnder21(dob)).toBe(true);
  });

  it("returns false for a 22-year-old", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 22);
    expect(isUnder21(dob)).toBe(false);
  });

  it("returns false for someone who turned 21 a month ago", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 21);
    dob.setMonth(dob.getMonth() - 1);
    expect(isUnder21(dob)).toBe(false);
  });
});

// ── hasExamOnlyHistory ─────────────────────────────────────────────────────────

describe("hasExamOnlyHistory", () => {
  it("returns false when all orders are cancelled or draft (no paid orders)", () => {
    const orders = [
      makeOrder({ status: "CANCELLED", type: "EXAM_ONLY" }),
      makeOrder({ status: "DRAFT", type: "EXAM_ONLY" }),
    ];
    expect(hasExamOnlyHistory(orders)).toBe(false);
  });

  it("returns true when all paid orders are EXAM_ONLY", () => {
    const orders = [
      makeOrder({ status: "PICKED_UP", type: "EXAM_ONLY" }),
      makeOrder({ status: "READY", type: "EXAM_ONLY" }),
    ];
    expect(hasExamOnlyHistory(orders)).toBe(true);
  });

  it("returns false when paid orders include non-exam types", () => {
    const orders = [
      makeOrder({ status: "PICKED_UP", type: "EXAM_ONLY" }),
      makeOrder({ status: "PICKED_UP", type: "GLASSES" }),
    ];
    expect(hasExamOnlyHistory(orders)).toBe(false);
  });

  it("returns false for empty orders", () => {
    expect(hasExamOnlyHistory([])).toBe(false);
  });
});
