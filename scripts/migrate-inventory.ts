/**
 * Inventory Migration Script
 *
 * Imports frames from exported CSV into the database.
 *
 * Usage:
 *   1. Export inventory Google Sheet as CSV to: scripts/data/inventory.csv
 *   2. Run: npx tsx scripts/migrate-inventory.ts
 *
 * CSV columns expected (adjust column mapping below to match your export):
 *   ID, Brand, Model, SKU, Category, Gender, Color, Size, Wholesale, Retail, Stock
 */

import { PrismaClient, FrameCategory, FrameGender } from "@prisma/client";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import path from "path";

const prisma = new PrismaClient();

// ── Adjust these mappings to match your CSV columns ──────────────────────────
const COL = {
  legacyId: 0,
  brand: 1,
  model: 2,
  sku: 3,
  category: 4,
  gender: 5,
  color: 6,
  size: 7,
  wholesaleCost: 8,
  retailPrice: 9,
  stockQuantity: 10,
};

function mapCategory(raw: string): FrameCategory {
  const val = raw.trim().toUpperCase();
  if (val.includes("SUN")) return FrameCategory.SUN;
  if (val.includes("READING") || val.includes("READ")) return FrameCategory.READING;
  if (val.includes("SAFETY")) return FrameCategory.SAFETY;
  if (val.includes("SPORT")) return FrameCategory.SPORT;
  return FrameCategory.OPTICAL;
}

function mapGender(raw: string): FrameGender {
  const val = raw.trim().toUpperCase();
  if (val.includes("WOMAN") || val.includes("WOMEN") || val.includes("FEMALE") || val === "W" || val === "F") return FrameGender.WOMENS;
  if (val.includes("MAN") || val.includes("MEN") || val.includes("MALE") || val === "M") return FrameGender.MENS;
  if (val.includes("KID") || val.includes("CHILD") || val === "K") return FrameGender.KIDS;
  return FrameGender.UNISEX;
}

function cleanFloat(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function cleanInt(raw: string): number {
  const val = parseInt(raw.replace(/[^0-9]/g, ""));
  return isNaN(val) ? 0 : val;
}

async function main() {
  const csvPath = path.join(__dirname, "data", "inventory.csv");
  console.log(`📦 Reading inventory from: ${csvPath}`);

  const rl = createInterface({
    input: createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // skip header

    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());

    if (cols.length < 8) {
      errors.push(`Line ${lineNum}: too few columns`);
      skipped++;
      continue;
    }

    const brand = cols[COL.brand];
    const model = cols[COL.model];

    if (!brand || !model) {
      skipped++;
      continue;
    }

    try {
      const sku = cols[COL.sku] || null;
      await prisma.inventoryItem.upsert({
        where: { sku: sku || `__no_sku_${lineNum}` },
        update: {},
        create: {
          legacyItemId: cols[COL.legacyId] || null,
          brand,
          model,
          sku,
          category: mapCategory(cols[COL.category] || ""),
          gender: mapGender(cols[COL.gender] || ""),
          color: cols[COL.color] || null,
          size: cols[COL.size] || null,
          wholesaleCost: cleanFloat(cols[COL.wholesaleCost] || ""),
          retailPrice: cleanFloat(cols[COL.retailPrice] || ""),
          stockQuantity: cleanInt(cols[COL.stockQuantity] || "0"),
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
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`   ${e}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
