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
