-- =============================================
-- Migration: Store All Rows Without Aggregation
-- =============================================
-- Problem: Current UNIQUE(day, product, ad_name) aggregates 24537 -> 5491 rows
-- Solution: Add row_hash as unique identifier calculated from ALL source columns

-- Step 1: Drop old unique constraint
ALTER TABLE sheet_append DROP CONSTRAINT IF EXISTS sheet_append_day_product_ad_name_key;

-- Step 2: Add row_hash column for unique identification
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS row_hash TEXT;

-- Step 3: Add new unique constraint on row_hash
-- This allows ALL rows to be stored uniquely
ALTER TABLE sheet_append ADD CONSTRAINT sheet_append_row_hash_key UNIQUE (row_hash);

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_sheet_append_day ON sheet_append(day);
CREATE INDEX IF NOT EXISTS idx_sheet_append_product ON sheet_append(product);

-- Note: After running this, you need to:
-- 1. Clear the table: TRUNCATE sheet_append;
-- 2. Re-sync all data from Admin page
