-- Google Review fields on customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_given BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_date TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_review_note TEXT;

-- Payment method on exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS payment_method TEXT;
