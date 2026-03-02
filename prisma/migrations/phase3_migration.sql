-- Phase 3: Client Notifications + Gamification + Frame Scoring
-- Run via node pattern from MEMORY.md

-- 1. ClientNotificationType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientNotificationType') THEN
    CREATE TYPE "ClientNotificationType" AS ENUM (
      'EXAM_DUE_SOON',
      'APPOINTMENT_REMINDER',
      'ORDER_STATUS_UPDATE',
      'BENEFIT_ELIGIBLE',
      'UNLOCK_CARD_EARNED',
      'TIER_UPGRADED',
      'POINTS_EARNED'
    );
  END IF;
END$$;

-- 2. client_notifications table
CREATE TABLE IF NOT EXISTS "client_notifications" (
  "id" TEXT NOT NULL,
  "client_account_id" TEXT NOT NULL,
  "type" "ClientNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "email_sent" BOOLEAN NOT NULL DEFAULT false,
  "ref_id" TEXT,
  "ref_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_notifications_client_account_id_fkey"
    FOREIGN KEY ("client_account_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "client_notifications_client_account_id_idx"
  ON "client_notifications"("client_account_id");
CREATE INDEX IF NOT EXISTS "client_notifications_client_account_id_is_read_idx"
  ON "client_notifications"("client_account_id", "is_read");

-- 3. client_notification_preferences table
CREATE TABLE IF NOT EXISTS "client_notification_preferences" (
  "id" TEXT NOT NULL,
  "client_account_id" TEXT NOT NULL,
  "type" "ClientNotificationType" NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "client_notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_notification_preferences_client_account_id_fkey"
    FOREIGN KEY ("client_account_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE,
  CONSTRAINT "client_notification_preferences_client_account_id_type_key"
    UNIQUE ("client_account_id", "type")
);

-- 4. points_ledger table
CREATE TABLE IF NOT EXISTS "points_ledger" (
  "id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "ref_id" TEXT,
  "ref_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "points_ledger_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "points_ledger_family_id_idx"
  ON "points_ledger"("family_id");

-- 5. Add staff_pick_style_labels to inventory_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'staff_pick_style_labels'
  ) THEN
    ALTER TABLE "inventory_items" ADD COLUMN "staff_pick_style_labels" TEXT[] DEFAULT '{}';
  END IF;
END$$;
