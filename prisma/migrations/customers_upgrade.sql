-- Customer new fields
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS hear_about_us TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_name TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- InsurancePolicy new fields
ALTER TABLE insurance_policies
  ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eligibility_interval_months INT DEFAULT 24;

-- Prescription new fields
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS od_segment_height FLOAT,
  ADD COLUMN IF NOT EXISTS os_segment_height FLOAT;

-- MedicalHistory (1:1 with Customer)
CREATE TABLE IF NOT EXISTS medical_histories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  eye_conditions TEXT[] DEFAULT '{}',
  systemic_conditions TEXT[] DEFAULT '{}',
  medications TEXT,
  allergies TEXT,
  family_glaucoma BOOLEAN DEFAULT FALSE,
  family_amd BOOLEAN DEFAULT FALSE,
  family_high_myopia BOOLEAN DEFAULT FALSE,
  family_colorblind BOOLEAN DEFAULT FALSE,
  had_lasik BOOLEAN DEFAULT FALSE,
  wears_contacts BOOLEAN DEFAULT FALSE,
  contact_type TEXT,
  primary_use TEXT,
  screen_time_daily FLOAT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- StoreCredit (1:N with Customer)
CREATE TABLE IF NOT EXISTS store_credits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount FLOAT NOT NULL,
  used_amount FLOAT DEFAULT 0,
  description TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_credits_customer_id ON store_credits(customer_id);
