import { describe, it, expect, beforeEach, vi } from "vitest";
import { interpolateTemplate } from "@/lib/campaigns/template-engine";
import type { ResolvedVariables } from "@/lib/campaigns/template-engine";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

const baseVariables: ResolvedVariables = {
  firstName: "John",
  lastName: "Smith",
  fullName: "John Smith",
  phone: "4165551234",
  email: "john@example.com",
  frameBrand: "Ray-Ban",
  frameModel: "RB5154",
  orderDate: "2026-01-15",
  rxExpiryDate: "2027-01-15",
  insuranceProvider: "Sunlife",
  insuranceRenewalMonth: "October",
  examDate: "2025-02-01",
  referralCode: "REF-123",
  storeName: "Mint Vision Optique",
  storePhone: "(416) 555-0100",
};

describe("interpolateTemplate", () => {
  it("replaces a single variable", () => {
    const result = interpolateTemplate("Hello {{firstName}}!", baseVariables);
    expect(result).toBe("Hello John!");
  });

  it("replaces multiple variables", () => {
    const result = interpolateTemplate(
      "Hi {{firstName}}, your {{frameBrand}} frames are ready at {{storeName}}.",
      baseVariables
    );
    expect(result).toBe(
      "Hi John, your Ray-Ban frames are ready at Mint Vision Optique."
    );
  });

  it("leaves unknown variables as-is", () => {
    const result = interpolateTemplate("Hi {{unknownVar}}!", baseVariables);
    expect(result).toBe("Hi {{unknownVar}}!");
  });

  it("handles template with no variables", () => {
    const result = interpolateTemplate("No variables here.", baseVariables);
    expect(result).toBe("No variables here.");
  });

  it("replaces multiple occurrences of same variable", () => {
    const result = interpolateTemplate(
      "{{firstName}} — hello {{firstName}}!",
      baseVariables
    );
    expect(result).toBe("John — hello John!");
  });

  it("handles empty variable value", () => {
    const vars = { ...baseVariables, frameBrand: "" };
    const result = interpolateTemplate("Brand: {{frameBrand}}", vars);
    expect(result).toBe("Brand: ");
  });

  it("handles SMS-style template with phone number", () => {
    const result = interpolateTemplate(
      "{{firstName}}, call {{storePhone}} for details.",
      baseVariables
    );
    expect(result).toBe("John, call (416) 555-0100 for details.");
  });

  it("handles email subject interpolation", () => {
    const result = interpolateTemplate(
      "Your Annual Eye Exam Reminder — {{storeName}}",
      baseVariables
    );
    expect(result).toBe("Your Annual Eye Exam Reminder — Mint Vision Optique");
  });

  it("handles insurance variables", () => {
    const result = interpolateTemplate(
      "Use your {{insuranceProvider}} benefits before {{insuranceRenewalMonth}}.",
      baseVariables
    );
    expect(result).toBe("Use your Sunlife benefits before October.");
  });

  it("handles prescription expiry date", () => {
    const result = interpolateTemplate(
      "Your Rx expires on {{rxExpiryDate}}.",
      baseVariables
    );
    expect(result).toBe("Your Rx expires on 2027-01-15.");
  });
});

// ── resolveVariables tests ────────────────────────────────────────────────────

