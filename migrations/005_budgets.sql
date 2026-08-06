CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('monthly', 'category')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  alert_80_sent BOOLEAN NOT NULL DEFAULT FALSE,
  alert_100_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((budget_type = 'monthly' AND category_id IS NULL) OR (budget_type = 'category' AND category_id IS NOT NULL))
);
CREATE UNIQUE INDEX budgets_monthly_unique ON budgets (user_id, year, month) WHERE budget_type = 'monthly';
CREATE UNIQUE INDEX budgets_category_unique ON budgets (user_id, category_id, year, month) WHERE budget_type = 'category';
