-- =====================================================
-- Migration: Fix Data Sync Duplication Issues (v4 - FINAL)
-- Date: 2026-01-14
-- Copy และ Run ทั้งหมดในครั้งเดียว
-- =====================================================

-- Step 1: Drop constraint first
ALTER TABLE sheet_append DROP CONSTRAINT IF EXISTS sheet_append_row_hash_key;

-- Step 2: Create temp column for new row_hash
UPDATE sheet_append 
SET row_hash = day || '|' || COALESCE(campaign_name, '') || '|' || COALESCE(ad_set_name, '') || '|' || COALESCE(ad_name, '');

-- Step 3: Delete ALL duplicates using ROW_NUMBER (keeps only 1 row per key)
DELETE FROM sheet_append 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY row_hash 
            ORDER BY created_at DESC NULLS LAST
        ) as rn
        FROM sheet_append
    ) sub
    WHERE rn > 1
);

-- Step 4: Re-add unique constraint
ALTER TABLE sheet_append ADD CONSTRAINT sheet_append_row_hash_key UNIQUE (row_hash);

-- Step 5: Clean sheet_time_analysis
DELETE FROM sheet_time_analysis 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY day, COALESCE(time_of_day, ''), COALESCE(ad_id, '')
            ORDER BY created_at DESC NULLS LAST
        ) as rn
        FROM sheet_time_analysis
    ) sub
    WHERE rn > 1
);

-- Step 6: Clean sheet_sent
DELETE FROM sheet_sent 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY day, COALESCE(product, '')
            ORDER BY created_at DESC NULLS LAST
        ) as rn
        FROM sheet_sent
    ) sub
    WHERE rn > 1
);

-- Step 7: Clean sheet_telesales
DELETE FROM sheet_telesales 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY day, COALESCE(product, '')
            ORDER BY created_at DESC NULLS LAST
        ) as rn
        FROM sheet_telesales
    ) sub
    WHERE rn > 1
);

-- Step 8: Add product column if missing
ALTER TABLE sheet_time_analysis ADD COLUMN IF NOT EXISTS product TEXT;

-- DONE! ✅
