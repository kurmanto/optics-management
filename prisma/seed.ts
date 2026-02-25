/**
 * Seed script — admin user + demo dashboard data
 * Safe to re-run (uses upsert / skips duplicates).
 */

import {
  PrismaClient,
  UserRole,
  OrderStatus,
  OrderType,
  LineItemType,
  ExamType,
  FormTemplateType,
  MessageChannel,
  CampaignType,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

// ── date helpers ─────────────────────────────────────────

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── main ─────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Admin user ──
  const adminHash = await bcrypt.hash("changeme123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@mintvisionsoptique.com" },
    update: {},
    create: {
      email: "admin@mintvisionsoptique.com",
      name: "Alex Dumont",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      mustChangePassword: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ── Staff user ──
  const staffHash = await bcrypt.hash("staff1234", 10);
  const staff = await prisma.user.upsert({
    where: { email: "staff@mintvisionsoptique.com" },
    update: {},
    create: {
      email: "staff@mintvisionsoptique.com",
      name: "Sarah Chen",
      passwordHash: staffHash,
      role: UserRole.STAFF,
    },
  });
  console.log(`✅ Staff:  ${staff.email} (password: staff1234)`);

  // ── System settings ──
  const settings = [
    { key: "tax_rate",            value: "0.13" },
    { key: "business_name",       value: "Mint Vision Optique" },
    { key: "business_phone",      value: "" },
    { key: "business_email",      value: "" },
    { key: "business_address",    value: "" },
    { key: "invoice_notes",       value: "Thank you for choosing Mint Vision Optique!" },
    { key: "daily_revenue_goal",   value: "2500" },
    { key: "monthly_revenue_goal", value: "40000" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log("✅ System settings");

  // ── Form Templates ──
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
    {
      type: FormTemplateType.UNIFIED_INTAKE,
      name: "Unified Intake Form",
      description: "Single-page intake with check-in, contact, and multi-patient blocks.",
    },
  ];

  for (const t of formTemplates) {
    const existing = await prisma.formTemplate.findFirst({ where: { type: t.type } });
    if (!existing) {
      await prisma.formTemplate.create({ data: t });
    }
  }
  console.log("✅ Form templates (4)");

  // ── Customers ──
  const customerDefs = [
    // Incomplete-order patients
    { firstName: "Marie",     lastName: "Tremblay",  phone: "5145550101" },
    { firstName: "James",     lastName: "Okafor",    phone: "4165550102" },
    { firstName: "Isabelle",  lastName: "Gagnon",    phone: "5145550103" },
    // Exam-no-purchase patients
    { firstName: "David",     lastName: "Nguyen",    phone: "6135550104" },
    { firstName: "Priya",     lastName: "Patel",     phone: "4165550105" },
    { firstName: "Luca",      lastName: "Rossi",     phone: "5145550106" },
    // Recall candidates
    { firstName: "Carole",    lastName: "Beauchamp", phone: "4185550107" },
    { firstName: "Ahmed",     lastName: "Hassan",    phone: "6135550108" },
    // CL drop-offs
    { firstName: "Sophie",    lastName: "Larouche",  phone: "5145550109" },
    { firstName: "Ryan",      lastName: "Mitchell",  phone: "4165550110" },
    // General patients
    { firstName: "Emma",      lastName: "Wilson",    phone: "4165550111" },
    { firstName: "Noah",      lastName: "Martin",    phone: "5145550112" },
    { firstName: "Olivia",    lastName: "Johnson",   phone: "6135550113" },
    { firstName: "William",   lastName: "Brown",     phone: "4185550114" },
    { firstName: "Ava",       lastName: "Davis",     phone: "5145550115" },
    { firstName: "Benjamin",  lastName: "Côté",      phone: "4165550116" },
    { firstName: "Mia",       lastName: "Taylor",    phone: "6135550117" },
    { firstName: "Étienne",   lastName: "Leblanc",   phone: "5145550118" },
    { firstName: "Charlotte", lastName: "Moore",     phone: "4165550119" },
    { firstName: "Louis",     lastName: "Bouchard",  phone: "5145550120" },
  ];

  const C: Record<string, string> = {}; // lastName → customerId
  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    C[c.lastName] = existing
      ? existing.id
      : (await prisma.customer.create({ data: { ...c, isActive: true } })).id;
  }
  console.log(`✅ ${customerDefs.length} customers`);

  // ── Inventory ──
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

  const invIds: string[] = [];
  for (const f of frameDefs) {
    const existing = await prisma.inventoryItem.findFirst({ where: { sku: f.sku } });
    invIds.push(
      existing
        ? existing.id
        : (await prisma.inventoryItem.create({ data: { ...f, stockQuantity: 5, reorderPoint: 2 } })).id
    );
  }
  console.log(`✅ ${frameDefs.length} inventory items`);

  // ── Order helpers ──
  let seq = 200;
  const nextNum = () => `ORD-2026-${String(++seq).padStart(4, "0")}`;

  async function createGlassesOrder(opts: {
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
    const { customerId, userId, type = OrderType.GLASSES, status,
      totalReal, depositReal = totalReal, createdAt, pickedUpAt,
      frameIdx = 0, withLens = true } = opts;

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
            { type: LineItemType.FRAME, description: `${f.brand} ${f.model}`, quantity: 1,
              unitPriceReal: frameInternal, unitPriceCustomer: f.retailPrice,
              totalReal: frameInternal, totalCustomer: f.retailPrice },
            ...(withLens && lensInternal > 0 ? [{
              type: LineItemType.LENS, description: "Progressive + AR coating", quantity: 1,
              unitPriceReal: lensInternal, unitPriceCustomer: Math.round(lensInternal * 1.15),
              totalReal: lensInternal, totalCustomer: Math.round(lensInternal * 1.15),
            }] : []),
          ],
        },
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // TODAY'S ORDERS — feeds the scoreboard
  // ════════════════════════════════════════════════════════
  await createGlassesOrder({ customerId: C["Wilson"],  userId: staff.id, status: OrderStatus.CONFIRMED, totalReal: 780, createdAt: todayAt(9),  frameIdx: 0 });
  await createGlassesOrder({ customerId: C["Martin"],  userId: staff.id, status: OrderStatus.CONFIRMED, totalReal: 620, createdAt: todayAt(11), frameIdx: 2 });
  await createGlassesOrder({ customerId: C["Johnson"], userId: admin.id, status: OrderStatus.CONFIRMED, totalReal: 1150, createdAt: todayAt(14), frameIdx: 5 });
  console.log("✅ Today's orders (3 — total: $2,550)");

  // ════════════════════════════════════════════════════════
  // INCOMPLETE ORDERS — deposit taken, not picked up
  // ════════════════════════════════════════════════════════
  await createGlassesOrder({ customerId: C["Tremblay"], userId: staff.id, status: OrderStatus.LAB_RECEIVED, totalReal: 920, depositReal: 400, createdAt: daysAgo(18), frameIdx: 3 });
  await createGlassesOrder({ customerId: C["Okafor"],   userId: admin.id, status: OrderStatus.READY,        totalReal: 640, depositReal: 300, createdAt: daysAgo(12), frameIdx: 1 });
  await createGlassesOrder({ customerId: C["Gagnon"],   userId: staff.id, status: OrderStatus.LAB_ORDERED,  totalReal: 530, depositReal: 250, createdAt: daysAgo(8),  frameIdx: 7, type: OrderType.SUNGLASSES, withLens: false });
  console.log("✅ Incomplete orders (3)");

  // ════════════════════════════════════════════════════════
  // EXAMS WITHOUT PURCHASES
  // ════════════════════════════════════════════════════════
  await prisma.exam.create({ data: { customerId: C["Nguyen"], examDate: daysAgo(10), examType: ExamType.COMPREHENSIVE, doctorName: "Dr. Lefebvre" } });
  await prisma.exam.create({ data: { customerId: C["Patel"],  examDate: daysAgo(22), examType: ExamType.COMPREHENSIVE, doctorName: "Dr. Lefebvre" } });
  await prisma.exam.create({ data: { customerId: C["Rossi"],  examDate: daysAgo(45), examType: ExamType.CONTACT_LENS,  doctorName: "Dr. Lefebvre" } });
  console.log("✅ Exams without purchase (3)");

  // ════════════════════════════════════════════════════════
  // RECALL CANDIDATES — last exam 12–24 months ago
  // ════════════════════════════════════════════════════════
  await prisma.exam.create({ data: { customerId: C["Beauchamp"], examDate: monthsAgo(16), examType: ExamType.COMPREHENSIVE, doctorName: "Dr. Lefebvre" } });
  await prisma.exam.create({ data: { customerId: C["Hassan"],    examDate: monthsAgo(20), examType: ExamType.COMPREHENSIVE, doctorName: "Dr. Lefebvre" } });
  console.log("✅ Recall candidates (2)");

  // ════════════════════════════════════════════════════════
  // CONTACT LENS DROP-OFFS — last CL order 100+ days ago
  // ════════════════════════════════════════════════════════
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
        lineItems: { create: [{ type: LineItemType.CONTACT_LENS, description: "Dailies Total 1 (90pk × 2)", quantity: 2, unitPriceReal: 140, unitPriceCustomer: 155, totalReal: 280, totalCustomer: 310 }] },
      },
    });
  }
  console.log("✅ Contact lens drop-offs (2)");

  // ════════════════════════════════════════════════════════
  // CONVERSION PAIRS — exam + purchase within 90 days
  // ════════════════════════════════════════════════════════
  const conversions = [
    { cust: "Brown",   examD: 60, orderD: 55, total: 680, fi: 4 },
    { cust: "Davis",   examD: 50, orderD: 47, total: 790, fi: 2 },
    { cust: "Côté",    examD: 35, orderD: 31, total: 920, fi: 6 },
    { cust: "Taylor",  examD: 20, orderD: 17, total: 650, fi: 0 },
    { cust: "Leblanc", examD: 14, orderD: 11, total: 1100, fi: 5 },
  ];
  for (const { cust, examD, orderD, total, fi } of conversions) {
    await prisma.exam.create({ data: { customerId: C[cust], examDate: daysAgo(examD), examType: ExamType.COMPREHENSIVE, doctorName: "Dr. Lefebvre" } });
    await createGlassesOrder({ customerId: C[cust], userId: pick([admin.id, staff.id]), status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(orderD), pickedUpAt: daysAgo(orderD - 8), frameIdx: fi });
  }
  console.log("✅ Exam→purchase conversion pairs (5)");

  // ════════════════════════════════════════════════════════
  // THIS MONTH — additional glasses orders
  // ════════════════════════════════════════════════════════
  const thisMonth = [
    { cust: "Moore",    total: 840,  d: 3,  fi: 4 },
    { cust: "Bouchard", total: 1240, d: 5,  fi: 6 },
    { cust: "Wilson",   total: 590,  d: 7,  fi: 0 },
    { cust: "Martin",   total: 980,  d: 9,  fi: 2 },
    { cust: "Johnson",  total: 720,  d: 11, fi: 3 },
  ];
  for (const { cust, total, d, fi } of thisMonth) {
    await createGlassesOrder({ customerId: C[cust], userId: pick([admin.id, staff.id]), status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(d), pickedUpAt: daysAgo(d - 7), frameIdx: fi });
  }
  console.log("✅ This-month orders (5)");

  // ════════════════════════════════════════════════════════
  // LAST MONTH — for MoM comparison
  // ════════════════════════════════════════════════════════
  const lastMonth = [
    { cust: "Brown",    total: 680,  d: 38 },
    { cust: "Davis",    total: 1050, d: 41 },
    { cust: "Côté",     total: 760,  d: 44 },
    { cust: "Taylor",   total: 890,  d: 47 },
    { cust: "Leblanc",  total: 1300, d: 50 },
    { cust: "Moore",    total: 580,  d: 53 },
    { cust: "Bouchard", total: 940,  d: 56 },
  ];
  for (const { cust, total, d } of lastMonth) {
    await createGlassesOrder({ customerId: C[cust], userId: pick([admin.id, staff.id]), status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(d), pickedUpAt: daysAgo(d - 7), frameIdx: Math.floor(Math.random() * frameDefs.length) });
  }
  console.log("✅ Last-month orders (7)");

  // ════════════════════════════════════════════════════════
  // LAST YEAR — for YoY comparison
  // ════════════════════════════════════════════════════════
  const lastYear = [
    { cust: "Wilson",  total: 720,  d: 360 },
    { cust: "Martin",  total: 890,  d: 365 },
    { cust: "Johnson", total: 1100, d: 370 },
    { cust: "Brown",   total: 640,  d: 375 },
    { cust: "Davis",   total: 830,  d: 380 },
  ];
  for (const { cust, total, d } of lastYear) {
    await createGlassesOrder({ customerId: C[cust], userId: pick([admin.id, staff.id]), status: OrderStatus.PICKED_UP, totalReal: total, createdAt: daysAgo(d), pickedUpAt: daysAgo(d - 8), frameIdx: Math.floor(Math.random() * frameDefs.length) });
  }
  console.log("✅ Last-year orders (5)");

  // ════════════════════════════════════════════════════════
  // SUNGLASSES + CONTACTS (category breakdown)
  // ════════════════════════════════════════════════════════
  await prisma.order.create({
    data: {
      orderNumber: nextNum(), customerId: C["Taylor"], userId: staff.id,
      type: OrderType.SUNGLASSES, status: OrderStatus.PICKED_UP,
      totalReal: 480, totalCustomer: 530, depositReal: 480, depositCustomer: 530, balanceReal: 0, balanceCustomer: 0,
      createdAt: daysAgo(25), pickedUpAt: daysAgo(20), updatedAt: daysAgo(20),
      lineItems: { create: [{ type: LineItemType.FRAME, description: "Ray-Ban RB3025 Aviator", quantity: 1, unitPriceReal: 480, unitPriceCustomer: 530, totalReal: 480, totalCustomer: 530 }] },
    },
  });
  await prisma.order.create({
    data: {
      orderNumber: nextNum(), customerId: C["Brown"], userId: staff.id,
      type: OrderType.CONTACTS, status: OrderStatus.PICKED_UP,
      totalReal: 240, totalCustomer: 265, depositReal: 240, depositCustomer: 265, balanceReal: 0, balanceCustomer: 0,
      createdAt: daysAgo(30), pickedUpAt: daysAgo(28), updatedAt: daysAgo(28),
      lineItems: { create: [{ type: LineItemType.CONTACT_LENS, description: "Acuvue Oasys (6pk × 2)", quantity: 2, unitPriceReal: 120, unitPriceCustomer: 132, totalReal: 240, totalCustomer: 265 }] },
    },
  });
  console.log("✅ Category orders (sunglasses + contacts)");

  // ════════════════════════════════════════════════════════
  // MULTI-FRAME ORDER (avg frames/tx metric)
  // ════════════════════════════════════════════════════════
  await prisma.order.create({
    data: {
      orderNumber: nextNum(), customerId: C["Wilson"], userId: admin.id,
      type: OrderType.GLASSES, status: OrderStatus.PICKED_UP,
      totalReal: 1580, totalCustomer: 1820, depositReal: 1580, depositCustomer: 1820, balanceReal: 0, balanceCustomer: 0,
      frameBrand: "Ray-Ban", frameModel: "RB5154 + Persol PO3007V", frameWholesale: 185,
      createdAt: daysAgo(45), pickedUpAt: daysAgo(37), updatedAt: daysAgo(37),
      lineItems: {
        create: [
          { type: LineItemType.FRAME, description: "Ray-Ban RB5154 (everyday)",  quantity: 1, unitPriceReal: 102,  unitPriceCustomer: 285, totalReal: 102, totalCustomer: 285 },
          { type: LineItemType.FRAME, description: "Persol PO3007V (backup)",    quantity: 1, unitPriceReal: 120,  unitPriceCustomer: 350, totalReal: 120, totalCustomer: 350 },
          { type: LineItemType.LENS,  description: "Progressive + AR × 2 pairs", quantity: 2, unitPriceReal: 679,  unitPriceCustomer: 593, totalReal: 1358, totalCustomer: 1185 },
        ],
      },
    },
  });
  console.log("✅ Multi-frame order (2 frames)");

  // ════════════════════════════════════════════════════════
  // MESSAGE TEMPLATES
  // ════════════════════════════════════════════════════════
  const defaultTemplates: {
    name: string;
    channel: MessageChannel;
    campaignType: CampaignType;
    subject?: string;
    body: string;
    isDefault: boolean;
  }[] = [
    {
      name: "Exam Reminder — SMS",
      channel: MessageChannel.SMS,
      campaignType: CampaignType.EXAM_REMINDER,
      body: "Hi {{firstName}}! It's been about a year since your last eye exam at {{storeName}}. Keep your vision sharp — book your annual exam today. Call us at {{storePhone}}.",
      isDefault: true,
    },
    {
      name: "Exam Reminder — Email",
      channel: MessageChannel.EMAIL,
      campaignType: CampaignType.EXAM_REMINDER,
      subject: "Your Annual Eye Exam Reminder — {{storeName}}",
      body: "Dear {{firstName}},\n\nYour last eye exam was about a year ago. Regular eye exams are the best way to catch vision changes early.\n\nBook your appointment today at {{storeName}}.\n\nCall: {{storePhone}}\n\nSee you soon!",
      isDefault: true,
    },
    {
      name: "Walk-in Follow-up — SMS",
      channel: MessageChannel.SMS,
      campaignType: CampaignType.WALKIN_FOLLOWUP,
      body: "Hi {{firstName}}! Thanks for visiting {{storeName}}. Still thinking about those frames? We'd love to help. Call us at {{storePhone}}.",
      isDefault: true,
    },
    {
      name: "Second Pair — Email",
      channel: MessageChannel.EMAIL,
      campaignType: CampaignType.SECOND_PAIR,
      subject: "Protect your backup pair — exclusive second-pair offer",
      body: "Hi {{firstName}},\n\nNow that you're loving your {{frameBrand}} frames, have you thought about a backup pair? As a valued customer, we're offering you a special deal on a second pair.\n\nCall us at {{storePhone}} or stop in at {{storeName}}.",
      isDefault: true,
    },
    {
      name: "Rx Expiry — SMS",
      channel: MessageChannel.SMS,
      campaignType: CampaignType.PRESCRIPTION_EXPIRY,
      body: "Hi {{firstName}}! Your prescription expires on {{rxExpiryDate}}. Book your eye exam soon to stay current. Call {{storeName}} at {{storePhone}}.",
      isDefault: true,
    },
    {
      name: "Abandonment Recovery — SMS",
      channel: MessageChannel.SMS,
      campaignType: CampaignType.ABANDONMENT_RECOVERY,
      body: "Hi {{firstName}}! Still thinking about your visit to {{storeName}}? We'd love to help you find the perfect pair. Call us at {{storePhone}}.",
      isDefault: true,
    },
    {
      name: "Post-Purchase Referral — SMS",
      channel: MessageChannel.SMS,
      campaignType: CampaignType.POST_PURCHASE_REFERRAL,
      body: "Hi {{firstName}}! Loving your new frames? Refer a friend to {{storeName}} and you both get a reward. Ask us for details at {{storePhone}}.",
      isDefault: true,
    },
    {
      name: "VIP Insider — Email",
      channel: MessageChannel.EMAIL,
      campaignType: CampaignType.VIP_INSIDER,
      subject: "You're a VIP at {{storeName}} — exclusive access inside",
      body: "Dear {{firstName}},\n\nAs one of our most valued customers, you get first access to new arrivals and exclusive offers.\n\nCall {{storePhone}} for personalized assistance.",
      isDefault: true,
    },
    {
      name: "Birthday — SMS",
      channel: MessageChannel.SMS,
      campaignType: CampaignType.BIRTHDAY_ANNIVERSARY,
      body: "Happy Birthday {{firstName}}! As a gift from {{storeName}}, enjoy a special birthday treat on your next visit. Call us at {{storePhone}}!",
      isDefault: true,
    },
    {
      name: "Dormant Reactivation — Email",
      channel: MessageChannel.EMAIL,
      campaignType: CampaignType.DORMANT_REACTIVATION,
      subject: "We miss you, {{firstName}} — come back to {{storeName}}",
      body: "Hi {{firstName}},\n\nIt's been a while since we've seen you at {{storeName}}! A lot has changed — new frames, new technology, and the same great service.\n\nWe'd love to welcome you back. Call {{storePhone}} or stop in anytime.",
      isDefault: true,
    },
    {
      name: "Insurance Maximization — Email",
      channel: MessageChannel.EMAIL,
      campaignType: CampaignType.INSURANCE_MAXIMIZATION,
      subject: "Use your {{insuranceProvider}} benefits before they expire",
      body: "Dear {{firstName}},\n\nYour {{insuranceProvider}} vision benefits renew in {{insuranceRenewalMonth}}. Don't let unused benefits go to waste!\n\nBook your eye exam and choose new frames before your benefits reset. Call {{storeName}} at {{storePhone}}.",
      isDefault: true,
    },
  ];

  for (const template of defaultTemplates) {
    const existing = await prisma.messageTemplate.findFirst({
      where: { name: template.name },
    });
    if (!existing) {
      await prisma.messageTemplate.create({ data: template });
    }
  }
  console.log(`✅ Message templates (${defaultTemplates.length})`);

  // ════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════
  console.log("\n🎉 Seeding complete!\n");
  console.log("Login credentials:");
  console.log("  Admin: admin@mintvisionsoptique.com / changeme123");
  console.log("  Staff: staff@mintvisionsoptique.com / staff1234\n");
  console.log("Dashboard will show:");
  console.log("  📊 Scoreboard:      $2,550 revenue today (3 orders, $850 avg ticket)");
  console.log("  🟡 Opportunities:   3 incomplete, 3 exam-no-purchase, 2 recall, 2 CL drop-off");
  console.log("  📈 Conversion:      5 exam→purchase pairs, 1 multi-frame order");
  console.log("  👑 Admin section:   MoM + YoY growth, category breakdown, fulfillment speed");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
