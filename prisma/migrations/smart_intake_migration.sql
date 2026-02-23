-- Make sentByUserId nullable on form_packages and form_submissions
-- This allows self-service intake packages where no staff member initiated the form
ALTER TABLE form_packages ALTER COLUMN "sentByUserId" DROP NOT NULL;
ALTER TABLE form_submissions ALTER COLUMN "sentByUserId" DROP NOT NULL;
