-- Forms Migration
-- Run this in the Supabase SQL editor

-- Enums
CREATE TYPE "FormTemplateType" AS ENUM ('NEW_PATIENT', 'HIPAA_CONSENT', 'FRAME_REPAIR_WAIVER', 'INSURANCE_VERIFICATION');
CREATE TYPE "FormStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- FormTemplate
CREATE TABLE "form_templates" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "type"        "FormTemplateType" NOT NULL,
    "description" TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- FormSubmission
CREATE TABLE "form_submissions" (
    "id"            TEXT NOT NULL,
    "token"         TEXT NOT NULL,
    "templateId"    TEXT NOT NULL,
    "customerId"    TEXT,
    "customerName"  TEXT,
    "sentByUserId"  TEXT NOT NULL,
    "status"        "FormStatus" NOT NULL DEFAULT 'PENDING',
    "data"          JSONB,
    "signatureText" TEXT,
    "signedAt"      TIMESTAMP(3),
    "completedAt"   TIMESTAMP(3),
    "expiresAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on token
CREATE UNIQUE INDEX "form_submissions_token_key" ON "form_submissions"("token");

-- Indexes
CREATE INDEX "form_submissions_status_idx" ON "form_submissions"("status");
CREATE INDEX "form_submissions_customerId_idx" ON "form_submissions"("customerId");

-- Foreign keys
ALTER TABLE "form_submissions"
    ADD CONSTRAINT "form_submissions_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "form_templates"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "form_submissions"
    ADD CONSTRAINT "form_submissions_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "form_submissions"
    ADD CONSTRAINT "form_submissions_sentByUserId_fkey"
    FOREIGN KEY ("sentByUserId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed form templates (run after migration)
INSERT INTO "form_templates" ("id", "name", "type", "description", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'New Patient Registration',    'NEW_PATIENT',             'Collect personal details, contact info, and health card number.',                          true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Privacy & Consent (PIPEDA)',  'HIPAA_CONSENT',           'Consent for data collection, SMS/email communications, and insurance sharing.',            true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Frame Repair Waiver',         'FRAME_REPAIR_WAIVER',     'Liability waiver for frame adjustments and repairs with patient signature.',               true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Insurance Verification',      'INSURANCE_VERIFICATION',  'Collect policy details, member ID, group number, and renewal dates.',                     true, NOW(), NOW());
