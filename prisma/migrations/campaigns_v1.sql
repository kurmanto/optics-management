-- ─────────────────────────────────────────
-- campaigns_v1.sql
-- Adds campaign/marketing automation schema
-- ─────────────────────────────────────────

-- 1. Expand CampaignType enum
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'SECOND_PAIR';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'PRESCRIPTION_EXPIRY';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'ABANDONMENT_RECOVERY';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'FAMILY_ADDON';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'INSURANCE_MAXIMIZATION';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'POST_PURCHASE_REFERRAL';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'VIP_INSIDER';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'DAMAGE_REPLACEMENT';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'STYLE_EVOLUTION';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'BIRTHDAY_ANNIVERSARY';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'DORMANT_REACTIVATION';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'COMPETITOR_SWITCHER';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'LIFESTYLE_MARKETING';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'AGING_INVENTORY';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'NEW_ARRIVAL_VIP';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'EDUCATIONAL_NURTURE';
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'LENS_EDUCATION';

-- 2. Expand NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CAMPAIGN_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CAMPAIGN_ERROR';

-- 3. Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  channel         "MessageChannel" NOT NULL,
  campaign_type   "CampaignType",
  subject         TEXT,
  body            TEXT NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT message_templates_pkey PRIMARY KEY (id)
);

-- 4. Create campaign_runs table
CREATE TABLE IF NOT EXISTS campaign_runs (
  id                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  campaign_id       TEXT NOT NULL,
  run_at            TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  recipients_found  INTEGER NOT NULL DEFAULT 0,
  messages_queued   INTEGER NOT NULL DEFAULT 0,
  messages_sent     INTEGER NOT NULL DEFAULT 0,
  messages_failed   INTEGER NOT NULL DEFAULT 0,
  duration_ms       INTEGER,
  error             TEXT,
  CONSTRAINT campaign_runs_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_runs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS campaign_runs_campaign_id_idx ON campaign_runs(campaign_id);

-- 5. Expand campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS segment_config  JSONB,
  ADD COLUMN IF NOT EXISTS schedule_config JSONB,
  ADD COLUMN IF NOT EXISTS template_id     TEXT,
  ADD COLUMN IF NOT EXISTS last_run_at     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS next_run_at     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS total_sent      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_delivered INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_opened    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clicked   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_converted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue   DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_id   TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaigns_template_id_fkey'
    AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES message_templates(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaigns_created_by_id_fkey'
    AND table_name = 'campaigns'
  ) THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT campaigns_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6. Expand campaign_recipients table
ALTER TABLE campaign_recipients
  ADD COLUMN IF NOT EXISTS current_step     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS converted_at     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS conversion_value DOUBLE PRECISION;

-- 7. Expand messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS opened_at    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS clicked_at   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS step_index   INTEGER,
  ADD COLUMN IF NOT EXISTS run_id       TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_run_id_fkey'
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_run_id_fkey
      FOREIGN KEY (run_id) REFERENCES campaign_runs(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 8. Add expiryDate to prescriptions table
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP(3);
