import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue({ id: "email-auto" }),
}));

vi.mock("@/lib/actions/referrals", () => ({
  redeemReferral: vi.fn().mockResolvedValue({ success: true }),
  validateReferralCode: vi.fn(),
  generateReferralCode: vi.fn(),
  getCustomerReferrals: vi.fn(),
}));

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

const validOrderInput = {
  customerId: "cust-1",
  type: "GLASSES" as const,
  orderTypes: ["GLASSES"],
  isDualInvoice: false,
  depositCustomer: 50,
  depositReal: 50,
  lineItems: [
    {
      type: "FRAME" as const,
      description: "Test Frame",
      quantity: 1,
      unitPriceCustomer: 300,
      unitPriceReal: 100,
    },
  ],
};

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

describe("createOrder", () => {
  it("creates order and returns id on success", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-1", orderNumber: "ORD-2026-1234" });

    const { createOrder } = await import("@/lib/actions/orders");
    const result = await createOrder(validOrderInput);
    expect("id" in result).toBe(true);
    if ("id" in result) expect(result.id).toBe("order-1");
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "cust-1",
          status: "DRAFT",
        }),
      })
    );
  });

  it("calculates totalCustomer from lineItems", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-2" });

    const { createOrder } = await import("@/lib/actions/orders");
    await createOrder({
      ...validOrderInput,
      lineItems: [
        { type: "FRAME" as const, description: "A", quantity: 2, unitPriceCustomer: 100, unitPriceReal: 50 },
      ],
      depositCustomer: 0,
      depositReal: 0,
    });

    const callArgs = prisma.order.create.mock.calls[0][0];
    expect(callArgs.data.totalCustomer).toBe(200);
    expect(callArgs.data.totalReal).toBe(100);
  });

  it("deducts insurance coverage from total", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-3" });

    const { createOrder } = await import("@/lib/actions/orders");
    await createOrder({
      ...validOrderInput,
      insuranceCoverage: 100,
      depositCustomer: 0,
      depositReal: 0,
    });

    const callArgs = prisma.order.create.mock.calls[0][0];
    expect(callArgs.data.totalCustomer).toBe(200); // 300 - 100
    expect(callArgs.data.totalReal).toBe(0); // 100 - 100
  });

  it("calls redeemReferral when referralId is provided", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-ref-1", orderNumber: "ORD-2026-9999" });
    const { redeemReferral } = await import("@/lib/actions/referrals");
    const { createOrder } = await import("@/lib/actions/orders");

    await createOrder({ ...validOrderInput, referralId: "ref-abc", referralCredit: 25 });

    expect(vi.mocked(redeemReferral)).toHaveBeenCalledWith("ref-abc", "cust-1", "order-ref-1");
  });

  it("returns success even when redeemReferral rejects", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-ref-2", orderNumber: "ORD-2026-9998" });
    const { redeemReferral } = await import("@/lib/actions/referrals");
    vi.mocked(redeemReferral).mockRejectedValueOnce(new Error("DB error"));
    const { createOrder } = await import("@/lib/actions/orders");

    const result = await createOrder({ ...validOrderInput, referralId: "ref-fail" });

    expect("id" in result).toBe(true);
    if ("id" in result) expect(result.id).toBe("order-ref-2");
  });

  it("does not call redeemReferral when no referralId", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-no-ref", orderNumber: "ORD-2026-9997" });
    const { redeemReferral } = await import("@/lib/actions/referrals");
    const { createOrder } = await import("@/lib/actions/orders");

    await createOrder(validOrderInput);

    expect(vi.mocked(redeemReferral)).not.toHaveBeenCalled();
  });
});

