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
