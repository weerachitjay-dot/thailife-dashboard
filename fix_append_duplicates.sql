-- =============================================
-- Fix Duplicate Data in sheet_append (Main)
-- =============================================

-- Step 1: Check for duplicates based on row_hash
SELECT row_hash, COUNT(*) as duplicate_count
FROM sheet_append
WHERE row_hash IS NOT NULL
GROUP BY row_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Step 2: Delete duplicates, keeping only the latest (most recent) record
-- This keeps the evening update (newer data) and removes the morning one
DELETE FROM sheet_append
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY row_hash ORDER BY created_at DESC) as rn
        FROM sheet_append
    ) sub
    WHERE rn > 1
);

-- Step 3: Check current unique constraint
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'sheet_append'::regclass;

-- Step 4: Add UNIQUE constraint on row_hash (required for upsert to work properly)
ALTER TABLE sheet_append 
DROP CONSTRAINT IF EXISTS sheet_append_row_hash_key;

ALTER TABLE sheet_append 
ADD CONSTRAINT sheet_append_row_hash_key 
UNIQUE (row_hash);

-- Step 5: Verify data count after cleanup
SELECT COUNT(*) as total_rows FROM sheet_append;

-- Step 6: Verify no more duplicates exist
SELECT row_hash, COUNT(*) as cnt
FROM sheet_append
GROUP BY row_hash
HAVING COUNT(*) > 1;