describe("advanceOrderStatus", () => {
  beforeEach(async () => {
    const prisma = await getPrisma();
    prisma.order.update.mockResolvedValue({
      orderNumber: "ORD-2026-0001",
      customer: { firstName: "Jane", lastName: "Doe" },
    });
  });

  it("updates order status to READY", async () => {
    const prisma = await getPrisma();
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "READY" as any);

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1" },
        data: expect.objectContaining({ status: "READY" }),
      })
    );
  });

  it("creates ORDER_READY notification when status is READY", async () => {
    const { createNotification } = await import("@/lib/notifications");
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "READY" as any);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORDER_READY" })
    );
  });

  it("creates ORDER_CANCELLED notification when status is CANCELLED", async () => {
    const { createNotification } = await import("@/lib/notifications");
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "CANCELLED" as any);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORDER_CANCELLED" })
    );
  });

  it("creates ORDER_LAB_RECEIVED notification when status is LAB_RECEIVED", async () => {
    const { createNotification } = await import("@/lib/notifications");
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "LAB_RECEIVED" as any);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORDER_LAB_RECEIVED" })
    );
  });

  it("does NOT create notification for intermediate statuses", async () => {
    const { createNotification } = await import("@/lib/notifications");
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "CONFIRMED" as any);

    expect(createNotification).not.toHaveBeenCalled();
  });

  // ── LAB_ORDERED — triggers work order auto-print (client-side window.open).
  // These tests verify the server-action side: DB updated, labOrderedAt set,
  // and no spurious notification fires (the client handles window.open).
  it("sets labOrderedAt timestamp when advancing to LAB_ORDERED", async () => {
    const prisma = await getPrisma();
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "LAB_ORDERED" as any);

    const callArgs = prisma.order.update.mock.calls[0][0];
    expect(callArgs.data.status).toBe("LAB_ORDERED");
    expect(callArgs.data.labOrderedAt).toBeInstanceOf(Date);
  });

  it("does NOT create any notification when advancing to LAB_ORDERED", async () => {
    const { createNotification } = await import("@/lib/notifications");
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "LAB_ORDERED" as any);

    expect(createNotification).not.toHaveBeenCalled();
  });

  it("records LAB_ORDERED in status history with the actor name", async () => {
    const prisma = await getPrisma();
    const { advanceOrderStatus } = await import("@/lib/actions/orders");
    await advanceOrderStatus("order-1", "LAB_ORDERED" as any, "Sent to Optical Lab");

    const callArgs = prisma.order.update.mock.calls[0][0];
    expect(callArgs.data.statusHistory.create).toMatchObject({
      status: "LAB_ORDERED",
      note: "Sent to Optical Lab",
      createdBy: mockSession.name,
    });
  });
});

describe("handlePickupComplete", () => {
  it("returns success and updates order status to PICKED_UP", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      customerId: "cust-1",
      orderNumber: "MVO-001",
      totalCustomer: 300,
      depositCustomer: 0,
      balanceCustomer: 0,
      insuranceCoverage: null,
      referralCredit: null,
      customer: { firstName: "Alice", lastName: "Brown", email: "alice@example.com", familyId: null, family: null },
      lineItems: [],
    });
    // $transaction calls the callback with the tx (which is the mock itself)
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    const result = await handlePickupComplete("order-1", {
      sendReviewRequest: true,
      enrollInReferralCampaign: false,
      markAsLowValue: false,
    });

    expect("success" in result).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PICKED_UP",
          reviewRequestSent: true,
        }),
      })
    );
  });

  it("returns error when order not found", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(null);

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    const result = await handlePickupComplete("nonexistent", {
      sendReviewRequest: false,
      enrollInReferralCampaign: false,
      markAsLowValue: false,
    });

    expect("error" in result).toBe(true);
  });

  it("marks customer as low-value when markAsLowValue is true", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      customerId: "cust-1",
      orderNumber: "MVO-001",
      totalCustomer: 10,
      depositCustomer: 0,
      balanceCustomer: 0,
      insuranceCoverage: null,
      referralCredit: null,
      customer: { firstName: "Alice", lastName: "Brown", email: "alice@example.com", familyId: null, family: null },
      lineItems: [],
    });
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});
    prisma.customer.update.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", {
      sendReviewRequest: false,
      enrollInReferralCampaign: false,
      markAsLowValue: true,
    });

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cust-1" },
        data: expect.objectContaining({ marketingOptOut: true }),
      })
    );
  });

  it("auto-sends invoice email when customer has email", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      customerId: "cust-1",
      orderNumber: "MVO-001",
      totalCustomer: 300,
      depositCustomer: 100,
      balanceCustomer: 200,
      insuranceCoverage: null,
      referralCredit: null,
      customer: { firstName: "Alice", lastName: "Brown", email: "alice@example.com", familyId: null, family: null },
      lineItems: [{ description: "Frames", quantity: 1, unitPriceCustomer: 300, totalCustomer: 300 }],
    });
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});

    const { sendInvoiceEmail } = await import("@/lib/email");
    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", { sendReviewRequest: false, enrollInReferralCampaign: false, markAsLowValue: false });

    // Give the fire-and-forget promise a tick to resolve
    await new Promise((r) => setTimeout(r, 0));
    expect(sendInvoiceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        customerName: "Alice Brown",
        orderNumber: "MVO-001",
        totalAmount: 300,
        depositAmount: 100,
        balanceAmount: 200,
      })
    );
  });

  it("skips invoice email when customer has no email", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      customerId: "cust-1",
      orderNumber: "MVO-001",
      totalCustomer: 300,
      depositCustomer: 0,
      balanceCustomer: 0,
      insuranceCoverage: null,
      referralCredit: null,
      customer: { firstName: "Alice", lastName: "Brown", email: null, familyId: null, family: null },
      lineItems: [],
    });
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});

    const { sendInvoiceEmail } = await import("@/lib/email");
    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", { sendReviewRequest: false, enrollInReferralCampaign: false, markAsLowValue: false });

    await new Promise((r) => setTimeout(r, 0));
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
  });
});

