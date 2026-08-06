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
