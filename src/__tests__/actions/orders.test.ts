import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

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
});

describe("handlePickupComplete", () => {
  it("returns success and updates order status to PICKED_UP", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue({
      customerId: "cust-1",
      totalCustomer: 300,
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
      totalCustomer: 10,
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