describe("updateOrderNotes", () => {
  it("calls prisma.order.update with notes and labNotes", async () => {
    const prisma = await getPrisma();
    prisma.order.update.mockResolvedValue({});

    const { updateOrderNotes } = await import("@/lib/actions/orders");
    await updateOrderNotes("order-1", {
      notes: "Handle with care",
      labNotes: "Specific tint",
    });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1" },
        data: expect.objectContaining({
          notes: "Handle with care",
          labNotes: "Specific tint",
        }),
      })
    );
  });
});

describe("createOrder — error path", () => {
  it("returns { error } when prisma.order.create throws", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockRejectedValue(new Error("DB unavailable"));

    const { createOrder } = await import("@/lib/actions/orders");
    const result = await createOrder(validOrderInput);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Failed to create order");
    }
    expect("id" in result).toBe(false);
  });
});

describe("addExternalPrescription", () => {
  it("creates prescription and returns { id } on success", async () => {
    const prisma = await getPrisma();
    prisma.prescription.create.mockResolvedValue({ id: "rx-1" });

    const { addExternalPrescription } = await import("@/lib/actions/orders");
    const result = await addExternalPrescription({
      customerId: "cust-1",
      doctorName: "Dr. Singh",
      rxDate: "2026-01-15",
      odSphere: -2.5,
      osSphere: -2.0,
    });

    expect("id" in result).toBe(true);
    if ("id" in result) expect(result.id).toBe("rx-1");
    expect(prisma.prescription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "cust-1",
          source: "EXTERNAL",
          doctorName: "Dr. Singh",
          odSphere: -2.5,
          osSphere: -2.0,
        }),
      })
    );
  });

  it("maps rxDate to the date field when provided", async () => {
    const prisma = await getPrisma();
    prisma.prescription.create.mockResolvedValue({ id: "rx-2" });

    const { addExternalPrescription } = await import("@/lib/actions/orders");
    await addExternalPrescription({ customerId: "cust-1", rxDate: "2026-03-10" });

    const callData = prisma.prescription.create.mock.calls[0][0].data;
    expect(callData.date).toBeInstanceOf(Date);
    expect(callData.externalRxDate).toBeInstanceOf(Date);
  });

  it("falls back to today's date when rxDate is not provided", async () => {
    const prisma = await getPrisma();
    prisma.prescription.create.mockResolvedValue({ id: "rx-3" });

    const before = new Date();
    const { addExternalPrescription } = await import("@/lib/actions/orders");
    await addExternalPrescription({ customerId: "cust-1" });
    const after = new Date();

    const callData = prisma.prescription.create.mock.calls[0][0].data;
    expect(callData.date.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(callData.date.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(callData.externalRxDate).toBeNull();
  });

  it("returns { error } when prisma.prescription.create throws", async () => {
    const prisma = await getPrisma();
    prisma.prescription.create.mockRejectedValue(new Error("DB error"));

    const { addExternalPrescription } = await import("@/lib/actions/orders");
    const result = await addExternalPrescription({ customerId: "cust-1" });

    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toBe("Failed to save prescription");
  });
});

