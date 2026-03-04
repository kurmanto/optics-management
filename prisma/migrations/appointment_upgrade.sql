-- Appointment System Upgrade Migration
-- Adds: ServiceType, Provider, ProviderAvailability, BlockedTime, WaitlistEntry, PublicBooking, AppointmentSettings
-- Modifies: Appointment (new fields, nullable customerId)
-- Adds enums: BookingSource, WaitlistStatus
-- Adds to NotificationType: APPOINTMENT_BOOKED_PUBLIC

-- ─── New Enums ───────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "BookingSource" AS ENUM ('STAFF', 'CLIENT_PORTAL', 'PUBLIC_BOOKING', 'WALK_IN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add APPOINTMENT_BOOKED_PUBLIC to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPOINTMENT_BOOKED_PUBLIC';

-- ─── ServiceType ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "service_types" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 30,
  "buffer_after" INTEGER NOT NULL DEFAULT 15,
  "color" TEXT NOT NULL DEFAULT '#3B82F6',
  "bg_color" TEXT NOT NULL DEFAULT '#EFF6FF',
  "requires_od" BOOLEAN NOT NULL DEFAULT false,
  "is_public_bookable" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_types_slug_key" ON "service_types"("slug");

-- ─── Provider ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "providers" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Optician',
  "is_od" BOOLEAN NOT NULL DEFAULT false,
  "user_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- ─── ProviderAvailability ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "provider_availability" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "provider_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "provider_availability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provider_availability_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_availability_provider_id_day_of_week_key" ON "provider_availability"("provider_id", "day_of_week");

-- ─── BlockedTime ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "blocked_times" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "provider_id" TEXT,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "blocked_times_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "blocked_times_start_at_end_at_idx" ON "blocked_times"("start_at", "end_at");

-- ─── WaitlistEntry ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "waitlist_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "customer_id" TEXT,
  "first_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "service_type_id" TEXT NOT NULL,
  "preferred_days" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "preferred_times" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
  "notified_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "waitlist_entries_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "waitlist_entries_status_idx" ON "waitlist_entries"("status");
CREATE INDEX IF NOT EXISTS "waitlist_entries_service_type_id_idx" ON "waitlist_entries"("service_type_id");

-- ─── PublicBooking ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public_bookings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "is_new_patient" BOOLEAN NOT NULL DEFAULT true,
  "hear_about_us" TEXT,
  "insurance_info" TEXT,
  "last_exam_date" TEXT,
  "preferred_contact" TEXT,
  "notes" TEXT,
  "service_type_id" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "public_bookings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_bookings_appointment_id_key" UNIQUE ("appointment_id"),
  CONSTRAINT "public_bookings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "public_bookings_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "public_bookings_phone_idx" ON "public_bookings"("phone");
CREATE INDEX IF NOT EXISTS "public_bookings_email_idx" ON "public_bookings"("email");
CREATE INDEX IF NOT EXISTS "public_bookings_created_at_idx" ON "public_bookings"("createdAt");

-- ─── AppointmentSettings (singleton) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "appointment_settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "min_cancel_hours" INTEGER NOT NULL DEFAULT 24,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "appointment_settings_pkey" PRIMARY KEY ("id")
);

-- Seed default settings row
INSERT INTO "appointment_settings" ("id", "min_cancel_hours", "updatedAt")
VALUES ('default', 24, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- ─── Appointment Table Alterations ───────────────────────────────────────────

-- Make customerId nullable
ALTER TABLE "appointments" ALTER COLUMN "customerId" DROP NOT NULL;

-- Add new columns
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "service_type_id" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "provider_id" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source" "BookingSource" NOT NULL DEFAULT 'STAFF';
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "buffer_after" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_72h_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_24h_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "confirmation_sent_at" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancelled_reason" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "add_ons" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "recall_sent_at" TIMESTAMP(3);

-- FK constraints
DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_type_id_fkey"
    FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes on appointments
CREATE INDEX IF NOT EXISTS "appointments_service_type_id_idx" ON "appointments"("service_type_id");
CREATE INDEX IF NOT EXISTS "appointments_provider_id_idx" ON "appointments"("provider_id");
CREATE INDEX IF NOT EXISTS "appointments_scheduled_at_idx" ON "appointments"("scheduledAt");

-- ─── Seed Default Service Types ──────────────────────────────────────────────

INSERT INTO "service_types" ("id", "name", "slug", "description", "duration", "buffer_after", "color", "bg_color", "requires_od", "is_public_bookable", "sort_order")
VALUES
  ('st_eye_exam',             'Eye Exam',              'eye-exam',              'Comprehensive eye examination', 30, 15, '#3B82F6', '#EFF6FF', true,  true,  1),
  ('st_contact_lens',         'Contact Lens Fitting',  'contact-lens-fitting',  'Contact lens fitting and evaluation', 30, 15, '#A855F7', '#FAF5FF', true,  true,  2),
  ('st_follow_up',            'Follow-Up',             'follow-up',             'Follow-up appointment', 15, 10, '#F97316', '#FFF7ED', true,  true,  3),
  ('st_glasses_pickup',       'Glasses Pickup',        'glasses-pickup',        'Pick up completed glasses', 15, 5,  '#22C55E', '#F0FDF4', false, false, 4),
  ('st_adjustment',           'Adjustment',            'adjustment',            'Frame adjustment or repair', 15, 5,  '#EAB308', '#FEFCE8', false, false, 5),
  ('st_styling',              'Eyewear Styling',       'styling',               'Personal eyewear styling consultation', 45, 15, '#10B981', '#ECFDF5', false, true,  6),
  ('st_consultation',         'Consultation',          'consultation',          'General consultation', 30, 10, '#6366F1', '#EEF2FF', false, true,  7)
ON CONFLICT ("slug") DO NOTHING;

-- ─── Seed Default OD Provider ────────────────────────────────────────────────

INSERT INTO "providers" ("id", "name", "title", "is_od", "is_active")
VALUES ('prov_default_od', 'Dr. Harmeet', 'OD', true, true)
ON CONFLICT ("id") DO NOTHING;

-- ─── Backfill Existing Appointments ──────────────────────────────────────────

-- Map existing type enum values to service type IDs
UPDATE "appointments" SET "source" = 'STAFF' WHERE "source" IS NULL OR "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_eye_exam'       WHERE "type" = 'EYE_EXAM'              AND "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_contact_lens'   WHERE "type" = 'CONTACT_LENS_FITTING'  AND "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_follow_up'      WHERE "type" = 'FOLLOW_UP'             AND "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_glasses_pickup' WHERE "type" = 'GLASSES_PICKUP'        AND "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_adjustment'     WHERE "type" = 'ADJUSTMENT'            AND "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_styling'        WHERE "type" = 'STYLING'               AND "service_type_id" IS NULL;
UPDATE "appointments" SET "service_type_id" = 'st_consultation'   WHERE "type" = 'CONSULTATION'          AND "service_type_id" IS NULL;
