/**
 * Test data constants matching what the E2E seed (prisma/seed-e2e.ts) creates.
 * These are deterministic — they don't change between runs.
 */

export const ADMIN = {
  email: "admin@mintvisionsoptique.com",
  password: "changeme123",
  name: "Alex Dumont",
  role: "ADMIN",
};

export const STAFF = {
  email: "staff@mintvisionsoptique.com",
  password: "staff1234",
  name: "Sarah Chen",
  role: "STAFF",
};

// Seeded customers — lastName → phone for search tests
export const CUSTOMERS = {
  Tremblay:  { firstName: "Marie",     lastName: "Tremblay",  phone: "5145550101" },
  Okafor:    { firstName: "James",     lastName: "Okafor",    phone: "4165550102" },
  Gagnon:    { firstName: "Isabelle",  lastName: "Gagnon",    phone: "5145550103" },
  Nguyen:    { firstName: "David",     lastName: "Nguyen",    phone: "6135550104" },
  Patel:     { firstName: "Priya",     lastName: "Patel",     phone: "4165550105" },
  Rossi:     { firstName: "Luca",      lastName: "Rossi",     phone: "5145550106" },
  Beauchamp: { firstName: "Carole",    lastName: "Beauchamp", phone: "4185550107" },
  Hassan:    { firstName: "Ahmed",     lastName: "Hassan",    phone: "6135550108" },
  Larouche:  { firstName: "Sophie",    lastName: "Larouche",  phone: "5145550109" },
  Mitchell:  { firstName: "Ryan",      lastName: "Mitchell",  phone: "4165550110" },
  Wilson:    { firstName: "Emma",      lastName: "Wilson",    phone: "4165550111", email: "emma.wilson@example.com" },
  Martin:    { firstName: "Noah",      lastName: "Martin",    phone: "5145550112" },
  Johnson:   { firstName: "Olivia",    lastName: "Johnson",   phone: "6135550113" },
  Brown:     { firstName: "William",   lastName: "Brown",     phone: "4185550114" },
  Davis:     { firstName: "Ava",       lastName: "Davis",     phone: "5145550115" },
  Cote:      { firstName: "Benjamin",  lastName: "Cote",      phone: "4165550116" },
  Taylor:    { firstName: "Mia",       lastName: "Taylor",    phone: "6135550117" },
  Leblanc:   { firstName: "Etienne",   lastName: "Leblanc",   phone: "5145550118" },
  Moore:     { firstName: "Charlotte", lastName: "Moore",     phone: "4165550119" },
  Bouchard:  { firstName: "Louis",     lastName: "Bouchard",  phone: "5145550120" },
  // Phase 2 — family group customers
  AndersonPrimary: { firstName: "Claire", lastName: "Anderson", phone: "4165550201" },
  AndersonMember:  { firstName: "Mark",   lastName: "Anderson", phone: "4165550201" },
  // Phase 2 — no-email customer
  Fletcher: { firstName: "Paul", lastName: "Fletcher", phone: "4165550202" },
} as const;

// Seeded inventory items
export const INVENTORY = {
  RB5154: { brand: "Ray-Ban",  model: "RB5154",  sku: "RB5154-BLK", category: "OPTICAL", gender: "UNISEX", retailPrice: 285 },
  RB3025: { brand: "Ray-Ban",  model: "RB3025",  sku: "RB3025-GLD", category: "SUN",     gender: "UNISEX", retailPrice: 250 },
  TF5634: { brand: "Tom Ford", model: "TF5634",  sku: "TF5634-HVN", category: "OPTICAL", gender: "WOMENS", retailPrice: 420 },
  TF0237: { brand: "Tom Ford", model: "TF0237",  sku: "TF0237-BLK", category: "SUN",     gender: "MENS",   retailPrice: 450 },
  OX8046: { brand: "Oakley",   model: "OX8046",  sku: "OX8046-SAT", category: "OPTICAL", gender: "MENS",   retailPrice: 320 },
  GG0026: { brand: "Gucci",    model: "GG0026O", sku: "GG0026-GLD", category: "OPTICAL", gender: "WOMENS", retailPrice: 560 },
  PO3007: { brand: "Persol",   model: "PO3007V", sku: "PO3007-BLK", category: "OPTICAL", gender: "UNISEX", retailPrice: 350 },
  MJ440:  { brand: "Maui Jim", model: "MJ440",   sku: "MJ440-BLK",  category: "SUN",     gender: "UNISEX", retailPrice: 380 },
} as const;

// Order statuses in the workflow
export const ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "LAB_ORDERED",
  "LAB_RECEIVED",
  "VERIFIED",
  "READY",
  "PICKED_UP",
  "CANCELLED",
] as const;

// Order types
export const ORDER_TYPES = [
  "GLASSES",
  "SUNGLASSES",
  "CONTACTS",
  "EXAM_ONLY",
] as const;

// Notification types
export const NOTIFICATION_TYPES = [
  "FORM_COMPLETED",
  "INTAKE_COMPLETED",
  "ORDER_READY",
  "ORDER_CANCELLED",
  "ORDER_LAB_RECEIVED",
  "PO_RECEIVED",
  "LOW_STOCK",
] as const;

// Form template types
export const FORM_TEMPLATES = [
  "New Patient Registration",
  "Privacy & Consent (PIPEDA)",
  "Frame Repair Waiver",
  "Insurance Verification",
] as const;

// Seeded vendor
export const VENDOR = {
  Luxottica: {
    name: "Luxottica",
    contactName: "John Smith",
    email: "orders@luxottica.com",
    leadTimeDays: 14,
  },
} as const;

// Helper: generate a unique suffix for test-created data
export function uniqueSuffix(): string {
  return Date.now().toString(36).toUpperCase();
}

// Helper: load dynamic fixtures (IDs) written by seed-e2e.ts
export function getTestFixtures() {
  try {
    const fs = require("fs");
    const raw = fs.readFileSync("./e2e/helpers/test-fixtures.json", "utf-8");
    return JSON.parse(raw) as {
      adminId: string;
      staffId: string;
      customerIds: Record<string, string>;
      inventoryIds: Record<string, string>;
      orderId: { tremblay: string; okafor: string };
      vendorId: string;
      poId: string;
      invoiceId: string;
      notificationId: string;
      // Phase 2 fixtures
      withFamilyCustomerId: string;
      familyMemberCustomerId: string;
      familyId: string;
      noEmailCustomerId: string;
      dualInvoiceOrderId: string;
      standardOrderId: string;
      receivedPoId: string;
      frameWithReturnDateId: string;
      stylingAppointmentId: string;
      // Work order auto-generate test orders
      confirmedGlassesOrderId: string;
      confirmedExamOrderId: string;
    };
  } catch {
    throw new Error(
      "test-fixtures.json not found — run the E2E seed first: npx tsx prisma/seed-e2e.ts"
    );
  }
}