describe("uploadPrescriptionScanAction", () => {
  it("returns url when upload succeeds", async () => {
    const { uploadPrescriptionScan } = await import("@/lib/supabase");
    vi.mocked(uploadPrescriptionScan).mockResolvedValue("https://cdn.example.com/scan.jpg");

    const { uploadPrescriptionScanAction } = await import("@/lib/actions/orders");
    const result = await uploadPrescriptionScanAction("base64data==", "image/jpeg", "cust-1");

    expect("url" in result).toBe(true);
    if ("url" in result) expect(result.url).toBe("https://cdn.example.com/scan.jpg");
    expect(uploadPrescriptionScan).toHaveBeenCalledWith("base64data==", "image/jpeg", "cust-1");
  });

  it("returns error when upload returns null", async () => {
    const { uploadPrescriptionScan } = await import("@/lib/supabase");
    vi.mocked(uploadPrescriptionScan).mockResolvedValue(null);

    const { uploadPrescriptionScanAction } = await import("@/lib/actions/orders");
    const result = await uploadPrescriptionScanAction("base64data==", "image/jpeg", "cust-1");

    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toBe("Upload failed");
  });

  it("returns error when upload throws", async () => {
    const { uploadPrescriptionScan } = await import("@/lib/supabase");
    vi.mocked(uploadPrescriptionScan).mockRejectedValue(new Error("Network error"));

    const { uploadPrescriptionScanAction } = await import("@/lib/actions/orders");
    const result = await uploadPrescriptionScanAction("base64data==", "image/jpeg", "cust-1");

    expect("error" in result).toBe(true);
  });
});

describe("createOrder — exam fields", () => {
  it("passes examType, examPaymentMethod, insuranceCoveredAmount to prisma when provided", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-exam-1" });

    const { createOrder } = await import("@/lib/actions/orders");
    await createOrder({
      ...validOrderInput,
      examType: "COMPREHENSIVE",
      examPaymentMethod: "INSURANCE_PARTIAL",
      insuranceCoveredAmount: 75,
    });

    const callArgs = prisma.order.create.mock.calls[0][0];
    expect(callArgs.data.examType).toBe("COMPREHENSIVE");
    expect(callArgs.data.examPaymentMethod).toBe("INSURANCE_PARTIAL");
    expect(callArgs.data.insuranceCoveredAmount).toBe(75);
  });

  it("does not include exam fields when they are omitted (backward compat)", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-no-exam" });

    const { createOrder } = await import("@/lib/actions/orders");
    await createOrder(validOrderInput);

    const callArgs = prisma.order.create.mock.calls[0][0];
    expect(callArgs.data.examType).toBeNull();
    expect(callArgs.data.examPaymentMethod).toBeNull();
    expect(callArgs.data.insuranceCoveredAmount).toBeNull();
  });

  it("passes examBillingCode to prisma when provided", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-billing-1" });

    const { createOrder } = await import("@/lib/actions/orders");
    await createOrder({
      ...validOrderInput,
      examBillingCode: "404 (19 and under)",
    });

    const callArgs = prisma.order.create.mock.calls[0][0];
    expect(callArgs.data.examBillingCode).toBe("404 (19 and under)");
  });

  it("passes examBillingCode as null when omitted", async () => {
    const prisma = await getPrisma();
    prisma.order.create.mockResolvedValue({ id: "order-no-billing" });

    const { createOrder } = await import("@/lib/actions/orders");
    await createOrder(validOrderInput);

    const callArgs = prisma.order.create.mock.calls[0][0];
    expect(callArgs.data.examBillingCode).toBeNull();
  });
});

