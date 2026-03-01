-- Client Portal Phase 2: Add style_profile to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS style_profile JSONB;
