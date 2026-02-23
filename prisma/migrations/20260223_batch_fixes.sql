-- Add exam billing code to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS exam_billing_code TEXT;

-- Add primary contact fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_contact_relation TEXT;
