-- PHIPA/PIPEDA Compliance Migration
-- Phase 3: User account lockout fields

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Phase 6: Breach Reports

CREATE TYPE "BreachReportStatus" AS ENUM (
  'OPEN',
  'INVESTIGATING',
  'IPC_NOTIFIED',
  'INDIVIDUALS_NOTIFIED',
  'RESOLVED'
);

CREATE TABLE IF NOT EXISTS breach_reports (
  id TEXT PRIMARY KEY,
  discovered_at TIMESTAMPTZ NOT NULL,
  reported_by TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_count INTEGER NOT NULL,
  data_types TEXT[] NOT NULL DEFAULT '{}',
  containment_actions TEXT NOT NULL,
  status "BreachReportStatus" NOT NULL DEFAULT 'OPEN',
  ipc_notified_at TIMESTAMPTZ,
  individuals_notified_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
