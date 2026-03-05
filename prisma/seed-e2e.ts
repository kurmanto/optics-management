/**
 * E2E Test Seed Script
 * ---------------------
 * Truncates ALL application data, then seeds a clean, known state for E2E tests.
 *
 * ⚠️  WARNING: This DESTROYS all data in the target database.
 *              NEVER run against production. Use a dedicated test DB.
 *
 * Usage: npx tsx prisma/seed-e2e.ts
 */

import {
  PrismaClient,
  UserRole,
  OrderStatus,
  OrderType,
  LineItemType,
  FormTemplateType,
  PurchaseOrderStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";

// Load .env.test first, fall back to .env
const envTestPath = path.resolve(process.cwd(), ".env.test");
const envPath = path.resolve(process.cwd(), ".env");
config({ path: envTestPath });
if (!process.env.DATABASE_URL) {
  config({ path: envPath });
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl:
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
      ? { rejectUnauthorized: false }
      : undefined,
});
const prisma = new PrismaClient({ adapter });

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function todayAt(hour = 10): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

// ── Truncate all tables ───────────────────────────────────────────────────────
async function truncateAll() {
  console.log("🗑️  Truncating all tables...");

  // Delete in FK-safe order (most dependent first)
  await prisma.notificationRead.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.formPackage.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderLineItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.inventoryLedger.deleteMany();
  await prisma.purchaseOrderLineItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  // savedFrame references inventoryItem — must be deleted first
  try { await (prisma as any).savedFrame.deleteMany(); } catch (_) {}
  await prisma.inventoryItem.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.storeCredit.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.medicalHistory.deleteMany();
  await prisma.exam.deleteMany();

  // Appointment-related tables (FK-safe order: dependents first)
  try { await prisma.publicBooking.deleteMany(); } catch (_) {}
  try { await prisma.lensQuote.deleteMany(); } catch (_) {}
  try { await prisma.blockedTime.deleteMany(); } catch (_) {}
  try { await prisma.providerAvailability.deleteMany(); } catch (_) {}
  try { await prisma.appointment.deleteMany(); } catch (_) {}
  try { await prisma.provider.deleteMany(); } catch (_) {}
  try { await prisma.serviceType.deleteMany(); } catch (_) {}
  try { await prisma.appointmentSettings.deleteMany(); } catch (_) {}

  // V2 models — may exist, use try/catch
  try { await (prisma as any).walkin.deleteMany(); } catch (_) {}
  try { await (prisma as any).campaignRecipient.deleteMany(); } catch (_) {}
  try { await (prisma as any).message.deleteMany(); } catch (_) {}
  try { await (prisma as any).referral.deleteMany(); } catch (_) {}
  try { await (prisma as any).campaign.deleteMany(); } catch (_) {}

  // Client portal tables (FK to customer + family)
  try { await prisma.clientSession.deleteMany(); } catch (_) {}
  try { await prisma.magicLink.deleteMany(); } catch (_) {}
  try { await prisma.clientAccount.deleteMany(); } catch (_) {}
  try { await prisma.unlockCard.deleteMany(); } catch (_) {}

  await prisma.customer.deleteMany();
  await prisma.family.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.formTemplate.deleteMany();

  // StaffTask/TaskComment reference User — must delete before users
  await prisma.taskComment.deleteMany();
  await prisma.staffTask.deleteMany();

  await prisma.user.deleteMany();

  console.log("✅ All tables cleared\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 E2E Seed: Starting...\n");

  await truncateAll();

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("changeme123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@mintvisionsoptique.com",
      name: "Alex Dumont",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      mustChangePassword: true,
    },
  });

  const staffHash = await bcrypt.hash("staff1234", 10);
  const staff = await prisma.user.create({
    data: {
      email: "staff@mintvisionsoptique.com",
      name: "Sarah Chen",
      passwordHash: staffHash,
      role: UserRole.STAFF,
    },
  });
  console.log(`✅ Users: ${admin.email}, ${staff.email}`);

  // ── System settings ────────────────────────────────────────────────────────
  const settings = [
    { key: "tax_rate", value: "0.13" },
    { key: "business_name", value: "Mint Vision Optique" },
    { key: "business_phone", value: "4165550100" },
    { key: "business_email", value: "info@mintvisionsoptique.com" },
    { key: "business_address", value: "123 Optique Ave, Toronto ON M5V 1A1" },
    { key: "invoice_notes", value: "Thank you for choosing Mint Vision Optique!" },
    { key: "daily_revenue_goal", value: "2500" },
    { key: "monthly_revenue_goal", value: "40000" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log("✅ System settings");

  // ── Form Templates ─────────────────────────────────────────────────────────
  const formTemplates = [
    {
      type: FormTemplateType.NEW_PATIENT,
      name: "New Patient Registration",
      description: "Collect personal details, contact info, and health card number.",
    },
    {
      type: FormTemplateType.HIPAA_CONSENT,
      name: "Privacy & Consent (PIPEDA)",
      description: "Consent for data collection, SMS/email communications, and insurance sharing.",
    },
    {
      type: FormTemplateType.FRAME_REPAIR_WAIVER,
      name: "Frame Repair Waiver",
      description: "Liability waiver for frame adjustments and repairs with patient signature.",
    },
    {
      type: FormTemplateType.INSURANCE_VERIFICATION,
      name: "Insurance Verification",
      description: "Collect policy details, member ID, group number, and renewal dates.",
    },
  ];
  for (const t of formTemplates) {
    await prisma.formTemplate.create({ data: t });
  }
  console.log("✅ Form templates (4)");

  // ── Customers ──────────────────────────────────────────────────────────────
  const customerDefs = [
    { firstName: "Marie",     lastName: "Tremblay",  phone: "5145550101" },
    { firstName: "James",     lastName: "Okafor",    phone: "4165550102" },
    { firstName: "Isabelle",  lastName: "Gagnon",    phone: "5145550103" },
    { firstName: "David",     lastName: "Nguyen",    phone: "6135550104" },
    { firstName: "Priya",     lastName: "Patel",     phone: "4165550105" },
    { firstName: "Luca",      lastName: "Rossi",     phone: "5145550106" },
    { firstName: "Carole",    lastName: "Beauchamp", phone: "4185550107" },
    { firstName: "Ahmed",     lastName: "Hassan",    phone: "6135550108" },
    { firstName: "Sophie",    lastName: "Larouche",  phone: "5145550109" },
    { firstName: "Ryan",      lastName: "Mitchell",  phone: "4165550110" },
    { firstName: "Emma",      lastName: "Wilson",    phone: "4165550111", email: "emma.wilson@example.com" },
    { firstName: "Noah",      lastName: "Martin",    phone: "5145550112" },
    { firstName: "Olivia",    lastName: "Johnson",   phone: "6135550113" },
    { firstName: "William",   lastName: "Brown",     phone: "4185550114" },
    { firstName: "Ava",       lastName: "Davis",     phone: "5145550115" },
    { firstName: "Benjamin",  lastName: "Cote",      phone: "4165550116" },
    { firstName: "Mia",       lastName: "Taylor",    phone: "6135550117" },
    { firstName: "Etienne",   lastName: "Leblanc",   phone: "5145550118" },
    { firstName: "Charlotte", lastName: "Moore",     phone: "4165550119" },
    { firstName: "Louis",     lastName: "Bouchard",  phone: "5145550120" },
  ];

  const C: Record<string, string> = {};
  for (const c of customerDefs) {
    const customer = await prisma.customer.create({ data: { ...c, isActive: true } });
    C[c.lastName] = customer.id;
  }
  console.log(`✅ ${customerDefs.length} customers`);

  // ── Inventory ──────────────────────────────────────────────────────────────
  const frameDefs = [
    { brand: "Ray-Ban",  model: "RB5154",  sku: "RB5154-BLK", category: "OPTICAL" as const, gender: "UNISEX"  as const, wholesaleCost: 85,  retailPrice: 285 },
    { brand: "Ray-Ban",  model: "RB3025",  sku: "RB3025-GLD", category: "SUN"     as const, gender: "UNISEX"  as const, wholesaleCost: 75,  retailPrice: 250 },
    { brand: "Tom Ford", model: "TF5634",  sku: "TF5634-HVN", category: "OPTICAL" as const, gender: "WOMENS"  as const, wholesaleCost: 120, retailPrice: 420 },
    { brand: "Tom Ford", model: "TF0237",  sku: "TF0237-BLK", category: "SUN"     as const, gender: "MENS"    as const, wholesaleCost: 130, retailPrice: 450 },
    { brand: "Oakley",   model: "OX8046",  sku: "OX8046-SAT", category: "OPTICAL" as const, gender: "MENS"    as const, wholesaleCost: 90,  retailPrice: 320 },
    { brand: "Gucci",    model: "GG0026O", sku: "GG0026-GLD", category: "OPTICAL" as const, gender: "WOMENS"  as const, wholesaleCost: 160, retailPrice: 560 },
    { brand: "Persol",   model: "PO3007V", sku: "PO3007-BLK", category: "OPTICAL" as const, gender: "UNISEX"  as const, wholesaleCost: 100, retailPrice: 350 },
    { brand: "Maui Jim", model: "MJ440",   sku: "MJ440-BLK",  category: "SUN"     as const, gender: "UNISEX"  as const, wholesaleCost: 110, retailPrice: 380 },
  ];

  const invIds: Record<string, string> = {};
  for (const f of frameDefs) {
    const item = await prisma.inventoryItem.create({
      data: { ...f, stockQuantity: 5, reorderPoint: 2 },
    });
    invIds[f.sku] = item.id;
  }
  console.log(`✅ ${frameDefs.length} inventory items`);

  // ── Vendor ─────────────────────────────────────────────────────────────────
  const vendor = await prisma.vendor.create({
    data: {
      name: "Luxottica",
      contactName: "John Smith",
      email: "orders@luxottica.com",
      phone: "8005551234",
      leadTimeDays: 14,
      isActive: true,
    },
  });
  console.log(`✅ Vendor: ${vendor.name}`);

  // ── Purchase Order ──────────────────────────────────────────────────────────
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0001",
      vendorId: vendor.id,
      createdBy: admin.id,
      status: PurchaseOrderStatus.DRAFT,
      expectedAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      total: 340,
      notes: "Initial test PO",
      lineItems: {
        create: [
          {
            inventoryItemId: invIds["RB5154-BLK"],
            quantityOrdered: 2,
            unitCost: 85,
          },
          {
            inventoryItemId: invIds["TF5634-HVN"],
            quantityOrdered: 2,
            unitCost: 120,
          },
        ],
      },
    },
  });
  console.log(`✅ Purchase Order: ${po.poNumber}`);

  // ── Order helpers ──────────────────────────────────────────────────────────
  let seq = 200;
  const nextNum = () => `ORD-2026-${String(++seq).padStart(4, "0")}`;

  async function createOrder(opts: {
    customerId: string;
    userId: string;
    type?: OrderType;
    status: OrderStatus;
    totalReal: number;
    depositReal?: number;
    createdAt: Date;
    pickedUpAt?: Date;
    frameIdx?: number;
    withLens?: boolean;
  }) {
    const {
      customerId, userId, type = OrderType.GLASSES, status,
      totalReal, depositReal = totalReal, createdAt, pickedUpAt,
      frameIdx = 0, withLens = true,
    } = opts;

    const f = frameDefs[frameIdx % frameDefs.length];
    const frameInternal = Math.round(f.wholesaleCost * 1.2);
    const lensInternal = withLens ? totalReal - frameInternal : 0;

    return prisma.order.create({
      data: {
        orderNumber: nextNum(),
        customerId, userId, type, status,
        totalReal,
        totalCustomer: Math.round(totalReal * 1.15),
        depositReal,
        depositCustomer: Math.round(depositReal * 1.15),
        balanceReal: Math.max(0, totalReal - depositReal),
        balanceCustomer: Math.round(Math.max(0, totalReal - depositReal) * 1.15),
        frameBrand: f.brand,
        frameModel: f.model,
        frameWholesale: f.wholesaleCost,
        createdAt,
        pickedUpAt: pickedUpAt ?? null,
        updatedAt: pickedUpAt ?? createdAt,
        lineItems: {
          create: [
            {
              type: LineItemType.FRAME,
              description: `${f.brand} ${f.model}`,
              quantity: 1,
              unitPriceReal: frameInternal,
              unitPriceCustomer: f.retailPrice,
              totalReal: frameInternal,
              totalCustomer: f.retailPrice,
            },
            ...(withLens && lensInternal > 0
              ? [{
                  type: LineItemType.LENS,
                  description: "Progressive + AR coating",
                  quantity: 1,
                  unitPriceReal: lensInternal,
                  unitPriceCustomer: Math.round(lensInternal * 1.15),
                  totalReal: lensInternal,
                  totalCustomer: Math.round(lensInternal * 1.15),
                }]
              : []),
          ],
        },
      },
    });
  }

  // Today's orders (feeds scoreboard)
  await createOrder({ customerId: C["Wilson"],  userId: staff.id, status: OrderStatus.CONFIRMED, totalReal: 780,  createdAt: todayAt(9),  frameIdx: 0 });
  await createOrder({ customerId: C["Martin"],  userId: staff.id, status: OrderStatus.CONFIRMED, totalReal: 620,  createdAt: todayAt(11), frameIdx: 2 });
  await createOrder({ customerId: C["Johnson"], userId: admin.id, status: OrderStatus.CONFIRMED, totalReal: 1150, createdAt: todayAt(14), frameIdx: 5 });
  console.log("✅ Today's CONFIRMED orders (3)");

  // ── Work order auto-generate test orders ───────────────────────────────────
  // These are dedicated fixtures for the work-order-auto E2E spec.
  // confirmedGlassesOrder → clicking "Send to Lab" should open work order tab.
  // confirmedExamOrder    → clicking "Send to Lab" should NOT open work order tab.
  const confirmedGlassesOrder = await createOrder({
    customerId: C["Patel"],
    userId: staff.id,
    type: OrderType.GLASSES,
    status: OrderStatus.CONFIRMED,
    totalReal: 480,
    depositReal: 100,
    createdAt: daysAgo(1),
    frameIdx: 2,
  });
  const confirmedExamOrder = await prisma.order.create({
    data: {
      orderNumber: nextNum(),
      customerId: C["Hassan"],
      userId: staff.id,
      type: OrderType.EXAM_ONLY,
      status: OrderStatus.CONFIRMED,
      totalReal: 120,
      totalCustomer: 120,
      depositReal: 0,
      depositCustomer: 0,
      balanceReal: 120,
      balanceCustomer: 120,
      createdAt: daysAgo(1),
      lineItems: {
        create: [{
          type: LineItemType.EXAM,
          description: "Comprehensive Eye Exam",
          quantity: 1,
          unitPriceReal: 120,
          unitPriceCustomer: 120,
          totalReal: 120,
          totalCustomer: 120,
        }],
      },
    },
  });
  console.log("✅ Work order auto-generate test orders (glasses + exam_only)");

  // Incomplete orders — deposit taken, not picked up
  const tremblay = await createOrder({ customerId: C["Tremblay"], userId: staff.id, status: OrderStatus.LAB_RECEIVED, totalReal: 920, depositReal: 400, createdAt: daysAgo(18), frameIdx: 3 });
  const okafor   = await createOrder({ customerId: C["Okafor"],   userId: admin.id, status: OrderStatus.READY,        totalReal: 640, depositReal: 300, createdAt: daysAgo(12), frameIdx: 1 });
  await createOrder({ customerId: C["Gagnon"],   userId: staff.id, status: OrderStatus.LAB_ORDERED,  totalReal: 530, depositReal: 250, createdAt: daysAgo(8),  frameIdx: 7, type: OrderType.SUNGLASSES, withLens: false });
  console.log("✅ Incomplete orders (3)");

  // Exams without purchases
  await prisma.exam.createMany({
    data: [
      { customerId: C["Nguyen"], examDate: daysAgo(10), examType: "COMPREHENSIVE", doctorName: "Dr. Lefebvre" },
      { customerId: C["Patel"],  examDate: daysAgo(22), examType: "COMPREHENSIVE", doctorName: "Dr. Lefebvre" },
      { customerId: C["Rossi"],  examDate: daysAgo(45), examType: "CONTACT_LENS",  doctorName: "Dr. Lefebvre" },
    ],
  });
  console.log("✅ Exams without purchase (3)");

  // Recall candidates (last exam 12–24 months ago)
  await prisma.exam.createMany({
    data: [
      { customerId: C["Beauchamp"], examDate: monthsAgo(16), examType: "COMPREHENSIVE", doctorName: "Dr. Lefebvre" },
      { customerId: C["Hassan"],    examDate: monthsAgo(20), examType: "COMPREHENSIVE", doctorName: "Dr. Lefebvre" },
    ],
  });
  console.log("✅ Recall candidates (2)");

  // Contact lens drop-offs (100+ days ago)
  for (const [lastName, dAgo] of [["Larouche", 110], ["Mitchell", 98]] as const) {
    await prisma.order.create({
      data: {
        orderNumber: nextNum(),
        customerId: C[lastName], userId: staff.id,
        type: OrderType.CONTACTS, status: OrderStatus.PICKED_UP,
        totalReal: 280, totalCustomer: 310,
        depositReal: 280, depositCustomer: 310,
        balanceReal: 0, balanceCustomer: 0,
        createdAt: daysAgo(dAgo), pickedUpAt: daysAgo(dAgo - 2), updatedAt: daysAgo(dAgo - 2),
        lineItems: {
          create: [{
            type: LineItemType.CONTACT_LENS,
            description: "Dailies Total 1 (90pk × 2)",
            quantity: 2,
            unitPriceReal: 140, unitPriceCustomer: 155,
            totalReal: 280, totalCustomer: 310,
          }],
        },
      },
    });
  }
  console.log("✅ Contact lens drop-offs (2)");

  // ── Invoice for Okafor's READY order ───────────────────────────────────────
  const invoice = await prisma.invoice.create({
    data: {
      orderId: okafor.id,
      type: "CUSTOMER" as any,
      generatedAt: new Date(),
    },
  });
  console.log(`✅ Invoice for Okafor's order`);

  // ── Notification ───────────────────────────────────────────────────────────
  const notification = await prisma.notification.create({
    data: {
      type: "ORDER_READY" as any,
      title: "Order Ready for Pickup",
      body: `James Okafor's order is ready for pickup.`,
      href: `/orders/${okafor.id}`,
      actorId: staff.id,
    },
  });
  console.log(`✅ Notification created`);

  // ── Form Submission ─────────────────────────────────────────────────────────
  const newPatientTemplate = await prisma.formTemplate.findFirst({
    where: { type: FormTemplateType.NEW_PATIENT },
  });
  if (newPatientTemplate) {
    await prisma.formSubmission.create({
      data: {
        templateId: newPatientTemplate.id,
        customerId: C["Tremblay"],
        customerName: "Marie Tremblay",
        sentByUserId: staff.id,
        token: "test-submission-token-tremblay",
        status: "COMPLETED" as any,
        completedAt: daysAgo(2),
        data: { firstName: "Marie", lastName: "Tremblay" },
      },
    });
    console.log(`✅ Form submission created`);
  }

  // Conversion pairs (exam + purchase)
  const conversions = [
    { cust: "Brown",   examD: 60, orderD: 55, total: 680, fi: 4 },
    { cust: "Davis",   examD: 50, orderD: 47, total: 790, fi: 2 },
    { cust: "Cote",    examD: 35, orderD: 31, total: 920, fi: 6 },
    { cust: "Taylor",  examD: 20, orderD: 17, total: 650, fi: 0 },
    { cust: "Leblanc", examD: 14, orderD: 11, total: 1100, fi: 5 },
  ];
  for (const { cust, examD, orderD, total, fi } of conversions) {
    await prisma.exam.create({ data: { customerId: C[cust], examDate: daysAgo(examD), examType: "COMPREHENSIVE", doctorName: "Dr. Lefebvre" } });
    await createOrder({ customerId: C[cust], userId: staff.id, status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(orderD), pickedUpAt: daysAgo(orderD - 8), frameIdx: fi });
  }
  console.log("✅ Conversion pairs (5)");

  // This-month and last-month orders
  const thisMonth = [
    { cust: "Moore",    total: 840,  d: 3,  fi: 4 },
    { cust: "Bouchard", total: 1240, d: 5,  fi: 6 },
  ];
  for (const { cust, total, d, fi } of thisMonth) {
    await createOrder({ customerId: C[cust], userId: staff.id, status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(d), pickedUpAt: daysAgo(d - 7), frameIdx: fi });
  }

  const lastMonth = [
    { cust: "Brown",    total: 680,  d: 38 },
    { cust: "Davis",    total: 1050, d: 41 },
    { cust: "Taylor",   total: 890,  d: 47 },
  ];
  for (const { cust, total, d } of lastMonth) {
    await createOrder({ customerId: C[cust], userId: staff.id, status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(d), pickedUpAt: daysAgo(d - 7), frameIdx: 0 });
  }
  console.log("✅ Historical orders (5)");

  // ── Phase 2 seed records ──────────────────────────────────────────────────

  // Family group + linked customers
  const andersonFamily = await prisma.family.create({ data: { name: "The Anderson Family" } });
  const andersonPrimary = await prisma.customer.create({
    data: { firstName: "Claire", lastName: "Anderson", phone: "4165550201", isActive: true, familyId: andersonFamily.id },
  });
  const andersonMember = await prisma.customer.create({
    data: { firstName: "Mark", lastName: "Anderson", phone: "4165550201", isActive: true, familyId: andersonFamily.id },
  });
  console.log(`✅ Family group: ${andersonFamily.name} (${andersonPrimary.lastName}, ${andersonMember.lastName})`);

  // No-email customer (for invoice email button tests)
  const noEmailCustomer = await prisma.customer.create({
    data: { firstName: "Paul", lastName: "Fletcher", phone: "4165550202", isActive: true },
  });
  console.log(`✅ No-email customer: ${noEmailCustomer.firstName} ${noEmailCustomer.lastName}`);

  // Dual-invoice order
  const dualInvoiceOrder = await prisma.order.create({
    data: {
      orderNumber: nextNum(),
      customerId: C["Okafor"],
      userId: admin.id,
      type: "GLASSES" as any,
      status: "CONFIRMED" as any,
      isDualInvoice: true,
      totalReal: 500,
      totalCustomer: 650,
      depositReal: 200,
      depositCustomer: 260,
      balanceReal: 300,
      balanceCustomer: 390,
      createdAt: daysAgo(2),
      lineItems: {
        create: [{
          type: "FRAME" as any,
          description: "Ray-Ban RB5154 (dual invoice test)",
          quantity: 1,
          unitPriceReal: 200,
          unitPriceCustomer: 285,
          totalReal: 200,
          totalCustomer: 285,
        }],
      },
    },
  });
  console.log(`✅ Dual-invoice order: ${dualInvoiceOrder.orderNumber}`);

  // Issue invoices for the dual-invoice order (customer + internal types)
  await prisma.invoice.create({
    data: { orderId: dualInvoiceOrder.id, type: "CUSTOMER" as any, generatedAt: new Date() },
  });
  await prisma.invoice.create({
    data: { orderId: dualInvoiceOrder.id, type: "INTERNAL" as any, generatedAt: new Date() },
  });

  // Standard (non-dual) order — use existing okafor order id as reference
  // okafor.isDualInvoice is false (default), already created above

  // Received PO with ≥2 received line items
  const receivedPo = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-TEST-RCV",
      vendorId: vendor.id,
      createdBy: admin.id,
      status: "RECEIVED" as any,
      receivedAt: daysAgo(3),
      total: 410,
      subtotal: 410,
      shipping: 0,
      duties: 0,
      lineItems: {
        create: [
          {
            inventoryItemId: invIds["OX8046-SAT"],
            quantityOrdered: 2,
            quantityReceived: 2,
            unitCost: 90,
          },
          {
            inventoryItemId: invIds["MJ440-BLK"],
            quantityOrdered: 2,
            quantityReceived: 2,
            unitCost: 110,
          },
        ],
      },
    },
  });
  console.log(`✅ Received PO: ${receivedPo.poNumber}`);

  // Mark those inventory items as received (update stockQuantity)
  await prisma.inventoryItem.update({
    where: { id: invIds["OX8046-SAT"] },
    data: { stockQuantity: { increment: 2 }, firstReceivedAt: daysAgo(3) },
  });
  await prisma.inventoryItem.update({
    where: { id: invIds["MJ440-BLK"] },
    data: { stockQuantity: { increment: 2 }, firstReceivedAt: daysAgo(3) },
  });

  // SavedFrame with past expectedReturnDate (for follow-ups dashboard)
  const frameWithReturn = await (prisma as any).savedFrame.create({
    data: {
      customerId: C["Tremblay"],
      brand: "Oakley",
      model: "OX8046",
      color: "Satin Black",
      expectedReturnDate: daysAgo(5),
    },
  });
  console.log(`✅ Saved frame with return date: ${frameWithReturn.id}`);

  // Upcoming styling appointment within 7 days
  function daysFromNow(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  const stylingAppt = await (prisma as any).appointment.create({
    data: {
      customerId: C["Gagnon"],
      type: "STYLING",
      status: "SCHEDULED",
      scheduledAt: daysFromNow(3),
      duration: 45,
    },
  });
  console.log(`✅ Styling appointment: ${stylingAppt.id} (in 3 days)`);

  // ── Export key IDs for tests to use ───────────────────────────────────────
  // Write test fixtures to a JSON file so tests can reference exact IDs
  const testFixtures = {
    adminId: admin.id,
    staffId: staff.id,
    customerIds: C,
    inventoryIds: invIds,
    orderId: {
      tremblay: tremblay.id,
      okafor: okafor.id,
    },
    vendorId: vendor.id,
    poId: po.id,
    invoiceId: invoice.id,
    notificationId: notification.id,
    // Phase 2 fixtures
    withFamilyCustomerId: andersonPrimary.id,
    familyMemberCustomerId: andersonMember.id,
    familyId: andersonFamily.id,
    noEmailCustomerId: noEmailCustomer.id,
    dualInvoiceOrderId: dualInvoiceOrder.id,
    standardOrderId: okafor.id,
    receivedPoId: receivedPo.id,
    frameWithReturnDateId: frameWithReturn.id,
    stylingAppointmentId: stylingAppt.id,
    // Work order auto-generate test orders
    confirmedGlassesOrderId: confirmedGlassesOrder.id,
    confirmedExamOrderId: confirmedExamOrder.id,
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "./e2e/helpers/test-fixtures.json",
    JSON.stringify(testFixtures, null, 2)
  );
  console.log("✅ Test fixtures written to e2e/helpers/test-fixtures.json");

  // ── Client Portal seed ─────────────────────────────────────────────────────

  // Enable portal on Anderson family
  await prisma.family.update({
    where: { id: andersonFamily.id },
    data: { portalEnabled: true },
  });

  // Create client portal account with password "Portal123!"
  const portalPasswordHash = await bcrypt.hash("Portal123!", 10);
  const clientAccount = await prisma.clientAccount.create({
    data: {
      email: "portal@mintvisionsoptique.com",
      familyId: andersonFamily.id,
      primaryCustomerId: andersonPrimary.id,
      passwordHash: portalPasswordHash,
      isActive: true,
    },
  });
  console.log(`✅ Client portal account: ${clientAccount.email}`);

  // Create unlock cards for Anderson family
  await prisma.unlockCard.create({
    data: {
      familyId: andersonFamily.id,
      type: "WELCOME",
      title: "Welcome Badge",
      description: "Welcome to Mint Vision Optique!",
      status: "UNLOCKED",
      unlockedAt: daysAgo(1),
      unlockedBy: "system",
    },
  });
  await prisma.unlockCard.create({
    data: {
      familyId: andersonFamily.id,
      type: "STYLE_CREDIT",
      title: "Style Quiz Reward",
      description: "Complete your Style ID quiz to unlock",
      status: "LOCKED",
      value: 25,
      valueType: "FREEBIE",
      triggerRule: { type: "STYLE_QUIZ_COMPLETED" },
    },
  });
  console.log("✅ Client portal unlock cards");

  console.log("\n✅ E2E seed complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ E2E seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
