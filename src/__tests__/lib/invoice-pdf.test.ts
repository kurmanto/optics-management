import { describe, it, expect } from "vitest";
import { generateInvoicePdf, InvoicePdfData } from "@/lib/invoice-pdf";

function makeData(overrides: Partial<InvoicePdfData> = {}): InvoicePdfData {
  return {
    orderNumber: "MVO-20260101-0001",
    invoiceNumber: "0001",
    date: "2026-01-01",
    mode: "customer",
    customer: {
      firstName: "Alice",
      lastName: "Brown",
      email: "alice@example.com",
      address: "123 Main St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5V 1A1",
    },
    staffName: "Harmeet",
    lineItems: [
      { description: "Designer Frames", quantity: 1, total: 350 },
      { description: "Progressive Lenses", quantity: 1, total: 200 },
    ],
    subtotal: 550,
    insuranceCoverage: 150,
    referralCredit: 25,
    deposit: 100,
    total: 275,
    notes: "Rush order requested.",
    ...overrides,
  };
}

describe("generateInvoicePdf", () => {
  it("returns a Buffer with non-zero length", async () => {
    const buffer = await generateInvoicePdf(makeData());
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("works with zero deductions", async () => {
    const buffer = await generateInvoicePdf(
      makeData({
        insuranceCoverage: 0,
        referralCredit: 0,
        deposit: 0,
        total: 550,
      })
    );
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("works with null notes", async () => {
    const buffer = await generateInvoicePdf(makeData({ notes: null }));
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("generates internal mode PDF", async () => {
    const buffer = await generateInvoicePdf(makeData({ mode: "internal" }));
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
