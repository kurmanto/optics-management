-- Inventory V2 Migration
-- Creates: vendors, purchase_orders, purchase_order_line_items, inventory_ledger
-- Alters: inventory_items (adds new columns)

-- New enum types
DO $$ BEGIN
  CREATE TYPE "AbcCategory" AS ENUM ('A', 'B', 'C');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerReason" AS ENUM (
    'PURCHASE_ORDER_RECEIVED',
    'MANUAL_ADJUSTMENT',
    'ORDER_COMMITTED',
    'ORDER_FULFILLED',
    'ORDER_CANCELLED',
    'PHYSICAL_COUNT',
    'DAMAGED',
    'LOST',
    'RETURN_FROM_CUSTOMER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Vendors table
CREATE TABLE IF NOT EXISTS "vendors" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "contact_name"    TEXT,
  "email"           TEXT,
  "phone"           TEXT,
  "website"         TEXT,
  "address"         TEXT,
  "payment_terms"   TEXT,
  "min_order_qty"   INTEGER,
  "lead_time_days"  INTEGER,
  "payment_methods" TEXT[] NOT NULL DEFAULT '{}',
  "return_policy"   TEXT,
  "rep_name"        TEXT,
  "rep_email"       TEXT,
  "rep_phone"       TEXT,
  "notes"           TEXT,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Expand inventory_items table
ALTER TABLE "inventory_items"
  ADD COLUMN IF NOT EXISTS "upc"                   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "color_code"            TEXT,
  ADD COLUMN IF NOT EXISTS "style_tags"            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "country_of_origin"     TEXT,
  ADD COLUMN IF NOT EXISTS "additional_image_urls" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "committed_qty"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "on_order_qty"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "landed_cost"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "markdown_pct"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "abc_category"          "AbcCategory",
  ADD COLUMN IF NOT EXISTS "first_received_at"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_sold_at"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "total_units_sold"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vendor_id"             TEXT REFERENCES "vendors"("id");

CREATE INDEX IF NOT EXISTS "inventory_items_vendor_id_idx" ON "inventory_items"("vendor_id");

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "po_number"   TEXT NOT NULL UNIQUE,
  "vendor_id"   TEXT NOT NULL REFERENCES "vendors"("id"),
  "status"      "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "expected_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3),
  "subtotal"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shipping"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "duties"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes"       TEXT,
  "created_by"  TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "purchase_orders_vendor_id_idx" ON "purchase_orders"("vendor_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx" ON "purchase_orders"("status");

-- Purchase Order Line Items table
CREATE TABLE IF NOT EXISTS "purchase_order_line_items" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "po_id"             TEXT NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "inventory_item_id" TEXT NOT NULL REFERENCES "inventory_items"("id"),
  "quantity_ordered"  INTEGER NOT NULL,
  "quantity_received" INTEGER NOT NULL DEFAULT 0,
  "unit_cost"         DOUBLE PRECISION NOT NULL,
  "received_at"       TIMESTAMP(3),
  "condition_notes"   TEXT
);

CREATE INDEX IF NOT EXISTS "purchase_order_line_items_po_id_idx" ON "purchase_order_line_items"("po_id");

-- Inventory Ledger table
CREATE TABLE IF NOT EXISTS "inventory_ledger" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "inventory_item_id" TEXT NOT NULL REFERENCES "inventory_items"("id"),
  "reason"            "LedgerReason" NOT NULL,
  "quantity_change"   INTEGER NOT NULL,
  "quantity_after"    INTEGER NOT NULL,
  "unit_cost"         DOUBLE PRECISION,
  "reference_id"      TEXT,
  "reference_type"    TEXT,
  "notes"             TEXT,
  "created_by"        TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "inventory_ledger_inventory_item_id_idx" ON "inventory_ledger"("inventory_item_id");
