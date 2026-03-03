import { describe, it, expect } from "vitest";
import {
  QuizAnswersSchema,
  LensQuizSubmissionSchema,
  LensMatchBookingSchema,
  LensMatchCallbackSchema,
} from "@/lib/validations/lens-match";

// ── QuizAnswersSchema ─────────────────────────────────────────────────────────

describe("QuizAnswersSchema", () => {
  const validAnswers = {
    primaryUse: "ALL_DAY",
    wearTime: "HEAVY",
    frustration: "HEADACHES",
    currentGlasses: "YES_PROGRESSIVE",
    sunglasses: "NOT_NOW",
    hasBenefits: "YES",
  };

  it("passes with valid answers", () => {
    const result = QuizAnswersSchema.safeParse(validAnswers);
    expect(result.success).toBe(true);
  });

  it("fails when a required key is missing", () => {
    const { primaryUse: _, ...missing } = validAnswers;
    const result = QuizAnswersSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it("fails with an invalid enum value", () => {
    const result = QuizAnswersSchema.safeParse({ ...validAnswers, primaryUse: "INVALID" });
    expect(result.success).toBe(false);
  });
});

// ── LensQuizSubmissionSchema ──────────────────────────────────────────────────

describe("LensQuizSubmissionSchema", () => {
  const validAnswers = {
    primaryUse: "WORK_SCREENS",
    wearTime: "MODERATE",
    frustration: "NO_ISSUES",
    currentGlasses: "YES_SINGLE",
    sunglasses: "YES_PRESCRIPTION",
    hasBenefits: "NO",
  };

  it("passes with email only (no phone)", () => {
    const result = LensQuizSubmissionSchema.safeParse({
      answers: validAnswers,
      firstName: "Jane",
      email: "jane@test.com",
    });
    expect(result.success).toBe(true);
  });

  it("passes with phone only (no email)", () => {
    const result = LensQuizSubmissionSchema.safeParse({
      answers: validAnswers,
      firstName: "Jane",
      phone: "6475551234",
    });
    expect(result.success).toBe(true);
  });

  it("fails when neither phone nor email provided", () => {
    const result = LensQuizSubmissionSchema.safeParse({
      answers: validAnswers,
      firstName: "Jane",
    });
    expect(result.success).toBe(false);
  });

  it("fails when firstName is empty", () => {
    const result = LensQuizSubmissionSchema.safeParse({
      answers: validAnswers,
      firstName: "",
      email: "jane@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("fails with invalid email format", () => {
    const result = LensQuizSubmissionSchema.safeParse({
      answers: validAnswers,
      firstName: "Jane",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

// ── LensMatchBookingSchema ────────────────────────────────────────────────────

describe("LensMatchBookingSchema", () => {
  const validBooking = {
    quoteId: "quote-123",
    customerId: "cust-456",
    type: "CONSULTATION" as const,
    scheduledAt: "2026-03-10T10:00:00.000Z",
  };

  it("passes with valid CONSULTATION booking", () => {
    const result = LensMatchBookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it("passes with valid EYE_EXAM booking", () => {
    const result = LensMatchBookingSchema.safeParse({ ...validBooking, type: "EYE_EXAM" });
    expect(result.success).toBe(true);
  });

  it("fails with invalid appointment type", () => {
    const result = LensMatchBookingSchema.safeParse({ ...validBooking, type: "FOLLOW_UP" });
    expect(result.success).toBe(false);
  });

  it("fails when quoteId is empty", () => {
    const result = LensMatchBookingSchema.safeParse({ ...validBooking, quoteId: "" });
    expect(result.success).toBe(false);
  });

  it("fails when customerId is empty", () => {
    const result = LensMatchBookingSchema.safeParse({ ...validBooking, customerId: "" });
    expect(result.success).toBe(false);
  });

  it("fails when scheduledAt is empty", () => {
    const result = LensMatchBookingSchema.safeParse({ ...validBooking, scheduledAt: "" });
    expect(result.success).toBe(false);
  });
});

// ── LensMatchCallbackSchema ───────────────────────────────────────────────────

describe("LensMatchCallbackSchema", () => {
  it("passes with valid callback request", () => {
    const result = LensMatchCallbackSchema.safeParse({
      quoteId: "quote-123",
      requestedType: "EYE_EXAM",
    });
    expect(result.success).toBe(true);
  });

  it("passes with CONSULTATION type", () => {
    const result = LensMatchCallbackSchema.safeParse({
      quoteId: "quote-456",
      requestedType: "CONSULTATION",
    });
    expect(result.success).toBe(true);
  });

  it("fails with invalid type", () => {
    const result = LensMatchCallbackSchema.safeParse({
      quoteId: "quote-123",
      requestedType: "FOLLOW_UP",
    });
    expect(result.success).toBe(false);
  });

  it("fails when quoteId is empty", () => {
    const result = LensMatchCallbackSchema.safeParse({
      quoteId: "",
      requestedType: "EYE_EXAM",
    });
    expect(result.success).toBe(false);
  });
});
