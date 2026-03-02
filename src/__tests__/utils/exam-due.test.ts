import { describe, it, expect } from "vitest";
import { computeExamDueDate, type ExamDueInput } from "@/lib/utils/exam-due";

const NOW = new Date("2026-03-02T00:00:00Z");

function makeInput(overrides: Partial<ExamDueInput> = {}): ExamDueInput {
  return {
    customerId: "cust-1",
    firstName: "Alice",
    lastExamDate: null,
    rxExpiryDate: null,
    insuranceIntervalMonths: null,
    lastClaimDate: null,
    ...overrides,
  };
}

describe("computeExamDueDate", () => {
  it("returns NO_DATA when no history", () => {
    const result = computeExamDueDate(makeInput(), NOW);
    expect(result.status).toBe("NO_DATA");
    expect(result.dueDate).toBeNull();
    expect(result.reason).toBe("No exam or prescription history");
  });

  it("returns OVERDUE when last exam was over 12 months ago", () => {
    const result = computeExamDueDate(
      makeInput({ lastExamDate: new Date("2025-01-01") }),
      NOW
    );
    expect(result.status).toBe("OVERDUE");
    expect(result.reason).toBe("Annual exam due");
  });

  it("returns DUE_SOON when annual exam is within 90 days", () => {
    // Exam 10 months ago → due in ~2 months
    const result = computeExamDueDate(
      makeInput({ lastExamDate: new Date("2025-05-10") }),
      NOW
    );
    expect(result.status).toBe("DUE_SOON");
    expect(result.reason).toBe("Annual exam due");
  });

  it("returns OK when annual exam is more than 90 days out", () => {
    // Exam 3 months ago → due in 9 months
    const result = computeExamDueDate(
      makeInput({ lastExamDate: new Date("2025-12-01") }),
      NOW
    );
    expect(result.status).toBe("OK");
    expect(result.reason).toBe("Annual exam due");
  });

  it("returns OVERDUE when Rx expired", () => {
    const result = computeExamDueDate(
      makeInput({ rxExpiryDate: new Date("2026-01-01") }),
      NOW
    );
    expect(result.status).toBe("OVERDUE");
    expect(result.reason).toBe("Prescription expires");
  });

  it("returns DUE_SOON when Rx expiring within 90 days", () => {
    const result = computeExamDueDate(
      makeInput({ rxExpiryDate: new Date("2026-05-01") }),
      NOW
    );
    expect(result.status).toBe("DUE_SOON");
    expect(result.reason).toBe("Prescription expires");
  });

  it("returns OK when Rx expiry is far out", () => {
    const result = computeExamDueDate(
      makeInput({ rxExpiryDate: new Date("2027-03-01") }),
      NOW
    );
    expect(result.status).toBe("OK");
  });

  it("uses insurance eligibility interval", () => {
    const result = computeExamDueDate(
      makeInput({
        insuranceIntervalMonths: 12,
        lastClaimDate: new Date("2025-01-15"),
      }),
      NOW
    );
    expect(result.status).toBe("OVERDUE");
    expect(result.reason).toBe("Insurance benefit eligible");
  });

  it("returns DUE_SOON for insurance approaching eligibility", () => {
    const result = computeExamDueDate(
      makeInput({
        insuranceIntervalMonths: 12,
        lastClaimDate: new Date("2025-04-15"),
      }),
      NOW
    );
    expect(result.status).toBe("DUE_SOON");
    expect(result.reason).toBe("Insurance benefit eligible");
  });

  it("picks the earliest due date from multiple sources", () => {
    // Rx expires next month, but annual exam is 5 months away
    const result = computeExamDueDate(
      makeInput({
        lastExamDate: new Date("2025-10-01"),
        rxExpiryDate: new Date("2026-04-01"),
      }),
      NOW
    );
    expect(result.reason).toBe("Prescription expires");
    expect(result.status).toBe("DUE_SOON");
  });

  it("picks annual over insurance when annual is earlier", () => {
    const result = computeExamDueDate(
      makeInput({
        lastExamDate: new Date("2025-02-01"),
        insuranceIntervalMonths: 24,
        lastClaimDate: new Date("2025-06-01"),
      }),
      NOW
    );
    expect(result.reason).toBe("Annual exam due");
    expect(result.status).toBe("OVERDUE");
  });

  it("ignores insurance when only interval or claim missing", () => {
    const onlyInterval = computeExamDueDate(
      makeInput({ insuranceIntervalMonths: 12 }),
      NOW
    );
    expect(onlyInterval.status).toBe("NO_DATA");

    const onlyClaim = computeExamDueDate(
      makeInput({ lastClaimDate: new Date("2025-06-01") }),
      NOW
    );
    expect(onlyClaim.status).toBe("NO_DATA");
  });

  it("preserves customerId and firstName in result", () => {
    const result = computeExamDueDate(
      makeInput({
        customerId: "cust-42",
        firstName: "Bob",
        lastExamDate: new Date("2025-01-01"),
      }),
      NOW
    );
    expect(result.customerId).toBe("cust-42");
    expect(result.firstName).toBe("Bob");
  });

  it("handles all three sources with same date", () => {
    // All point to same future date (~60 days out) — should still work
    const lastDate = new Date("2025-05-01");
    const result = computeExamDueDate(
      makeInput({
        lastExamDate: lastDate,
        rxExpiryDate: new Date("2026-05-01"),
        insuranceIntervalMonths: 12,
        lastClaimDate: lastDate,
      }),
      NOW
    );
    expect(result.status).toBe("DUE_SOON");
    expect(result.dueDate).toBeTruthy();
  });

  it("returns exact boundary: 90 days out is DUE_SOON", () => {
    // Last exam exactly 9 months ago → due in exactly 3 months (June 2)
    // But months vary in length so let's use Rx expiry
    const ninetyFromNow = new Date(NOW);
    ninetyFromNow.setDate(ninetyFromNow.getDate() + 90);
    const result = computeExamDueDate(
      makeInput({ rxExpiryDate: ninetyFromNow }),
      NOW
    );
    expect(result.status).toBe("DUE_SOON");
  });

  it("returns OK when due date is more than 90 days out", () => {
    // July 2026 is well over 90 days from March 2
    const result = computeExamDueDate(
      makeInput({ rxExpiryDate: new Date("2026-07-01T00:00:00Z") }),
      NOW
    );
    expect(result.status).toBe("OK");
  });
});
