-- Add CURRENT_GLASSES to PrescriptionSource enum
ALTER TYPE "PrescriptionSource" ADD VALUE IF NOT EXISTS 'CURRENT_GLASSES';
