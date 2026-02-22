import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

// Mock the Resend email service
vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: vi.fn(),
}));

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "MVO-20260101-0001",
    totalCustomer: 350,
    totalReal: 280,
    depositCustomer: 100,
    depositReal: 80,
    balanceCustomer: 250,
    balanceReal: 200,
    insuranceCoverage: null,
    referralCredit: null,
    customer: { firstName: "Alice", lastName: "Brown", email: "alice@example.com" },
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
      makeOrder({ customer: { firstName: "Alice", lastName: "Brown", email: null } })
    );

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-1");
    expect((result as any).error).toMatch(/no email/i);
  });

  it("calls sendInvoiceEmail with correct args and returns success", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const { sendInvoiceEmail } = await import("@/lib/email");
    vi.mocked(sendInvoiceEmail).mockResolvedValue({ id: "email-1" } as any);

    const { emailInvoice } = await import("@/lib/actions/email");
    const result = await emailInvoice("order-1");
    expect(result).toEqual({ success: true });
    expect(sendInvoiceEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        customerName: "Alice Brown",
        orderNumber: "MVO-20260101-0001",
        totalAmount: 350,
      })
    );
  });

  it("uses real amounts when mode is internal", async () => {
    const prisma = await getPrisma();
    prisma.order.findUnique.mockResolvedValue(makeOrder());

    const { sendInvoiceEmail } = await import("@/lib/email");
    vi.mocked(sendInvoiceEmail).mockResolvedValue({ id: "email-2" } as any);

    const { emailInvoice } = await import("@/lib/actions/email");
    await emailInvoice("order-1", "internal");
    expect(sendInvoiceEmail).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 280 })
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
});
