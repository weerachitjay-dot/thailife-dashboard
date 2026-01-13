-- =============================================
-- Add missing columns to sheet_targets table
-- =============================================

-- Add target_sell_price column
ALTER TABLE sheet_targets 
ADD COLUMN IF NOT EXISTS target_sell_price numeric(10, 2) default 0;

-- Add target_cpl2 column (for backup/alternative CPL target)
ALTER TABLE sheet_targets 
ADD COLUMN IF NOT EXISTS target_cpl2 numeric(10, 2) default 0;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sheet_targets';
