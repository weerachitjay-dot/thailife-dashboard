-- =============================================
-- AGGRESSIVE Deduplication for sheet_time_analysis
-- Focus: 2026-01-18 (Specific Date Fix & General Cleanup)
-- Strategy: Keep only ONE entry per (Day, Time, Ad Name)
-- =============================================

-- Step 1: Check how many rows we have for the problematic date
SELECT count(*) as total_rows_2026_01_18 
FROM sheet_time_analysis 
WHERE day = '2026-01-18';

-- Step 2: Identify Duplicates (Aggressive: Ignore Campaign/AdSet differences)
SELECT day, time_of_day, ad_name, COUNT(*) as cnt
FROM sheet_time_analysis
WHERE day = '2026-01-18' -- Focus on valid range first
GROUP BY day, time_of_day, ad_name
HAVING COUNT(*) > 1;

-- Step 3: DELETE DUPLICATES (Aggressive)
-- Keep ONLY the row with the MAX(ctid) (latest inserted)
DELETE FROM sheet_time_analysis a
USING sheet_time_analysis b
WHERE a.ctid < b.ctid
  AND a.day = b.day
  AND a.time_of_day = b.time_of_day
  AND a.ad_name = b.ad_name; -- Strict unique key

-- Step 4: Verify Cleaning
SELECT count(*) as remaining_rows_2026_01_18 
FROM sheet_time_analysis 
WHERE day = '2026-01-18';
