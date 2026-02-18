import { describe, it, expect } from "vitest";
import { OrderSchema, LineItemSchema, PickupOptionsSchema } from "@/lib/validations/order";

// ── LineItemSchema ─────────────────────────────────────────────────────────────

describe("LineItemSchema", () => {
  const validItem = {
    type: "FRAME",
    description: "Ray-Ban RB5154",
    quantity: 1,
    unitPriceCustomer: 250,
    unitPriceReal: 80,
  };

  it("passes with valid line item", () => {
    expect(LineItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("fails when description is empty", () => {
    expect(LineItemSchema.safeParse({ ...validItem, description: "" }).success).toBe(false);
  });

  it("fails with negative price", () => {
    expect(LineItemSchema.safeParse({ ...validItem, unitPriceCustomer: -1 }).success).toBe(false);
  });

  it("fails with quantity < 1", () => {
    expect(LineItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false);
  });

  it("passes with all valid types", () => {
    const types = ["FRAME", "LENS", "COATING", "CONTACT_LENS", "EXAM", "ACCESSORY", "OTHER"];
    for (const type of types) {
      expect(LineItemSchema.safeParse({ ...validItem, type }).success).toBe(true);
    }
  });
});

// ── OrderSchema ────────────────────────────────────────────────────────────────

describe("OrderSchema", () => {
  const validLineItem = {
    type: "FRAME",
    description: "Test Frame",
    quantity: 1,
    unitPriceCustomer: 300,
    unitPriceReal: 100,
  };

  const validOrder = {
    customerId: "cust-1",
    type: "GLASSES",
    status: "DRAFT",
    isDualInvoice: false,
    depositCustomer: 0,
    depositReal: 0,
    lineItems: [validLineItem],
  };

  it("passes with a valid order", () => {
    const result = OrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it("fails when customerId is missing", () => {
    const result = OrderSchema.safeParse({ ...validOrder, customerId: "" });
    expect(result.success).toBe(false);
  });

  it("fails when lineItems is empty", () => {
    const result = OrderSchema.safeParse({ ...validOrder, lineItems: [] });
    expect(result.success).toBe(false);
  });

  it("defaults status to DRAFT if not provided", () => {
    const { status: _, ...withoutStatus } = validOrder;
    const result = OrderSchema.safeParse(withoutStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("DRAFT");
    }
  });

  it("passes with all valid order types", () => {
    const types = ["GLASSES", "CONTACTS", "SUNGLASSES", "ACCESSORIES", "EXAM_ONLY"];
    for (const type of types) {
      expect(OrderSchema.safeParse({ ...validOrder, type }).success).toBe(true);
    }
  });

  it("fails with an invalid order type", () => {
    const result = OrderSchema.safeParse({ ...validOrder, type: "UNICORN" });
    expect(result.success).toBe(false);
  });
});

// ── PickupOptionsSchema ────────────────────────────────────────────────────────

describe("PickupOptionsSchema", () => {
  it("passes with all defaults", () => {
    const result = PickupOptionsSchema.safeParse({ orderId: "ord-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sendReviewRequest).toBe(true);
      expect(result.data.enrollInReferralCampaign).toBe(true);
      expect(result.data.markAsLowValue).toBe(false);
    }
  });

  it("fails when orderId is empty", () => {
    const result = PickupOptionsSchema.safeParse({ orderId: "" });
    expect(result.success).toBe(false);
  });
});
