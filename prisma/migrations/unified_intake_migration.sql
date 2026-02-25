-- Step 1: Add UNIFIED_INTAKE to FormTemplateType enum
-- NOTE: Must run in a separate transaction from any INSERT that uses the new value
ALTER TYPE "FormTemplateType" ADD VALUE IF NOT EXISTS 'UNIFIED_INTAKE';

-- Step 2: Run in a separate transaction after Step 1
-- INSERT INTO form_templates (id, name, type, description, "isActive", "createdAt", "updatedAt")
-- VALUES (gen_random_uuid(), 'Unified Intake Form', 'UNIFIED_INTAKE', 'Single-page intake with check-in, contact, and multi-patient blocks', true, NOW(), NOW());
