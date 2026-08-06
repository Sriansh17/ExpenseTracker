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
