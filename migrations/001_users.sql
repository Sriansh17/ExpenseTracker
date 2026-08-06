CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT,
  google_sub TEXT,
  display_name VARCHAR(100),
  avatar_url TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  deletion_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));
CREATE UNIQUE INDEX users_google_sub_idx ON users (google_sub) WHERE google_sub IS NOT NULL;
