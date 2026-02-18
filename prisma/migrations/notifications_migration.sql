CREATE TYPE "NotificationType" AS ENUM (
  'FORM_COMPLETED', 'INTAKE_COMPLETED', 'ORDER_READY',
  'ORDER_CANCELLED', 'ORDER_LAB_RECEIVED', 'PO_RECEIVED', 'LOW_STOCK'
);

CREATE TABLE notifications (
  id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  type        "NotificationType" NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  href        TEXT,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  ref_id      TEXT,
  ref_type    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX notifications_actor_id_idx ON notifications(actor_id);

CREATE TABLE notification_reads (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  notification_id TEXT        NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (id),
  CONSTRAINT notification_reads_unique UNIQUE (notification_id, user_id)
);
CREATE INDEX notification_reads_user_id_idx ON notification_reads(user_id);

CREATE TABLE notification_preferences (
  id      TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  user_id TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type    "NotificationType" NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_unique UNIQUE (user_id, type)
);
