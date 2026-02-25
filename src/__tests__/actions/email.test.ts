import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

// Mock the Resend email service
vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: vi.fn(),
  sendIntakeEmail: vi.fn(),
}));

// Mock PDF generation
vi.mock("@/lib/invoice-pdf", () => ({
  generateInvoicePdf: vi.fn(),
}));

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);

  // Default: PDF generation returns a fake buffer
  const { generateInvoicePdf } = await import("@/lib/invoice-pdf");
  vi.mocked(generateInvoicePdf).mockResolvedValue(Buffer.from("fake-pdf-content"));
});

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "MVO-20260101-0001",
    createdAt: new Date("2026-01-01"),
    totalCustomer: 350,
    totalReal: 280,
    depositCustomer: 100,
    depositReal: 80,
    balanceCustomer: 250,
    balanceReal: 200,
    insuranceCoverage: null,
    referralCredit: null,
    notes: null,
    customer: {
      firstName: "Alice",
      lastName: "Brown",
      email: "alice@example.com",
      address: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V 1A1",
    },
    user: { name: "Harmeet" },
    lineItems: [
      {
        description: "Frames",
        quantity: 1,
        unitPriceCustomer: 350,
        unitPriceReal: 280,
        totalCustomer: 350,
        totalReal: 280,
      },
    ],
    ...overrides,
  };
}

describe("emailInvoice", () => {
  it("returns error when order not found", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(null);

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-missing");
    expect((result as any).error).toBe("Order not found");
  });

  it("returns error when customer has no email", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({
        customer: {
          firstName: "Alice",
          lastName: "Brown",
          email: null,
          address: null,
          city: null,
          province: null,
          postalCode: null,
        },
      })
    );

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-1");
    expect((result as any).error).toMatch(/no email/i);
  });

  it("generates PDF and sends email with attachment", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const { sendInvoiceEmail } = await import("@/lib/email");
    vi.mocked(sendInvoiceEmail).mockResolvedValue({ id: "email-1" } as any);

    const { generateInvoicePdf } = await import("@/lib/invoice-pdf");

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-1");
    expect(result).toEqual({ success: true });

    // PDF was generated
    expect(generateInvoicePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: "MVO-20260101-0001",
        mode: "customer",
        staffName: "Harmeet",
      })
    );

    // Email was sent with PDF buffer
    expect(sendInvoiceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        customerName: "Alice Brown",
        orderNumber: "MVO-20260101-0001",
        pdfBuffer: expect.any(Buffer),
      })
    );
  });

  it("uses real amounts when mode is internal", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const { sendInvoiceEmail } = await import("@/lib/email");
    vi.mocked(sendInvoiceEmail).mockResolvedValue({ id: "email-2" } as any);

    const { generateInvoicePdf } = await import("@/lib/invoice-pdf");

    const { emailInvoice } = await import("@/lib/actions/email");
    await emailInvoice("order-1", "internal");

    expect(generateInvoicePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "internal",
        subtotal: 280,
      })
    );
  });

  it("returns error when sendInvoiceEmail fails", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const { sendInvoiceEmail } = await import("@/lib/email");
    vi.mocked(sendInvoiceEmail).mockResolvedValue({ error: "Resend API error" } as any);

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-1");
    expect((result as any).error).toBeTruthy();
  });

  it("returns error when PDF generation fails", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const { generateInvoicePdf } = await import("@/lib/invoice-pdf");
    vi.mocked(generateInvoicePdf).mockRejectedValue(new Error("PDF render failed"));

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-1");
    expect((result as any).error).toBe("Failed to send email");
  });

  it("generates PDF before sending email", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const callOrder: string[] = [];

    const { generateInvoicePdf } = await import("@/lib/invoice-pdf");
    vi.mocked(generateInvoicePdf).mockImplementation(async () => {
      callOrder.push("pdf");
      return Buffer.from("fake-pdf");
    });

    const { sendInvoiceEmail } = await import("@/lib/email");
    vi.mocked(sendInvoiceEmail).mockImplementation(async () => {
      callOrder.push("email");
      return { id: "email-3" } as any;
    });

    const { emailInvoice } = await import("@/lib/actions/email");
    await emailInvoice("order-1");

    expect(callOrder).toEqual(["pdf", "email"]);
  });
});
