-- Work Order Redesign: add frame source/status, lens details, QC/prep/verify fields
-- Run via node one-liner, then npx prisma generate

-- Order table: frame source/status
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS frame_condition_notes TEXT;

-- Order table: lens details
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_brand TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_product_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_material TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_tint TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lens_edge_type TEXT;

-- Order table: QC / prepared / verified tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qc_checked_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Prescription table: near PD
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS near_pd DOUBLE PRECISION;
