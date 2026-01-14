-- =====================================================
-- TRUNCATE: ล้างข้อมูลทั้งหมดเพื่อ Sync ใหม่
-- Date: 2026-01-14
-- ⚠️ WARNING: จะลบข้อมูลทั้งหมด!
-- =====================================================

-- ลบ constraint ก่อน (ถ้ามี)
ALTER TABLE sheet_append DROP CONSTRAINT IF EXISTS sheet_append_row_hash_key;

-- ล้างข้อมูลทั้งหมด
TRUNCATE TABLE sheet_append;
TRUNCATE TABLE sheet_sent;
TRUNCATE TABLE sheet_time_analysis;
TRUNCATE TABLE sheet_telesales;
-- TRUNCATE TABLE sheet_targets; -- Uncomment ถ้าต้องการล้าง Targets ด้วย

-- เพิ่ม constraint กลับ
ALTER TABLE sheet_append ADD CONSTRAINT sheet_append_row_hash_key UNIQUE (row_hash);

-- เพิ่ม product column ถ้าไม่มี
ALTER TABLE sheet_time_analysis ADD COLUMN IF NOT EXISTS product TEXT;

-- DONE! ✅ พร้อม Sync ใหม่แล้ว
