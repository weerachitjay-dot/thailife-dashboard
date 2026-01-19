-- =============================================
-- DANGER ZONE: This script deletes ALL data
-- Purpose: Reset sheet_time_analysis table to start fresh
-- =============================================

-- Option 1: TRUNCATE (Faster, resets ID sequences if needed, but aggressive)
-- RESTART IDENTITY resets the auto-increment ID counter (optional)
TRUNCATE TABLE sheet_time_analysis RESTART IDENTITY;

-- Option 2: DELETE (If Truncate permission is an issue, but Truncate is preferred for reset)
-- DELETE FROM sheet_time_analysis;

-- Verification: Should be 0
SELECT COUNT(*) as "Remaining Rows" FROM sheet_time_analysis;