describe("handlePickupComplete — family promo", () => {
  it("includes familyPromoCampaignEnrolled: true when enrollInFamilyPromo is true", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      customerId: "cust-1",
      totalCustomer: 300,
      customer: { familyId: "fam-1", family: { customers: [{ id: "cust-2" }] } },
    });
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", {
      sendReviewRequest: false,
      enrollInReferralCampaign: false,
      enrollInFamilyPromo: true,
      markAsLowValue: false,
    });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ familyPromoCampaignEnrolled: true }),
      })
    );
  });
});

describe("addPayment", () => {
  it("creates payment record and updates order balance", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      depositCustomer: 50,
      balanceCustomer: 250,
    });
    (prisma as any).$transaction.mockImplementation(async (items: unknown[]) => Promise.all(items));
    prisma.payment.create.mockResolvedValue({ id: "pay-1" });
    prisma.order.update.mockResolvedValue({});

    const { addPayment } = await import("@/lib/actions/orders");
    await addPayment("order-1", 100, "CASH");

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: "order-1", amount: 100, method: "CASH" }),
      })
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ depositCustomer: 150, balanceCustomer: 150 }),
      })
    );
  });
});

describe("handlePickupComplete — campaign enrollment", () => {
  const baseOrder = {
    customerId: "cust-1",
    orderNumber: "MVO-001",
    totalCustomer: 300,
    depositCustomer: 0,
    balanceCustomer: 0,
    insuranceCoverage: null,
    referralCredit: null,
    customer: { firstName: "Alice", lastName: "Brown", email: null, familyId: null, family: null },
    lineItems: [],
  };

  it("enrolls customer in POST_PURCHASE_REFERRAL campaign when toggle is true", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});
    prisma.campaign.findFirst.mockResolvedValue({ id: "camp-referral" });
    prisma.campaignRecipient.upsert.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", {
      sendReviewRequest: false,
      enrollInReferralCampaign: true,
      markAsLowValue: false,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(prisma.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "POST_PURCHASE_REFERRAL", status: "ACTIVE" } })
    );
    expect(prisma.campaignRecipient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId_customerId: { campaignId: "camp-referral", customerId: "cust-1" } },
        create: expect.objectContaining({ campaignId: "camp-referral", customerId: "cust-1", status: "ACTIVE", currentStep: 0 }),
        update: { status: "ACTIVE" },
      })
    );
  });

  it("skips referral enrollment when no active POST_PURCHASE_REFERRAL campaign exists", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});
    prisma.campaign.findFirst.mockResolvedValue(null);
    prisma.campaignRecipient.upsert.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", {
      sendReviewRequest: false,
      enrollInReferralCampaign: true,
      markAsLowValue: false,
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(prisma.campaignRecipient.upsert).not.toHaveBeenCalled();
  });

  it("enrolls family members in FAMILY_ADDON campaign when toggle is true", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      ...baseOrder,
      customer: {
        firstName: "Alice",
        lastName: "Brown",
        email: null,
        familyId: "fam-1",
        family: { customers: [{ id: "cust-1" }, { id: "cust-2" }, { id: "cust-3" }] },
      },
    });
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});
    prisma.campaign.findFirst.mockResolvedValue({ id: "camp-family" });
    prisma.campaignRecipient.upsert.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", {
      sendReviewRequest: false,
      enrollInReferralCampaign: false,
      enrollInFamilyPromo: true,
      markAsLowValue: false,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(prisma.campaign.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "FAMILY_ADDON", status: "ACTIVE" } })
    );
    // Should enroll cust-2 and cust-3, but NOT cust-1 (the purchaser)
    expect(prisma.campaignRecipient.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.campaignRecipient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId_customerId: { campaignId: "camp-family", customerId: "cust-2" } },
      })
    );
    expect(prisma.campaignRecipient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId_customerId: { campaignId: "camp-family", customerId: "cust-3" } },
      })
    );
  });

  it("does not enroll in any campaign when both toggles are false", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(baseOrder);
    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.order.update.mockResolvedValue({});

    const { handlePickupComplete } = await import("@/lib/actions/orders");
    await handlePickupComplete("order-1", {
      sendReviewRequest: false,
      enrollInReferralCampaign: false,
      markAsLowValue: false,
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(prisma.campaign.findFirst).not.toHaveBeenCalled();
    expect(prisma.campaignRecipient.upsert).not.toHaveBeenCalled();
  });
});

