-- Client Portal Migration
-- Adds: ClientAccount, MagicLink, ClientSession, UnlockCard tables
-- Extends: Family (tier, portal fields)

-- ─── Family extensions ───────────────────────────────────────────────────────

ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "tier_level" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "tier_points_total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "portal_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "portal_note" TEXT;

-- ─── ClientAccount ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "client_accounts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "password_hash" TEXT,
  "family_id" TEXT NOT NULL,
  "primary_customer_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ,
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_accounts_email_key" UNIQUE ("email"),
  CONSTRAINT "client_accounts_primary_customer_id_key" UNIQUE ("primary_customer_id"),
  CONSTRAINT "client_accounts_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "client_accounts_primary_customer_id_fkey" FOREIGN KEY ("primary_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "client_accounts_family_id_idx" ON "client_accounts"("family_id");

-- ─── MagicLink ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "magic_links" (
  "id" TEXT NOT NULL,
  "client_account_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "magic_links_token_key" UNIQUE ("token"),
  CONSTRAINT "magic_links_client_account_id_fkey" FOREIGN KEY ("client_account_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "magic_links_client_account_id_idx" ON "magic_links"("client_account_id");

-- ─── ClientSession ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "client_sessions" (
  "id" TEXT NOT NULL,
  "client_account_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "client_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "client_sessions_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "client_sessions_client_account_id_fkey" FOREIGN KEY ("client_account_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "client_sessions_client_account_id_idx" ON "client_sessions"("client_account_id");

-- ─── UnlockCard ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "UnlockCardStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'CLAIMED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "unlock_cards" (
  "id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "status" "UnlockCardStatus" NOT NULL DEFAULT 'LOCKED',
  "value" DOUBLE PRECISION,
  "value_type" TEXT,
  "progress" INTEGER DEFAULT 0,
  "progress_goal" INTEGER,
  "unlocked_at" TIMESTAMPTZ,
  "claimed_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "unlocked_by" TEXT,
  "trigger_rule" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "unlock_cards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unlock_cards_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "unlock_cards_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "unlock_cards_family_id_idx" ON "unlock_cards"("family_id");
CREATE INDEX IF NOT EXISTS "unlock_cards_customer_id_idx" ON "unlock_cards"("customer_id");
