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

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(100),
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX categories_user_name_idx ON categories (user_id, LOWER(name));
CREATE UNIQUE INDEX categories_default_name_idx ON categories (LOWER(name)) WHERE user_id IS NULL;

INSERT INTO categories (name, icon) VALUES
  ('Food', 'food'), ('Transport', 'transport'), ('Housing', 'housing'),
  ('Utilities', 'utilities'), ('Healthcare', 'healthcare'),
  ('Entertainment', 'entertainment'), ('Shopping', 'shopping'), ('Other', 'other');

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  amount BIGINT NOT NULL CHECK (amount BETWEEN 1 AND 999999999),
  expense_date DATE NOT NULL,
  notes VARCHAR(500),
  receipt_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX expenses_user_date_idx ON expenses (user_id, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX expenses_notes_trgm_idx ON expenses USING GIN (notes gin_trgm_ops);

CREATE TABLE expense_tags (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (expense_id, tag)
);
CREATE INDEX expense_tags_tag_idx ON expense_tags (LOWER(tag));

CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount BETWEEN 1 AND 99999999999),
  source VARCHAR(200) NOT NULL,
  income_date DATE NOT NULL,
  notes VARCHAR(500),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX incomes_user_date_idx ON incomes (user_id, income_date DESC) WHERE deleted_at IS NULL;

CREATE TABLE income_tags (
  income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
  tag VARCHAR(30) NOT NULL,
  PRIMARY KEY (income_id, tag)
);
CREATE INDEX income_tags_tag_idx ON income_tags (LOWER(tag));

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- user_id NULL = system-wide defaults, user_id = user-specific overrides
CREATE UNIQUE INDEX idx_merchants_user_name ON merchants (user_id, LOWER(name));

-- Seed common Indian merchants with default category mappings
-- These will be inserted after categories are seeded (category_id references 002_categories defaults)
-- The app will do the actual seeding at runtime using category lookups

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_invalidated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE login_attempts (
  email TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  monthly_limit INTEGER NOT NULL DEFAULT 50000,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