// ── recordCurrentGlassesReading ─────────────────────────────────────────────

describe("recordCurrentGlassesReading", () => {
  it("returns error when customerId is missing", async () => {
    const { recordCurrentGlassesReading } = await import("@/lib/actions/orders");
    const result = await recordCurrentGlassesReading({ customerId: "" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/customer/i);
  });

  it("deactivates previous CURRENT_GLASSES readings and creates new one", async () => {
    const prisma = await getPrisma();

    let deactivatedSource: string | null = null;
    let createdSource: string | null = null;

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        prescription: {
          updateMany: vi.fn().mockImplementation((args: { where: { source: string } }) => {
            deactivatedSource = args.where.source;
            return Promise.resolve({ count: 1 });
          }),
          create: vi.fn().mockImplementation((args: { data: { source: string } }) => {
            createdSource = args.data.source;
            return Promise.resolve({ id: "rx-current-1" });
          }),
        },
      };
      return fn(txMock);
    });

    const { recordCurrentGlassesReading } = await import("@/lib/actions/orders");
    const result = await recordCurrentGlassesReading({
      customerId: "cust-1",
      odSphere: -2.5,
      osCylinder: -1.25,
      osAxis: 90,
      pdBinocular: 63,
    });

    expect("id" in result).toBe(true);
    if ("id" in result) expect(result.id).toBe("rx-current-1");
    expect(deactivatedSource).toBe("CURRENT_GLASSES");
    expect(createdSource).toBe("CURRENT_GLASSES");
  });

  it("uses today's date when date not provided", async () => {
    const prisma = await getPrisma();

    let capturedDate: Date | null = null;

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        prescription: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockImplementation((args: { data: { date: Date } }) => {
            capturedDate = args.data.date;
            return Promise.resolve({ id: "rx-current-2" });
          }),
        },
      };
      return fn(txMock);
    });

    const before = new Date();
    const { recordCurrentGlassesReading } = await import("@/lib/actions/orders");
    await recordCurrentGlassesReading({ customerId: "cust-1" });
    const after = new Date();

    expect(capturedDate).toBeInstanceOf(Date);
    expect(capturedDate!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(capturedDate!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("returns error when transaction fails", async () => {
    const prisma = await getPrisma();
    (prisma as any).$transaction.mockRejectedValue(new Error("DB error"));

    const { recordCurrentGlassesReading } = await import("@/lib/actions/orders");
    const result = await recordCurrentGlassesReading({ customerId: "cust-1" });

    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toMatch(/failed/i);
  });

  it("stores imageUrl in externalImageUrl field", async () => {
    const prisma = await getPrisma();

    let capturedImageUrl: string | null = null;

    (prisma as any).$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const txMock = {
        prescription: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockImplementation((args: { data: { externalImageUrl: string | null } }) => {
            capturedImageUrl = args.data.externalImageUrl;
            return Promise.resolve({ id: "rx-current-3" });
          }),
        },
      };
      return fn(txMock);
    });

    const { recordCurrentGlassesReading } = await import("@/lib/actions/orders");
    await recordCurrentGlassesReading({
      customerId: "cust-1",
      imageUrl: "https://cdn.example.com/lensometer.jpg",
    });

    expect(capturedImageUrl).toBe("https://cdn.example.com/lensometer.jpg");
  });
});
