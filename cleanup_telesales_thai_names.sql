-- cleanup_telesales_thai_names.sql
-- Run this script in the Supabase SQL Editor to remove the old Thai product name records.
-- These records were created before the product mapping was updated.
-- The new correct records (LIFE-SENIOR-SUPERCARE) should already be present from the latest sync.

DELETE FROM telesales
WHERE product IN (
    'ประกันชีวิต ซีเนียร์ ซุปเปอร์ แคร์ (เพื่อผู้สูงอายุ)',
    'ซีเนียร์ ซุปเปอร์ แคร์',
    'Super Care'
);

-- Verify deletion (Optional)
-- SELECT * FROM telesales WHERE product LIKE '%ซุปเปอร์%';
