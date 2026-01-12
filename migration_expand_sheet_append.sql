-- =============================================
-- Migration: Expand sheet_append with all columns
-- =============================================
-- Add missing columns from Google Sheet

-- Step 1: Add missing columns
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS ad_set_name TEXT;
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0;
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS website_leads INTEGER DEFAULT 0;
ALTER TABLE sheet_append ADD COLUMN IF NOT EXISTS messaging_conversations_started INTEGER DEFAULT 0;

-- Step 2: Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sheet_append_campaign_name ON sheet_append(campaign_name);
CREATE INDEX IF NOT EXISTS idx_sheet_append_ad_set_name ON sheet_append(ad_set_name);

-- Note: After running this, you need to:
-- 1. Clear the table: TRUNCATE sheet_append;
-- 2. Re-sync all data from Admin page
