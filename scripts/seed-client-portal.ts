/**
 * Client Portal Seed Script
 *
 * Creates a test client portal account with a known password for immediate login testing.
 *
 * Usage:
 *   npx tsx scripts/seed-client-portal.ts
 *
 * Creates:
 *   - Updates the first family found (Rossi if seed-test-data was run) with portal fields
 *   - Creates a ClientAccount for the primary customer with a known password
 *   - Creates sample UnlockCards for the family
 *
 * Login credentials:
 *   Email: portal@mintvisionsoptique.com
 *   Password: Portal123!
 *   URL: http://localhost:3000/my/login
 */

import "dotenv/config";
import { PrismaClient, UnlockCardStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding client portal test data...\n");

  // Find a family with customers
  const family = await prisma.family.findFirst({
    where: { customers: { some: { isActive: true } } },
    include: {
      customers: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!family || family.customers.length === 0) {
    console.error("❌ No family with active customers found. Run seed-test-data.ts first.");
    process.exit(1);
  }

  const primaryCustomer = family.customers[0];
  console.log(`📋 Using family: ${family.name} (${family.id})`);
  console.log(`👤 Primary customer: ${primaryCustomer.firstName} ${primaryCustomer.lastName}`);

  // Update family with portal fields
  await prisma.family.update({
    where: { id: family.id },
    data: {
      portalEnabled: true,
      tierLevel: 1,
      tierPointsTotal: 750,
    },
  });
  console.log("  ✅ Family updated (portal enabled, Silver tier, 750 points)");

  // Create or update client account
  const portalEmail = "portal@mintvisionsoptique.com";
  const portalPassword = "Portal123!";
  const passwordHash = await bcrypt.hash(portalPassword, 12);

  const account = await prisma.clientAccount.upsert({
    where: { email: portalEmail },
    update: {
      passwordHash,
      familyId: family.id,
      primaryCustomerId: primaryCustomer.id,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: portalEmail,
      passwordHash,
      familyId: family.id,
      primaryCustomerId: primaryCustomer.id,
      isActive: true,
    },
  });
  console.log(`  ✅ Client account created: ${portalEmail} / ${portalPassword}`);

  // Create sample unlock cards
  const existingCards = await prisma.unlockCard.findMany({
    where: { familyId: family.id },
  });

  if (existingCards.length === 0) {
    await prisma.unlockCard.createMany({
      data: [
        {
          familyId: family.id,
          type: "FAMILY_VIP",
          title: "VIP Family Badge",
          description: "Awarded after 3 completed orders. Unlocks priority scheduling.",
          status: UnlockCardStatus.UNLOCKED,
          unlockedAt: new Date("2026-01-15"),
          unlockedBy: "SYSTEM",
        },
        {
          familyId: family.id,
          type: "STYLE_CREDIT",
          title: "$25 Style Credit",
          description: "Use toward your next frame purchase.",
          status: UnlockCardStatus.LOCKED,
          value: 25,
          valueType: "DOLLAR",
          progress: 2,
          progressGoal: 5,
        },
        {
          familyId: family.id,
          type: "UPGRADE_PERK",
          title: "Free Lens Upgrade",
          description: "Complimentary anti-reflective coating on your next pair.",
          status: UnlockCardStatus.LOCKED,
          progress: 0,
          progressGoal: 3,
        },
        {
          familyId: family.id,
          customerId: primaryCustomer.id,
          type: "REFERRAL_BONUS",
          title: "Refer a Friend Bonus",
          description: "Refer 2 friends to earn $50 off.",
          status: UnlockCardStatus.LOCKED,
          value: 50,
          valueType: "DOLLAR",
          progress: 1,
          progressGoal: 2,
        },
      ],
    });
    console.log("  ✅ 4 unlock cards created");
  } else {
    console.log(`  ⏭️  ${existingCards.length} unlock cards already exist, skipping`);
  }

  // Create a store credit for the family's primary customer
  const existingCredit = await prisma.storeCredit.findFirst({
    where: { customerId: primaryCustomer.id, isActive: true },
  });

  if (!existingCredit) {
    await prisma.storeCredit.create({
      data: {
        customerId: primaryCustomer.id,
        type: "REFERRAL",
        amount: 35,
        description: "Referral bonus",
        isActive: true,
        expiresAt: new Date("2026-12-31"),
      },
    });
    console.log("  ✅ $35 store credit created");
  }

  console.log("\n🎉 Client portal seed complete!\n");
  console.log("Login credentials:");
  console.log(`  📧 Email:    ${portalEmail}`);
  console.log(`  🔑 Password: ${portalPassword}`);
  console.log(`  🌐 URL:      http://localhost:3000/my/login`);
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
