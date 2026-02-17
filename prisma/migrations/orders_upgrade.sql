-- Orders Upgrade Migration
-- Run via node command from MEMORY.md

-- 1. Add VERIFIED to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE 'VERIFIED' AFTER 'LAB_RECEIVED';

-- 2. Add enhanced frame fields to Order
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS frame_eye_size TEXT,
  ADD COLUMN IF NOT EXISTS frame_bridge TEXT,
  ADD COLUMN IF NOT EXISTS frame_temple TEXT,
  ADD COLUMN IF NOT EXISTS frame_colour_code TEXT;

-- 3. Add lens configuration fields to Order
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS lens_design TEXT,
  ADD COLUMN IF NOT EXISTS lens_add_ons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS order_category TEXT;

-- 4. Add payment/marketing fields to Order
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS insurance_coverage FLOAT,
  ADD COLUMN IF NOT EXISTS referral_credit FLOAT,
  ADD COLUMN IF NOT EXISTS review_request_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_campaign_enrolled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 5. Add marketing opt-out fields to Customer
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS opt_out_reason TEXT,
  ADD COLUMN IF NOT EXISTS opt_out_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opt_out_by TEXT;

-- 6. Add PrescriptionSource enum
DO $$ BEGIN
  CREATE TYPE "PrescriptionSource" AS ENUM ('INTERNAL', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. Add external prescription fields to Prescription
ALTER TABLE "prescriptions"
  ADD COLUMN IF NOT EXISTS source "PrescriptionSource" DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS external_doctor TEXT,
  ADD COLUMN IF NOT EXISTS external_license TEXT,
  ADD COLUMN IF NOT EXISTS external_rx_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_image_url TEXT,
  ADD COLUMN IF NOT EXISTS external_notes TEXT;
