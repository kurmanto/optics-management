-- Fix purchase_orders table to match Prisma schema

-- 1. Convert status from TEXT to PurchaseOrderStatus enum
ALTER TABLE purchase_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE purchase_orders
  ALTER COLUMN status TYPE "PurchaseOrderStatus"
  USING status::"PurchaseOrderStatus";
ALTER TABLE purchase_orders
  ALTER COLUMN status SET DEFAULT 'DRAFT'::"PurchaseOrderStatus";

-- 2. Add missing columns
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS subtotal   DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping   DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duties     DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT '';
