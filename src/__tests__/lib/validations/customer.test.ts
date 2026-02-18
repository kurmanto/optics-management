import { describe, it, expect } from "vitest";
import {
  CustomerSchema,
  MedicalHistorySchema,
  StoreCreditSchema,
} from "@/lib/validations/customer";

// ── CustomerSchema ─────────────────────────────────────────────────────────────

describe("CustomerSchema", () => {
  const validCustomer = {
    firstName: "Jane",
    lastName: "Smith",
    smsOptIn: true,
    emailOptIn: true,
  };

  it("passes with minimal valid data", () => {
    const result = CustomerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("fails when firstName is empty", () => {
    const result = CustomerSchema.safeParse({ ...validCustomer, firstName: "" });
    expect(result.success).toBe(false);
  });

  it("fails when lastName is empty", () => {
    const result = CustomerSchema.safeParse({ ...validCustomer, lastName: "" });
    expect(result.success).toBe(false);
  });

  it("fails for invalid email format", () => {
    const result = CustomerSchema.safeParse({
      ...validCustomer,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("passes with empty email (optional)", () => {
    const result = CustomerSchema.safeParse({ ...validCustomer, email: "" });
    expect(result.success).toBe(true);
  });

  it("passes with a valid email", () => {
    const result = CustomerSchema.safeParse({
      ...validCustomer,
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("passes with optional fields omitted", () => {
    const result = CustomerSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("passes with a valid gender enum", () => {
    const result = CustomerSchema.safeParse({
      ...validCustomer,
      gender: "FEMALE",
    });
    expect(result.success).toBe(true);
  });

  it("fails with an invalid gender value", () => {
    const result = CustomerSchema.safeParse({
      ...validCustomer,
      gender: "UNKNOWN_GENDER",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty string for gender (treated as optional)", () => {
    const result = CustomerSchema.safeParse({
      ...validCustomer,
      gender: "",
    });
    expect(result.success).toBe(true);
  });
});

// ── MedicalHistorySchema ───────────────────────────────────────────────────────

describe("MedicalHistorySchema", () => {
  it("passes with all defaults", () => {
    const result = MedicalHistorySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eyeConditions).toEqual([]);
      expect(result.data.systemicConditions).toEqual([]);
      expect(result.data.familyGlaucoma).toBe(false);
    }
  });

  it("passes with valid arrays", () => {
    const result = MedicalHistorySchema.safeParse({
      eyeConditions: ["Glaucoma", "Dry eye"],
      systemicConditions: ["Diabetes"],
    });
    expect(result.success).toBe(true);
  });

  it("passes with optional string fields absent", () => {
    const result = MedicalHistorySchema.safeParse({
      medications: "",
      allergies: "",
    });
    expect(result.success).toBe(true);
  });
});

// ── StoreCreditSchema ──────────────────────────────────────────────────────────

describe("StoreCreditSchema", () => {
  const validCredit = {
    type: "REFERRAL",
    amount: 25,
  };

  it("passes with valid type and positive amount", () => {
    const result = StoreCreditSchema.safeParse(validCredit);
    expect(result.success).toBe(true);
  });

  it("fails with negative amount", () => {
    const result = StoreCreditSchema.safeParse({ ...validCredit, amount: -10 });
    expect(result.success).toBe(false);
  });

  it("fails with zero amount", () => {
    const result = StoreCreditSchema.safeParse({ ...validCredit, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("passes with all valid credit types", () => {
    for (const type of ["REFERRAL", "INSURANCE", "PROMOTION", "REFUND"]) {
      const result = StoreCreditSchema.safeParse({ type, amount: 50 });
      expect(result.success).toBe(true);
    }
  });

  it("fails with invalid type", () => {
    const result = StoreCreditSchema.safeParse({ ...validCredit, type: "GIFT" });
    expect(result.success).toBe(false);
  });

  it("passes with optional description", () => {
    const result = StoreCreditSchema.safeParse({
      ...validCredit,
      description: "Referred a friend",
    });
    expect(result.success).toBe(true);
  });
});
