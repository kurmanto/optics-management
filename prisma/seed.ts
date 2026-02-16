import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const passwordHash = await bcrypt.hash("changeme123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mintvisionsoptique.com" },
    update: {},
    create: {
      email: "admin@mintvisionsoptique.com",
      name: "Admin",
      passwordHash,
      role: UserRole.ADMIN,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Default system settings
  const settings = [
    { key: "tax_rate", value: "0.13" },
    { key: "business_name", value: "Mint Vision Optique" },
    { key: "business_phone", value: "" },
    { key: "business_email", value: "" },
    { key: "business_address", value: "" },
    { key: "invoice_notes", value: "Thank you for choosing Mint Vision Optique!" },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log("✅ System settings seeded");
  console.log("🎉 Seeding complete!");
  console.log("\n⚠️  Default admin credentials:");
  console.log("   Email: admin@mintvisionsoptique.com");
  console.log("   Password: changeme123");
  console.log("   ⚠️  Change password on first login!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
