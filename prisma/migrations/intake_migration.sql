-- Intake Package Migration
-- Run in Supabase SQL editor

-- PackageStatus enum
CREATE TYPE "PackageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- Add isOnboarded to customers
ALTER TABLE "customers" ADD COLUMN "isOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- FormPackage table
CREATE TABLE "form_packages" (
    "id"            TEXT NOT NULL,
    "token"         TEXT NOT NULL,
    "customerId"    TEXT,
    "customerName"  TEXT,
    "customerEmail" TEXT,
    "sentByUserId"  TEXT NOT NULL,
    "status"        "PackageStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt"   TIMESTAMP(3),
    "expiresAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_packages_token_key" ON "form_packages"("token");
CREATE INDEX "form_packages_customerId_idx" ON "form_packages"("customerId");
CREATE INDEX "form_packages_status_idx" ON "form_packages"("status");

ALTER TABLE "form_packages"
    ADD CONSTRAINT "form_packages_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "form_packages"
    ADD CONSTRAINT "form_packages_sentByUserId_fkey"
    FOREIGN KEY ("sentByUserId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add packageId and packageOrder to form_submissions
ALTER TABLE "form_submissions" ADD COLUMN "packageId" TEXT;
ALTER TABLE "form_submissions" ADD COLUMN "packageOrder" INTEGER;

ALTER TABLE "form_submissions"
    ADD CONSTRAINT "form_submissions_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "form_packages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "form_submissions_packageId_idx" ON "form_submissions"("packageId");