describe("resolveVariables", () => {
  it("resolves all 15 fields from full customer data", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "c1",
      firstName: "Marie",
      lastName: "Curie",
      phone: "4165559999",
      email: "marie@example.com",
      orders: [{ pickedUpAt: new Date("2025-11-15"), frameBrand: "Prada", frameModel: "PR01" }],
      prescriptions: [{ isActive: true, expiryDate: new Date("2027-06-30"), date: new Date() }],
      insurancePolicies: [{ isActive: true, providerName: "Manulife", renewalMonth: 10, createdAt: new Date() }],
      exams: [{ examDate: new Date("2025-03-01") }],
      referralsGiven: [{ code: "REF-ABC", createdAt: new Date() }],
    });

    const { resolveVariables } = await import("@/lib/campaigns/template-engine");
    const vars = await resolveVariables("c1");

    expect(vars.firstName).toBe("Marie");
    expect(vars.lastName).toBe("Curie");
    expect(vars.fullName).toBe("Marie Curie");
    expect(vars.phone).toBe("4165559999");
    expect(vars.email).toBe("marie@example.com");
    expect(vars.frameBrand).toBe("Prada");
    expect(vars.frameModel).toBe("PR01");
    expect(vars.insuranceProvider).toBe("Manulife");
    expect(vars.referralCode).toBe("REF-ABC");
    expect(vars.storeName).toBe("Mint Vision Optique");
    expect(vars.storePhone).toBe("(416) 555-0100");
  });

  it("returns empty strings for missing optional fields", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "c1",
      firstName: "Bob",
      lastName: "Jones",
      phone: null,
      email: null,
      orders: [],
      prescriptions: [],
      insurancePolicies: [],
      exams: [],
      referralsGiven: [],
    });

    const { resolveVariables } = await import("@/lib/campaigns/template-engine");
    const vars = await resolveVariables("c1");

    expect(vars.phone).toBe("");
    expect(vars.email).toBe("");
    expect(vars.frameBrand).toBe("");
    expect(vars.frameModel).toBe("");
    expect(vars.orderDate).toBe("");
    expect(vars.rxExpiryDate).toBe("");
    expect(vars.insuranceProvider).toBe("");
    expect(vars.insuranceRenewalMonth).toBe("");
    expect(vars.examDate).toBe("");
    expect(vars.referralCode).toBe("");
  });

  it("returns default variables when customer not found", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue(null);

    const { resolveVariables } = await import("@/lib/campaigns/template-engine");
    const vars = await resolveVariables("nonexistent");

    expect(vars.firstName).toBe("");
    expect(vars.storeName).toBe("Mint Vision Optique");
    expect(vars.storePhone).toBe("(416) 555-0100");
  });

  it("maps renewalMonth 10 to 'October'", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "c1",
      firstName: "Jane",
      lastName: "Doe",
      phone: null,
      email: null,
      orders: [],
      prescriptions: [],
      insurancePolicies: [{ isActive: true, providerName: "Sunlife", renewalMonth: 10, createdAt: new Date() }],
      exams: [],
      referralsGiven: [],
    });

    const { resolveVariables } = await import("@/lib/campaigns/template-engine");
    const vars = await resolveVariables("c1");

    expect(vars.insuranceRenewalMonth).toBe("October");
  });

  it("formats dates as YYYY-MM-DD (en-CA locale)", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "c1",
      firstName: "Test",
      lastName: "User",
      phone: null,
      email: null,
      orders: [{ pickedUpAt: new Date("2025-06-15T12:00:00Z"), frameBrand: "Ray-Ban", frameModel: "RB" }],
      prescriptions: [{ isActive: true, expiryDate: new Date("2027-01-01T00:00:00Z"), date: new Date() }],
      insurancePolicies: [],
      exams: [{ examDate: new Date("2025-01-20T00:00:00Z") }],
      referralsGiven: [],
    });

    const { resolveVariables } = await import("@/lib/campaigns/template-engine");
    const vars = await resolveVariables("c1");

    // Dates should be YYYY-MM-DD format
    expect(vars.orderDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(vars.rxExpiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(vars.examDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("end-to-end: resolveVariables + interpolateTemplate produces correct message", async () => {
    const prisma = await getPrisma();
    prisma.customer.findUnique.mockResolvedValue({
      id: "c1",
      firstName: "Alice",
      lastName: "Smith",
      phone: "4165551234",
      email: "alice@example.com",
      orders: [],
      prescriptions: [],
      insurancePolicies: [{ isActive: true, providerName: "Sunlife", renewalMonth: 3, createdAt: new Date() }],
      exams: [],
      referralsGiven: [],
    });

    const { resolveVariables } = await import("@/lib/campaigns/template-engine");
    const vars = await resolveVariables("c1");

    const msg = interpolateTemplate(
      "Hi {{firstName}}, your {{insuranceProvider}} benefits renew in {{insuranceRenewalMonth}}. Call {{storePhone}}.",
      vars
    );

    expect(msg).toBe("Hi Alice, your Sunlife benefits renew in March. Call (416) 555-0100.");
  });
});
