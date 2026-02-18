import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(mockSession as any);
});

describe("issueInvoice", () => {
  it("creates a new invoice when none exists", async () => {
    const prisma = await getPrisma();
    prisma.invoice.findFirst.mockResolvedValue(null);
    prisma.invoice.create.mockResolvedValue({
      id: "inv-1",
      generatedAt: new Date("2026-02-17"),
    });

    const { issueInvoice } = await import("@/lib/actions/invoices");
    const result = await issueInvoice("order-1");

    expect("id" in result).toBe(true);
    if ("id" in result) {
      expect(result.id).toBe("inv-1");
      expect(result.generatedAt).toBeInstanceOf(Date);
    }
    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderId: "order-1", type: "CUSTOMER" }),
      })
    );
  });

  it("updates timestamp when invoice already exists (re-issue)", async () => {
    const prisma = await getPrisma();
    const existing = { id: "inv-existing" };
    prisma.invoice.findFirst.mockResolvedValue(existing);
    prisma.invoice.update.mockResolvedValue({
      id: "inv-existing",
      generatedAt: new Date(),
    });

    const { issueInvoice } = await import("@/lib/actions/invoices");
    const result = await issueInvoice("order-1");

    expect("id" in result).toBe(true);
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-existing" },
        data: expect.objectContaining({ generatedAt: expect.any(Date) }),
      })
    );
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.invoice.findFirst.mockRejectedValue(new Error("DB error"));

    const { issueInvoice } = await import("@/lib/actions/invoices");
    const result = await issueInvoice("order-1");

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Failed");
    }
  });
});
