-- Lens Match / Lens Quotes table
CREATE TABLE IF NOT EXISTS "lens_quotes" (
  "id"                     TEXT PRIMARY KEY,
  "first_name"             TEXT NOT NULL,
  "phone"                  TEXT,
  "email"                  TEXT,
  "preferred_timeframe"    TEXT,
  "answers"                JSONB NOT NULL,
  "primary_package_id"     TEXT NOT NULL,
  "upgrade_package_id"     TEXT,
  "alternative_package_id" TEXT,
  "completed_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "email_sent_at"          TIMESTAMPTZ,
  "booking_clicked_at"     TIMESTAMPTZ,
  "client_account_id"      TEXT,
  "customer_id"            TEXT,
  "ip_address"             TEXT,
  "user_agent"             TEXT,
  "utm_source"             TEXT,
  "utm_medium"             TEXT,
  "utm_campaign"           TEXT,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "lens_quotes_email_idx" ON "lens_quotes" ("email");
CREATE INDEX IF NOT EXISTS "lens_quotes_client_account_id_idx" ON "lens_quotes" ("client_account_id");
CREATE INDEX IF NOT EXISTS "lens_quotes_created_at_idx" ON "lens_quotes" ("created_at");
