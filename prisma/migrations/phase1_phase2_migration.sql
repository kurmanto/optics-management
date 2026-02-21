-- Phase 1 & Phase 2 Migration
-- Run this against the Supabase database before running `npx prisma generate`

-- ─────────────────────────────────────────
-- 1. insurance_policies: add contract_number, estimated_coverage
-- ─────────────────────────────────────────
ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS estimated_coverage FLOAT;

-- ─────────────────────────────────────────
-- 2. orders: add exam fields and family_promo_campaign_enrolled
-- ─────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS exam_type TEXT,
  ADD COLUMN IF NOT EXISTS exam_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS insurance_covered_amount FLOAT,
  ADD COLUMN IF NOT EXISTS family_promo_campaign_enrolled BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────
-- 3. inventory_items: add display tracking fields
-- ─────────────────────────────────────────
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS is_displayed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS displayed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS display_location TEXT;

-- ─────────────────────────────────────────
-- 4. purchase_order_line_items: make inventory_item_id nullable, add expanded fields
-- ─────────────────────────────────────────
ALTER TABLE purchase_order_line_items
  ALTER COLUMN inventory_item_id DROP NOT NULL;

ALTER TABLE purchase_order_line_items
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS eye_size TEXT,
  ADD COLUMN IF NOT EXISTS bridge TEXT,
  ADD COLUMN IF NOT EXISTS temple TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS color_code TEXT,
  ADD COLUMN IF NOT EXISTS retail_price FLOAT,
  ADD COLUMN IF NOT EXISTS gross_profit FLOAT,
  ADD COLUMN IF NOT EXISTS frame_type TEXT,
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─────────────────────────────────────────
-- 5. referrals: add status, order_id, make referredId nullable
-- ─────────────────────────────────────────
ALTER TABLE referrals
  ALTER COLUMN "referredId" DROP NOT NULL;

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS order_id TEXT;

-- ─────────────────────────────────────────
-- 6. AppointmentType enum: add STYLING
-- ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STYLING'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AppointmentType')
  ) THEN
    ALTER TYPE "AppointmentType" ADD VALUE 'STYLING';
  END IF;
END$$;

-- ─────────────────────────────────────────
-- 7. saved_frames: new table
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_frames (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id          TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  inventory_item_id    TEXT REFERENCES inventory_items(id),
  brand                TEXT NOT NULL,
  model                TEXT,
  color                TEXT,
  sku                  TEXT,
  photo_url            TEXT,
  notes                TEXT,
  saved_by             TEXT,
  is_favorite          BOOLEAN DEFAULT FALSE,
  expected_return_date TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_frames_customer_id_idx ON saved_frames(customer_id);
