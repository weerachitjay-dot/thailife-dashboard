-- =============================================
-- Fix Duplicate Data in sheet_time_analysis
-- =============================================

-- Step 1: Check for duplicates (run this first to see current state)
SELECT day, time_of_day, ad_id, COUNT(*) as duplicate_count
FROM sheet_time_analysis
GROUP BY day, time_of_day, ad_id
HAVING COUNT(*) > 1
LIMIT 20;

-- Step 2: Delete duplicates, keeping only the first (oldest) record
DELETE FROM sheet_time_analysis
WHERE id NOT IN (
    SELECT MIN(id)
    FROM sheet_time_analysis
    GROUP BY day, time_of_day, ad_id
);

-- Step 3: Verify unique constraint exists (if not, add it)
ALTER TABLE sheet_time_analysis 
DROP CONSTRAINT IF EXISTS sheet_time_analysis_day_time_of_day_ad_id_key;

ALTER TABLE sheet_time_analysis 
ADD CONSTRAINT sheet_time_analysis_day_time_of_day_ad_id_key 
UNIQUE (day, time_of_day, ad_id);

-- Step 4: Verify data count after cleanup
SELECT COUNT(*) as total_rows FROM sheet_time_analysis;
