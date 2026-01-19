-- =============================================
-- Fix Duplicate Data in sheet_time_analysis
-- CAUSE: Data duplication causing Time Analysis Cost > Meta Cost
-- SCHEMA VERIFIED: day, time_of_day, campaign_name, ad_set_name, ad_name
-- =============================================

-- Step 1: Check for duplicates based on Key Fields
SELECT day, time_of_day, campaign_name, ad_set_name, ad_name, COUNT(*) as duplicate_count
FROM sheet_time_analysis
GROUP BY day, time_of_day, campaign_name, ad_set_name, ad_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Step 2: Delete duplicates, keeping only the latest (most recent) record
-- We use ctid (internal row ID) to act as a unique identifier for deletion
DELETE FROM sheet_time_analysis a
USING sheet_time_analysis b
WHERE a.ctid < b.ctid
  AND a.day = b.day
  AND a.time_of_day = b.time_of_day
  AND a.campaign_name = b.campaign_name
  AND a.ad_set_name = b.ad_set_name
  AND a.ad_name = b.ad_name;

-- Step 3: Verify Data is Clean (Should return 0 rows)
SELECT day, time_of_day, campaign_name, ad_set_name, ad_name, COUNT(*) as duplicate_count
FROM sheet_time_analysis
GROUP BY day, time_of_day, campaign_name, ad_set_name, ad_name
HAVING COUNT(*) > 1;
