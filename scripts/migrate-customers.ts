/**
 * Customer Migration Script
 *
 * Imports customers from Customer Master CSV export.
 *
 * Usage:
 *   1. Export Customer Master Google Sheet as CSV to: scripts/data/customers.csv
 *   2. Run: npx tsx scripts/migrate-customers.ts
 *
 * Known issues to handle:
 * - Row 1 has column misalignment (phone in email field, etc.) — skip or flag
 * - Phone stored as float (6476485809.0) — clean to string
 * - Duplicate customers (same name, different IDs) — flag for manual review
 */

import { PrismaClient, Gender } from "@prisma/client";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";

const prisma = new PrismaClient();

// ── Adjust column indices to match your CSV ───────────────────────────────────
const COL = {
  legacyId: 0,    // e.g. "6476485809-A"
  familyId: 1,
  lastName: 2,
  firstName: 3,
  phone: 4,
  email: 5,
  dob: 6,
  gender: 7,
  address: 8,
  city: 9,
  province: 10,
  postalCode: 11,
  notes: 12,
};

function cleanPhone(raw: string): string | null {
  // Handle "6476485809.0" float format
  const cleaned = raw.replace(/\.0+$/, "").replace(/\D/g, "");
  if (cleaned.length < 10) return null;
  return cleaned.slice(-10); // take last 10 digits
}

function mapGender(raw: string): Gender | null {
  const val = raw.trim().toUpperCase();
  if (val === "M" || val === "MALE") return Gender.MALE;
  if (val === "F" || val === "FEMALE") return Gender.FEMALE;
  return null;
}

function parseDate(raw: string): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const csvPath = path.join(__dirname, "data", "customers.csv");
  console.log(`👤 Reading customers from: ${csvPath}`);

  // First pass: collect family IDs
  const familyIds = new Set<string>();
  const rl1 = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let headerSkipped = false;
  for await (const line of rl1) {
    if (!headerSkipped) { headerSkipped = true; continue; }
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    if (cols[COL.familyId]) familyIds.add(cols[COL.familyId]);
  }

  // Create families
  const familyMap: Record<string, string> = {};
  for (const fid of familyIds) {
    const family = await prisma.family.upsert({
      where: { id: fid },
      update: {},
      create: { id: fid, name: `Family ${fid}` },
    });
    familyMap[fid] = family.id;
  }
  console.log(`Created ${familyIds.size} families`);

  // Second pass: import customers
  const rl2 = createInterface({ input: createReadStream(csvPath), crlfDelay: Infinity });
  let lineNum = 0;
  let imported = 0;
  let skipped = 0;
  const duplicates: string[] = [];
  const errors: string[] = [];

  for await (const line of rl2) {
    lineNum++;
    if (lineNum === 1) continue;

    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());

    const legacyId = cols[COL.legacyId];
    const firstName = cols[COL.firstName];
    const lastName = cols[COL.lastName];

    if (!firstName && !lastName) {
      skipped++;
      continue;
    }

    // Check for duplicate (same name, different legacy ID)
    const existingByName = await prisma.customer.findFirst({
      where: {
        firstName: { equals: firstName, mode: "insensitive" },
        lastName: { equals: lastName, mode: "insensitive" },
      },
    });

    if (existingByName) {
      duplicates.push(`Line ${lineNum}: "${firstName} ${lastName}" already exists (legacy: ${legacyId})`);
    }

    try {
      await prisma.customer.upsert({
        where: { legacyCustomerId: legacyId || `__no_id_${lineNum}` },
        update: {},
        create: {
          legacyCustomerId: legacyId || null,
          firstName: firstName || "Unknown",
          lastName: lastName || "Unknown",
          phone: cleanPhone(cols[COL.phone] || ""),
          email: cols[COL.email] || null,
          dateOfBirth: parseDate(cols[COL.dob] || ""),
          gender: mapGender(cols[COL.gender] || ""),
          address: cols[COL.address] || null,
          city: cols[COL.city] || null,
          province: cols[COL.province] || null,
          postalCode: cols[COL.postalCode] || null,
          notes: cols[COL.notes] || null,
          familyId: cols[COL.familyId] ? familyMap[cols[COL.familyId]] : null,
        },
      });
      imported++;
    } catch (e) {
      errors.push(`Line ${lineNum}: ${e}`);
      skipped++;
    }
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped:  ${skipped}`);

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Potential duplicates (${duplicates.length}) — review manually:`);
    duplicates.forEach((d) => console.log(`   ${d}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`   ${e}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
