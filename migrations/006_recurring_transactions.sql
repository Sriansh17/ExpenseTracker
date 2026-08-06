CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id),
  source VARCHAR(200),
  notes VARCHAR(500),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK ((type = 'expense' AND category_id IS NOT NULL) OR (type = 'income' AND source IS NOT NULL))
);
CREATE INDEX recurring_due_idx ON recurring_transactions (next_occurrence) WHERE status = 'active';
