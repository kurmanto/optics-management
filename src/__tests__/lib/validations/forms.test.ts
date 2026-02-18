import { describe, it, expect } from "vitest";
import { CreateFormSubmissionSchema } from "@/lib/validations/forms";

describe("CreateFormSubmissionSchema", () => {
  it("passes with only templateId", () => {
    const result = CreateFormSubmissionSchema.safeParse({
      templateId: "tmpl-123",
    });
    expect(result.success).toBe(true);
  });

  it("fails when templateId is empty", () => {
    const result = CreateFormSubmissionSchema.safeParse({
      templateId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/required/i);
    }
  });

  it("fails when templateId is missing", () => {
    const result = CreateFormSubmissionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passes with all optional fields", () => {
    const result = CreateFormSubmissionSchema.safeParse({
      templateId: "tmpl-abc",
      customerId: "cust-1",
      customerName: "John Doe",
      expiresAt: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("passes without customerId (it is optional)", () => {
    const result = CreateFormSubmissionSchema.safeParse({
      templateId: "tmpl-xyz",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerId).toBeUndefined();
    }
  });
});
