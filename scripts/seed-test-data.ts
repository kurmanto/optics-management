/**
 * Test Data Seed Script
 *
 * Populates the database with realistic test data for all V1 entities.
 *
 * Usage:
 *   npx tsx scripts/seed-test-data.ts
 *
 * Creates:
 *   - 3 staff users
 *   - 4 families
 *   - 12 customers
 *   - 8 prescriptions
 *   - 20 inventory items (frames + contacts)
 *   - 6 insurance policies
 *   - 10 orders (mix of all statuses)
 *   - line items, payments, status history per order
 */

import "dotenv/config";
import { PrismaClient, OrderStatus, OrderType, LineItemType, PaymentMethod, FrameCategory, FrameGender, RimType, PrescriptionType, Gender, UserRole, CoverageType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

function cuid() {
  return require("crypto").randomUUID().replace(/-/g, "");
}

function orderNumber(n: number) {
  return `ORD-2026-${String(n).padStart(3, "0")}`;
}

async function main() {
  console.log("🌱 Seeding test data...\n");

  // ── Staff Users ──────────────────────────────────────────────────────────
  console.log("👤 Creating staff users...");
  const passwordHash = await bcrypt.hash("staff123", 12);

  const sarah = await prisma.user.upsert({
    where: { email: "sarah@mintvisionsoptique.com" },
    update: {},
    create: {
      email: "sarah@mintvisionsoptique.com",
      name: "Sarah Leblanc",
      passwordHash,
      role: UserRole.STAFF,
      mustChangePassword: false,
    },
  });

  const mike = await prisma.user.upsert({
    where: { email: "mike@mintvisionsoptique.com" },
    update: {},
    create: {
      email: "mike@mintvisionsoptique.com",
      name: "Mike Tran",
      passwordHash,
      role: UserRole.STAFF,
      mustChangePassword: false,
    },
  });

  const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  const staffUser = admin || sarah;

  console.log("  ✅ 2 staff users (password: staff123)");

  // ── Families ─────────────────────────────────────────────────────────────
  console.log("👨‍👩‍👧 Creating families...");

  const familyRossi = await prisma.family.create({ data: { name: "Rossi" } });
  const familyPark = await prisma.family.create({ data: { name: "Park" } });
  const familyOkonkwo = await prisma.family.create({ data: { name: "Okonkwo" } });

  console.log("  ✅ 3 families");

  // ── Customers ─────────────────────────────────────────────────────────────
  console.log("👥 Creating customers...");

  const marco = await prisma.customer.create({
    data: {
      firstName: "Marco",
      lastName: "Rossi",
      email: "marco.rossi@gmail.com",
      phone: "4165550101",
      dateOfBirth: new Date("1982-03-15"),
      gender: Gender.MALE,
      address: "142 Queen St W",
      city: "Toronto",
      province: "ON",
      postalCode: "M5H 2N3",
      familyId: familyRossi.id,
      smsOptIn: true,
      emailOptIn: true,
      tags: ["VIP"],
    },
  });

  const giulia = await prisma.customer.create({
    data: {
      firstName: "Giulia",
      lastName: "Rossi",
      email: "giulia.rossi@gmail.com",
      phone: "4165550102",
      dateOfBirth: new Date("1985-07-22"),
      gender: Gender.FEMALE,
      address: "142 Queen St W",
      city: "Toronto",
      province: "ON",
      postalCode: "M5H 2N3",
      familyId: familyRossi.id,
      smsOptIn: true,
      emailOptIn: false,
    },
  });

  const jisoo = await prisma.customer.create({
    data: {
      firstName: "Jisoo",
      lastName: "Park",
      email: "jisoo.park@outlook.com",
      phone: "6475550201",
      dateOfBirth: new Date("1990-11-08"),
      gender: Gender.FEMALE,
      address: "88 Bloor St W, Unit 4",
      city: "Toronto",
      province: "ON",
      postalCode: "M5S 1M3",
      familyId: familyPark.id,
      smsOptIn: true,
      emailOptIn: true,
      tags: ["Insurance Gaming"],
    },
  });

  const hyun = await prisma.customer.create({
    data: {
      firstName: "Hyun",
      lastName: "Park",
      email: "hyun.park@outlook.com",
      phone: "6475550202",
      dateOfBirth: new Date("1988-04-30"),
      gender: Gender.MALE,
      address: "88 Bloor St W, Unit 4",
      city: "Toronto",
      province: "ON",
      postalCode: "M5S 1M3",
      familyId: familyPark.id,
      smsOptIn: false,
      emailOptIn: true,
    },
  });

  const chidi = await prisma.customer.create({
    data: {
      firstName: "Chidi",
      lastName: "Okonkwo",
      email: "chidi.okonkwo@gmail.com",
      phone: "4375550301",
      dateOfBirth: new Date("1975-01-20"),
      gender: Gender.MALE,
      address: "55 Yonge St",
      city: "Toronto",
      province: "ON",
      postalCode: "M5E 1J4",
      familyId: familyOkonkwo.id,
      smsOptIn: true,
      emailOptIn: true,
      notes: "Prefers to be called Dr. Okonkwo",
      tags: ["VIP"],
    },
  });

  const amara = await prisma.customer.create({
    data: {
      firstName: "Amara",
      lastName: "Okonkwo",
      email: "amara.okonkwo@gmail.com",
      phone: "4375550302",
      dateOfBirth: new Date("2008-09-14"),
      gender: Gender.FEMALE,
      city: "Toronto",
      province: "ON",
      familyId: familyOkonkwo.id,
      smsOptIn: false,
      emailOptIn: false,
      notes: "Minor — parent consent on file",
    },
  });

  const sophie = await prisma.customer.create({
    data: {
      firstName: "Sophie",
      lastName: "Tremblay",
      email: "sophie.t@hotmail.com",
      phone: "4165550401",
      dateOfBirth: new Date("1995-06-03"),
      gender: Gender.FEMALE,
      city: "Toronto",
      province: "ON",
      postalCode: "M4Y 1X5",
      smsOptIn: true,
      emailOptIn: true,
    },
  });

  const david = await prisma.customer.create({
    data: {
      firstName: "David",
      lastName: "Chen",
      email: "dchen@rogers.com",
      phone: "6475550501",
      dateOfBirth: new Date("1968-12-25"),
      gender: Gender.MALE,
      address: "210 Dundas St W",
      city: "Toronto",
      province: "ON",
      postalCode: "M5T 1G4",
      smsOptIn: false,
      emailOptIn: false,
      notes: "Prefers phone calls. Hard of hearing — speak clearly.",
      tags: ["VIP"],
    },
  });

  const priya = await prisma.customer.create({
    data: {
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@gmail.com",
      phone: "9055550601",
      dateOfBirth: new Date("1993-08-17"),
      gender: Gender.FEMALE,
      city: "Mississauga",
      province: "ON",
      postalCode: "L5B 3C1",
      smsOptIn: true,
      emailOptIn: true,
    },
  });

  const liam = await prisma.customer.create({
    data: {
      firstName: "Liam",
      lastName: "O'Brien",
      email: "lobrien@gmail.com",
      phone: "4165550701",
      dateOfBirth: new Date("2001-02-11"),
      gender: Gender.MALE,
      city: "Toronto",
      province: "ON",
      postalCode: "M6G 2A1",
      smsOptIn: true,
      emailOptIn: true,
    },
  });

  console.log("  ✅ 10 customers");

  // ── Insurance Policies ───────────────────────────────────────────────────
  console.log("🏥 Creating insurance policies...");

  const marcoInsurance = await prisma.insurancePolicy.create({
    data: {
      customerId: marco.id,
      providerName: "Sun Life",
      policyNumber: "SL-4829301",
      groupNumber: "GRP-10042",
      coverageType: CoverageType.EXTENDED_HEALTH,
      renewalMonth: 1,
      renewalYear: 2026,
      maxFrames: 300,
      maxLenses: 250,
      maxExam: 80,
      isActive: true,
    },
  });

  const jisooInsurance = await prisma.insurancePolicy.create({
    data: {
      customerId: jisoo.id,
      providerName: "Green Shield",
      policyNumber: "GSC-7712840",
      coverageType: CoverageType.COMBINED,
      renewalMonth: 3,
      renewalYear: 2026,
      maxFrames: 400,
      maxLenses: 300,
      maxContacts: 200,
      maxExam: 100,
      isActive: true,
    },
  });

  const chidiInsurance = await prisma.insurancePolicy.create({
    data: {
      customerId: chidi.id,
      providerName: "Manulife",
      policyNumber: "MFC-3391047",
      coverageType: CoverageType.EXTENDED_HEALTH,
      renewalMonth: 6,
      renewalYear: 2026,
      maxFrames: 350,
      maxLenses: 200,
      maxExam: 80,
      isActive: true,
    },
  });

  console.log("  ✅ 3 insurance policies");

  // ── Prescriptions ────────────────────────────────────────────────────────
  console.log("👓 Creating prescriptions...");

  const marcoRx = await prisma.prescription.create({
    data: {
      customerId: marco.id,
      type: PrescriptionType.GLASSES,
      date: new Date("2025-11-10"),
      odSphere: -2.25,
      odCylinder: -0.75,
      odAxis: 180,
      odPd: 32.5,
      osSphere: -2.0,
      osCylinder: -0.5,
      osAxis: 175,
      osPd: 32.5,
      pdBinocular: 65.0,
      doctorName: "Dr. Amir Hashemi",
      isActive: true,
    },
  });

  const giuliaRx = await prisma.prescription.create({
    data: {
      customerId: giulia.id,
      type: PrescriptionType.GLASSES,
      date: new Date("2025-10-05"),
      odSphere: 1.5,
      odCylinder: -0.25,
      odAxis: 90,
      odAdd: 1.0,
      odPd: 31.0,
      osSphere: 1.25,
      osCylinder: -0.5,
      osAxis: 85,
      osAdd: 1.0,
      osPd: 31.0,
      pdBinocular: 62.0,
      doctorName: "Dr. Amir Hashemi",
      isActive: true,
    },
  });

  const jisooRx = await prisma.prescription.create({
    data: {
      customerId: jisoo.id,
      type: PrescriptionType.CONTACTS,
      date: new Date("2025-12-01"),
      odSphere: -3.5,
      odBc: 8.6,
      odDia: 14.2,
      osSphere: -3.75,
      osBc: 8.6,
      osDia: 14.2,
      doctorName: "Dr. Linda Nguyen",
      isActive: true,
    },
  });

  const chidiRx = await prisma.prescription.create({
    data: {
      customerId: chidi.id,
      type: PrescriptionType.GLASSES,
      date: new Date("2025-09-20"),
      odSphere: -4.0,
      odCylinder: -1.25,
      odAxis: 160,
      odAdd: 2.0,
      odPd: 33.0,
      osSphere: -3.75,
      osCylinder: -1.0,
      osAxis: 155,
      osAdd: 2.0,
      osPd: 33.0,
      pdBinocular: 66.0,
      doctorName: "Dr. Samuel Adeyemi",
      isActive: true,
    },
  });

  const sophieRx = await prisma.prescription.create({
    data: {
      customerId: sophie.id,
      type: PrescriptionType.GLASSES,
      date: new Date("2026-01-15"),
      odSphere: -1.0,
      odPd: 30.5,
      osSphere: -1.25,
      osAxis: 0,
      osPd: 30.5,
      pdBinocular: 61.0,
      doctorName: "Dr. Linda Nguyen",
      isActive: true,
    },
  });

  const davidRx = await prisma.prescription.create({
    data: {
      customerId: david.id,
      type: PrescriptionType.GLASSES,
      date: new Date("2025-08-12"),
      odSphere: 2.0,
      odCylinder: -0.75,
      odAxis: 95,
      odAdd: 2.5,
      odPd: 34.0,
      osSphere: 2.25,
      osCylinder: -0.5,
      osAxis: 88,
      osAdd: 2.5,
      osPd: 34.0,
      pdBinocular: 68.0,
      doctorName: "Dr. Samuel Adeyemi",
      isActive: true,
    },
  });

  console.log("  ✅ 6 prescriptions");

  // ── Inventory ─────────────────────────────────────────────────────────────
  console.log("🗃️  Creating inventory items...");

  const frames = await Promise.all([
    prisma.inventoryItem.create({
      data: {
        brand: "Ray-Ban",
        model: "RB5154 Clubmaster",
        sku: "RB5154-BK-51",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.UNISEX,
        color: "Black",
        material: "Acetate",
        size: "51-21-145",
        eyeSize: 51,
        bridgeSize: 21,
        templeLength: 145,
        rimType: RimType.FULL_RIM,
        wholesaleCost: 95,
        retailPrice: 249,
        stockQuantity: 4,
        reorderPoint: 2,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Ray-Ban",
        model: "RB3025 Aviator",
        sku: "RB3025-GLD-58",
        category: FrameCategory.SUN,
        gender: FrameGender.UNISEX,
        color: "Gold",
        material: "Metal",
        size: "58-14-135",
        eyeSize: 58,
        bridgeSize: 14,
        templeLength: 135,
        rimType: RimType.FULL_RIM,
        wholesaleCost: 85,
        retailPrice: 229,
        stockQuantity: 6,
        reorderPoint: 2,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Oakley",
        model: "OX8046 Crosslink",
        sku: "OX8046-BK-55",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.MENS,
        color: "Matte Black",
        material: "O-Matter",
        size: "55-18-137",
        eyeSize: 55,
        bridgeSize: 18,
        templeLength: 137,
        rimType: RimType.FULL_RIM,
        wholesaleCost: 110,
        retailPrice: 280,
        stockQuantity: 3,
        reorderPoint: 2,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Silhouette",
        model: "5515 Titan Minimal",
        sku: "SIL5515-GLD-50",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.WOMENS,
        color: "Rose Gold",
        material: "Titanium",
        size: "50-17-135",
        eyeSize: 50,
        bridgeSize: 17,
        templeLength: 135,
        rimType: RimType.RIMLESS,
        wholesaleCost: 180,
        retailPrice: 450,
        stockQuantity: 2,
        reorderPoint: 1,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Tom Ford",
        model: "FT5634-B",
        sku: "TF5634-TRT-54",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.WOMENS,
        color: "Tortoise",
        material: "Acetate",
        size: "54-16-140",
        eyeSize: 54,
        bridgeSize: 16,
        templeLength: 140,
        rimType: RimType.FULL_RIM,
        wholesaleCost: 155,
        retailPrice: 395,
        stockQuantity: 3,
        reorderPoint: 2,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Lindberg",
        model: "1040 Spirit Titanium",
        sku: "LB1040-GRY-52",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.MENS,
        color: "Brushed Grey",
        material: "Titanium",
        size: "52-15-140",
        eyeSize: 52,
        bridgeSize: 15,
        templeLength: 140,
        rimType: RimType.HALF_RIM,
        wholesaleCost: 220,
        retailPrice: 550,
        stockQuantity: 2,
        reorderPoint: 1,
        notes: "Premium — order extra carefully",
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Warby Parker",
        model: "Wilkie",
        sku: "WP-WILKIE-TRT-50",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.UNISEX,
        color: "Tortoise",
        material: "Acetate",
        size: "50-20-145",
        eyeSize: 50,
        bridgeSize: 20,
        templeLength: 145,
        rimType: RimType.FULL_RIM,
        wholesaleCost: 45,
        retailPrice: 145,
        stockQuantity: 8,
        reorderPoint: 3,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Prada",
        model: "PR 14WV",
        sku: "PR14WV-BLK-53",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.WOMENS,
        color: "Black",
        material: "Acetate",
        size: "53-18-140",
        eyeSize: 53,
        bridgeSize: 18,
        templeLength: 140,
        rimType: RimType.FULL_RIM,
        wholesaleCost: 175,
        retailPrice: 420,
        stockQuantity: 2,
        reorderPoint: 1,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Acuvue",
        model: "Oasys 1-Day",
        sku: "ACU-OASYS1D-90",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.UNISEX,
        color: "Clear",
        material: "Silicone Hydrogel",
        wholesaleCost: 55,
        retailPrice: 85,
        stockQuantity: 20,
        reorderPoint: 5,
        notes: "Box of 90 lenses",
      },
    }),
    prisma.inventoryItem.create({
      data: {
        brand: "Acuvue",
        model: "Oasys for Astigmatism",
        sku: "ACU-OASYS-ASTIG-6",
        category: FrameCategory.OPTICAL,
        gender: FrameGender.UNISEX,
        color: "Clear",
        material: "Silicone Hydrogel",
        wholesaleCost: 28,
        retailPrice: 48,
        stockQuantity: 15,
        reorderPoint: 4,
        notes: "Box of 6 lenses",
      },
    }),
  ]);

  console.log("  ✅ 10 inventory items");

  // ── Orders ────────────────────────────────────────────────────────────────
  console.log("📋 Creating orders...");

  // Order 1 — Marco, PICKED_UP, glasses, with insurance
  const order1 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(1),
      customerId: marco.id,
      userId: staffUser.id,
      prescriptionId: marcoRx.id,
      insurancePolicyId: marcoInsurance.id,
      type: OrderType.GLASSES,
      status: OrderStatus.PICKED_UP,
      isDualInvoice: true,
      frameBrand: "Ray-Ban",
      frameModel: "RB5154 Clubmaster",
      frameColor: "Black",
      frameSku: "RB5154-BK-51",
      frameWholesale: 95,
      lensType: "Progressive",
      lensCoating: "Anti-Reflective + Transitions",
      totalCustomer: 549,
      depositCustomer: 300,
      balanceCustomer: 0,
      totalReal: 549,
      depositReal: 549,
      balanceReal: 0,
      dueDate: new Date("2026-01-20"),
      labOrderedAt: new Date("2026-01-05"),
      labReceivedAt: new Date("2026-01-14"),
      readyAt: new Date("2026-01-14"),
      pickedUpAt: new Date("2026-01-21"),
      notes: "Insurance covered $300 on frames + lenses",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Ray-Ban RB5154 Clubmaster - Black",
            quantity: 1,
            unitPriceCustomer: 249,
            unitPriceReal: 249,
            totalCustomer: 249,
            totalReal: 249,
            inventoryItemId: frames[0].id,
          },
          {
            type: LineItemType.LENS,
            description: "Progressive High-Index 1.67",
            quantity: 1,
            unitPriceCustomer: 200,
            unitPriceReal: 200,
            totalCustomer: 200,
            totalReal: 200,
          },
          {
            type: LineItemType.COATING,
            description: "Anti-Reflective + Transitions Gen 8",
            quantity: 1,
            unitPriceCustomer: 100,
            unitPriceReal: 100,
            totalCustomer: 100,
            totalReal: 100,
          },
          {
            type: LineItemType.DISCOUNT,
            description: "Insurance Benefit",
            quantity: 1,
            unitPriceCustomer: -300,
            unitPriceReal: 0,
            totalCustomer: -300,
            totalReal: 0,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, note: "Order created", createdBy: "Sarah Leblanc" },
          { status: OrderStatus.CONFIRMED, note: "Confirmed with customer", createdBy: "Sarah Leblanc" },
          { status: OrderStatus.LAB_ORDERED, note: "Sent to Essilor lab", createdBy: "Mike Tran" },
          { status: OrderStatus.LAB_RECEIVED, note: "Lab returned — lenses look good", createdBy: "Mike Tran" },
          { status: OrderStatus.READY, note: "Adjusted and ready", createdBy: "Sarah Leblanc" },
          { status: OrderStatus.PICKED_UP, note: "Picked up, happy customer", createdBy: "Sarah Leblanc" },
        ],
      },
      payments: {
        create: [
          { amount: 300, method: PaymentMethod.CREDIT_VISA, note: "Deposit at order", paidAt: new Date("2026-01-04") },
          { amount: 249, method: PaymentMethod.DEBIT, note: "Balance on pickup", paidAt: new Date("2026-01-21") },
        ],
      },
    },
  });

  // Order 2 — Giulia, READY
  const order2 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(2),
      customerId: giulia.id,
      userId: sarah.id,
      prescriptionId: giuliaRx.id,
      type: OrderType.GLASSES,
      status: OrderStatus.READY,
      isDualInvoice: false,
      frameBrand: "Silhouette",
      frameModel: "5515 Titan Minimal",
      frameColor: "Rose Gold",
      frameSku: "SIL5515-GLD-50",
      frameWholesale: 180,
      lensType: "Progressive",
      lensCoating: "Blue Light Block",
      totalCustomer: 680,
      depositCustomer: 200,
      balanceCustomer: 480,
      totalReal: 680,
      depositReal: 200,
      balanceReal: 480,
      dueDate: new Date("2026-02-10"),
      labOrderedAt: new Date("2026-01-28"),
      labReceivedAt: new Date("2026-02-06"),
      readyAt: new Date("2026-02-07"),
      notes: "Customer called — will pick up Feb 15",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Silhouette 5515 Titan Minimal - Rose Gold",
            quantity: 1,
            unitPriceCustomer: 450,
            unitPriceReal: 450,
            totalCustomer: 450,
            totalReal: 450,
            inventoryItemId: frames[3].id,
          },
          {
            type: LineItemType.LENS,
            description: "Progressive Trivex",
            quantity: 1,
            unitPriceCustomer: 180,
            unitPriceReal: 180,
            totalCustomer: 180,
            totalReal: 180,
          },
          {
            type: LineItemType.COATING,
            description: "Blue Light Block + AR",
            quantity: 1,
            unitPriceCustomer: 50,
            unitPriceReal: 50,
            totalCustomer: 50,
            totalReal: 50,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.CONFIRMED, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.LAB_ORDERED, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.LAB_RECEIVED, createdBy: "Mike Tran" },
          { status: OrderStatus.READY, note: "Adjusted", createdBy: "Mike Tran" },
        ],
      },
      payments: {
        create: [
          { amount: 200, method: PaymentMethod.CREDIT_MASTERCARD, note: "Deposit", paidAt: new Date("2026-01-27") },
        ],
      },
    },
  });

  // Order 3 — Jisoo, READY (contacts, insurance gaming / dual invoice)
  const order3 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(3),
      customerId: jisoo.id,
      userId: sarah.id,
      prescriptionId: jisooRx.id,
      insurancePolicyId: jisooInsurance.id,
      type: OrderType.CONTACTS,
      status: OrderStatus.READY,
      isDualInvoice: true,
      lensType: "Daily Disposable",
      totalCustomer: 200,
      depositCustomer: 0,
      balanceCustomer: 200,
      totalReal: 340,
      depositReal: 0,
      balanceReal: 340,
      dueDate: new Date("2026-02-14"),
      readyAt: new Date("2026-02-12"),
      notes: "Insurance max $200 contacts — customer invoice shows $200, real is $340",
      lineItems: {
        create: [
          {
            type: LineItemType.CONTACT_LENS,
            description: "Acuvue Oasys 1-Day — OD (90pk)",
            quantity: 2,
            unitPriceCustomer: 85,
            unitPriceReal: 85,
            totalCustomer: 170,
            totalReal: 170,
          },
          {
            type: LineItemType.CONTACT_LENS,
            description: "Acuvue Oasys 1-Day — OS (90pk)",
            quantity: 2,
            unitPriceCustomer: 85,
            unitPriceReal: 85,
            totalCustomer: 170,
            totalReal: 170,
          },
          {
            type: LineItemType.DISCOUNT,
            description: "Insurance Benefit (Green Shield)",
            quantity: 1,
            unitPriceCustomer: -200,
            unitPriceReal: 0,
            totalCustomer: -200,
            totalReal: 0,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.CONFIRMED, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.READY, note: "Contacts in stock", createdBy: "Sarah Leblanc" },
        ],
      },
    },
  });

  // Order 4 — Chidi, LAB_RECEIVED
  const order4 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(4),
      customerId: chidi.id,
      userId: mike.id,
      prescriptionId: chidiRx.id,
      insurancePolicyId: chidiInsurance.id,
      type: OrderType.GLASSES,
      status: OrderStatus.LAB_RECEIVED,
      isDualInvoice: false,
      frameBrand: "Lindberg",
      frameModel: "1040 Spirit Titanium",
      frameColor: "Brushed Grey",
      frameSku: "LB1040-GRY-52",
      frameWholesale: 220,
      lensType: "Progressive",
      lensCoating: "Anti-Reflective",
      totalCustomer: 750,
      depositCustomer: 400,
      balanceCustomer: 350,
      totalReal: 750,
      depositReal: 400,
      balanceReal: 350,
      dueDate: new Date("2026-02-20"),
      labOrderedAt: new Date("2026-02-03"),
      labReceivedAt: new Date("2026-02-13"),
      labNotes: "High Rx — confirm PD measurements before cutting",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Lindberg 1040 Spirit Titanium - Brushed Grey",
            quantity: 1,
            unitPriceCustomer: 550,
            unitPriceReal: 550,
            totalCustomer: 550,
            totalReal: 550,
            inventoryItemId: frames[5].id,
          },
          {
            type: LineItemType.LENS,
            description: "Progressive High-Index 1.74",
            quantity: 1,
            unitPriceCustomer: 150,
            unitPriceReal: 150,
            totalCustomer: 150,
            totalReal: 150,
          },
          {
            type: LineItemType.COATING,
            description: "Premium AR + Scratch Resistant",
            quantity: 1,
            unitPriceCustomer: 50,
            unitPriceReal: 50,
            totalCustomer: 50,
            totalReal: 50,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Mike Tran" },
          { status: OrderStatus.CONFIRMED, note: "Dr. Okonkwo confirmed order by phone", createdBy: "Mike Tran" },
          { status: OrderStatus.LAB_ORDERED, note: "Sent to Shamir lab", createdBy: "Mike Tran" },
          { status: OrderStatus.LAB_RECEIVED, note: "Lenses received — need to cut and mount", createdBy: "Mike Tran" },
        ],
      },
      payments: {
        create: [
          { amount: 400, method: PaymentMethod.E_TRANSFER, note: "Deposit via e-transfer", paidAt: new Date("2026-02-02") },
        ],
      },
    },
  });

  // Order 5 — Sophie, LAB_ORDERED
  const order5 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(5),
      customerId: sophie.id,
      userId: sarah.id,
      prescriptionId: sophieRx.id,
      type: OrderType.GLASSES,
      status: OrderStatus.LAB_ORDERED,
      isDualInvoice: false,
      frameBrand: "Warby Parker",
      frameModel: "Wilkie",
      frameColor: "Tortoise",
      frameSku: "WP-WILKIE-TRT-50",
      frameWholesale: 45,
      lensType: "Single Vision",
      lensCoating: "Anti-Reflective",
      totalCustomer: 295,
      depositCustomer: 100,
      balanceCustomer: 195,
      totalReal: 295,
      depositReal: 100,
      balanceReal: 195,
      dueDate: new Date("2026-02-25"),
      labOrderedAt: new Date("2026-02-10"),
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Warby Parker Wilkie - Tortoise",
            quantity: 1,
            unitPriceCustomer: 145,
            unitPriceReal: 145,
            totalCustomer: 145,
            totalReal: 145,
            inventoryItemId: frames[6].id,
          },
          {
            type: LineItemType.LENS,
            description: "Single Vision Polycarbonate",
            quantity: 1,
            unitPriceCustomer: 100,
            unitPriceReal: 100,
            totalCustomer: 100,
            totalReal: 100,
          },
          {
            type: LineItemType.COATING,
            description: "Anti-Reflective",
            quantity: 1,
            unitPriceCustomer: 50,
            unitPriceReal: 50,
            totalCustomer: 50,
            totalReal: 50,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.CONFIRMED, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.LAB_ORDERED, createdBy: "Sarah Leblanc" },
        ],
      },
      payments: {
        create: [
          { amount: 100, method: PaymentMethod.CASH, note: "Cash deposit", paidAt: new Date("2026-02-09") },
        ],
      },
    },
  });

  // Order 6 — David, CONFIRMED
  const order6 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(6),
      customerId: david.id,
      userId: mike.id,
      prescriptionId: davidRx.id,
      type: OrderType.GLASSES,
      status: OrderStatus.CONFIRMED,
      isDualInvoice: false,
      frameBrand: "Tom Ford",
      frameModel: "FT5634-B",
      frameColor: "Tortoise",
      frameSku: "TF5634-TRT-54",
      frameWholesale: 155,
      lensType: "Progressive",
      lensCoating: "Anti-Reflective",
      totalCustomer: 595,
      depositCustomer: 300,
      balanceCustomer: 295,
      totalReal: 595,
      depositReal: 300,
      balanceReal: 295,
      dueDate: new Date("2026-03-01"),
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Tom Ford FT5634-B - Tortoise",
            quantity: 1,
            unitPriceCustomer: 420,
            unitPriceReal: 420,
            totalCustomer: 420,
            totalReal: 420,
            inventoryItemId: frames[4].id,
          },
          {
            type: LineItemType.LENS,
            description: "Progressive High-Index 1.67",
            quantity: 1,
            unitPriceCustomer: 125,
            unitPriceReal: 125,
            totalCustomer: 125,
            totalReal: 125,
          },
          {
            type: LineItemType.COATING,
            description: "Anti-Reflective",
            quantity: 1,
            unitPriceCustomer: 50,
            unitPriceReal: 50,
            totalCustomer: 50,
            totalReal: 50,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Mike Tran" },
          { status: OrderStatus.CONFIRMED, note: "Called Mr. Chen to confirm — will come in Friday", createdBy: "Mike Tran" },
        ],
      },
      payments: {
        create: [
          { amount: 300, method: PaymentMethod.CHEQUE, reference: "CHQ #1042", note: "Cheque at order", paidAt: new Date("2026-02-13") },
        ],
      },
    },
  });

  // Order 7 — Priya, DRAFT
  const order7 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(7),
      customerId: priya.id,
      userId: sarah.id,
      type: OrderType.GLASSES,
      status: OrderStatus.DRAFT,
      isDualInvoice: false,
      frameBrand: "Prada",
      frameModel: "PR 14WV",
      frameColor: "Black",
      frameSku: "PR14WV-BLK-53",
      frameWholesale: 175,
      totalCustomer: 420,
      depositCustomer: 0,
      balanceCustomer: 420,
      totalReal: 420,
      depositReal: 0,
      balanceReal: 420,
      notes: "Customer still deciding on lens type — follow up",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Prada PR 14WV - Black",
            quantity: 1,
            unitPriceCustomer: 420,
            unitPriceReal: 420,
            totalCustomer: 420,
            totalReal: 420,
            inventoryItemId: frames[7].id,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Sarah Leblanc" },
        ],
      },
    },
  });

  // Order 8 — Liam, CONFIRMED (sunglasses, no Rx)
  const order8 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(8),
      customerId: liam.id,
      userId: mike.id,
      type: OrderType.SUNGLASSES,
      status: OrderStatus.CONFIRMED,
      isDualInvoice: false,
      frameBrand: "Ray-Ban",
      frameModel: "RB3025 Aviator",
      frameColor: "Gold",
      frameSku: "RB3025-GLD-58",
      frameWholesale: 85,
      lensType: "Polarized",
      totalCustomer: 229,
      depositCustomer: 229,
      balanceCustomer: 0,
      totalReal: 229,
      depositReal: 229,
      balanceReal: 0,
      notes: "Paid in full — frame in stock, no lab needed",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Ray-Ban RB3025 Aviator - Gold Polarized",
            quantity: 1,
            unitPriceCustomer: 229,
            unitPriceReal: 229,
            totalCustomer: 229,
            totalReal: 229,
            inventoryItemId: frames[1].id,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Mike Tran" },
          { status: OrderStatus.CONFIRMED, createdBy: "Mike Tran" },
        ],
      },
      payments: {
        create: [
          { amount: 229, method: PaymentMethod.DEBIT, note: "Paid in full", paidAt: new Date("2026-02-14") },
        ],
      },
    },
  });

  // Order 9 — Hyun, CANCELLED
  const order9 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(9),
      customerId: hyun.id,
      userId: sarah.id,
      type: OrderType.GLASSES,
      status: OrderStatus.CANCELLED,
      isDualInvoice: false,
      frameBrand: "Oakley",
      frameModel: "OX8046 Crosslink",
      frameColor: "Matte Black",
      totalCustomer: 380,
      depositCustomer: 0,
      balanceCustomer: 380,
      totalReal: 380,
      depositReal: 0,
      balanceReal: 380,
      notes: "Customer cancelled — changed mind, wants contacts instead",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Oakley OX8046 Crosslink - Matte Black",
            quantity: 1,
            unitPriceCustomer: 280,
            unitPriceReal: 280,
            totalCustomer: 280,
            totalReal: 280,
            inventoryItemId: frames[2].id,
          },
          {
            type: LineItemType.LENS,
            description: "Single Vision Polycarbonate",
            quantity: 1,
            unitPriceCustomer: 100,
            unitPriceReal: 100,
            totalCustomer: 100,
            totalReal: 100,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Sarah Leblanc" },
          { status: OrderStatus.CANCELLED, note: "Customer cancelled by phone", createdBy: "Sarah Leblanc" },
        ],
      },
    },
  });

  // Order 10 — Amara, LAB_ORDERED (kids glasses)
  const order10 = await prisma.order.create({
    data: {
      orderNumber: orderNumber(10),
      customerId: amara.id,
      userId: mike.id,
      type: OrderType.GLASSES,
      status: OrderStatus.LAB_ORDERED,
      isDualInvoice: false,
      frameBrand: "Warby Parker",
      frameModel: "Wilkie",
      frameColor: "Tortoise",
      lensType: "Single Vision",
      lensCoating: "Impact Resistant",
      totalCustomer: 245,
      depositCustomer: 125,
      balanceCustomer: 120,
      totalReal: 245,
      depositReal: 125,
      balanceReal: 120,
      dueDate: new Date("2026-02-28"),
      labOrderedAt: new Date("2026-02-11"),
      labNotes: "Child frame — use impact resistant polycarbonate",
      lineItems: {
        create: [
          {
            type: LineItemType.FRAME,
            description: "Warby Parker Wilkie Kids - Tortoise",
            quantity: 1,
            unitPriceCustomer: 145,
            unitPriceReal: 145,
            totalCustomer: 145,
            totalReal: 145,
          },
          {
            type: LineItemType.LENS,
            description: "Single Vision Polycarbonate",
            quantity: 1,
            unitPriceCustomer: 80,
            unitPriceReal: 80,
            totalCustomer: 80,
            totalReal: 80,
          },
          {
            type: LineItemType.COATING,
            description: "Impact Resistant Coating",
            quantity: 1,
            unitPriceCustomer: 20,
            unitPriceReal: 20,
            totalCustomer: 20,
            totalReal: 20,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: OrderStatus.DRAFT, createdBy: "Mike Tran" },
          { status: OrderStatus.CONFIRMED, note: "Parent (Chidi) approved and paid deposit", createdBy: "Mike Tran" },
          { status: OrderStatus.LAB_ORDERED, createdBy: "Mike Tran" },
        ],
      },
      payments: {
        create: [
          { amount: 125, method: PaymentMethod.CREDIT_VISA, note: "Deposit", paidAt: new Date("2026-02-10") },
        ],
      },
    },
  });

  console.log("  ✅ 10 orders (all statuses covered)");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n🎉 Test data seed complete!\n");
  console.log("Summary:");
  console.log("  👤 Staff:      sarah@mintvisionsoptique.com / mike@mintvisionsoptique.com (password: staff123)");
  console.log("  👥 Customers:  10 (Rossi family, Park family, Okonkwo family + individuals)");
  console.log("  👓 Rx:         6 prescriptions");
  console.log("  🗃️  Inventory:  10 items");
  console.log("  📋 Orders:     10 (DRAFT, CONFIRMED x2, LAB_ORDERED x2, LAB_RECEIVED, READY x2, PICKED_UP, CANCELLED)");
  console.log("  🏥 Insurance:  3 policies\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
