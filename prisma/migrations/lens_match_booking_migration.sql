-- Lens Match Booking Integration Migration
-- Adds CONSULTATION to AppointmentType enum and booking fields to LensQuote

-- Add CONSULTATION to AppointmentType enum
ALTER TYPE "AppointmentType" ADD VALUE IF NOT EXISTS 'CONSULTATION';

-- Add booking fields to lens_quotes table
ALTER TABLE "lens_quotes" ADD COLUMN "appointment_id" TEXT UNIQUE;
ALTER TABLE "lens_quotes" ADD COLUMN "requested_appointment_type" TEXT;
ALTER TABLE "lens_quotes" ADD COLUMN "callback_requested_at" TIMESTAMPTZ;

-- Add foreign key constraint
ALTER TABLE "lens_quotes" ADD CONSTRAINT "lens_quotes_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
