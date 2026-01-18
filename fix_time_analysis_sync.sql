-- =============================================
-- Fix Time Analysis Sync Error
-- Error: "duplicate key value violates unique constraint sheet_time_analysis_day_time_campaign_key"
-- 
-- ปัญหา: Constraint ใน Supabase ไม่ตรงกับ conflictColumns ในโค้ด
-- แก้ไข: สร้าง constraint ใหม่ให้ตรงกับที่โค้ดใช้ (day, time_of_day, ad_id)
-- =============================================

-- Step 1: ตรวจสอบ constraint ที่มีอยู่ทั้งหมด
SELECT conname, contype, 
       pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'sheet_time_analysis'::regclass;

-- Step 2: ลบ constraint เก่าทั้งหมดที่อาจทำให้เกิด conflict
ALTER TABLE sheet_time_analysis 
DROP CONSTRAINT IF EXISTS sheet_time_analysis_day_time_campaign_key;

ALTER TABLE sheet_time_analysis 
DROP CONSTRAINT IF EXISTS sheet_time_analysis_day_time_of_day_campaign_key;

ALTER TABLE sheet_time_analysis 
DROP CONSTRAINT IF EXISTS sheet_time_analysis_day_time_of_day_ad_id_key;

-- Step 3: ลบข้อมูลซ้ำก่อนสร้าง constraint ใหม่
-- (เก็บเฉพาะแถวที่มี id น้อยที่สุดสำหรับแต่ละ key)
DELETE FROM sheet_time_analysis
WHERE id NOT IN (
    SELECT (MIN(id::text))::uuid
    FROM sheet_time_analysis
    GROUP BY day, time_of_day, ad_id
);

-- Step 4: สร้าง UNIQUE constraint ใหม่ที่ตรงกับโค้ด sync.js
-- โค้ดใช้: conflictColumns = 'day,time_of_day,ad_id'
ALTER TABLE sheet_time_analysis 
ADD CONSTRAINT sheet_time_analysis_day_time_of_day_ad_id_key 
UNIQUE (day, time_of_day, ad_id);

-- Step 5: ตรวจสอบว่า constraint ถูกสร้างแล้ว
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'sheet_time_analysis'::regclass
AND contype = 'u';

-- Step 6: นับจำนวนข้อมูลหลังทำความสะอาด
SELECT COUNT(*) as total_rows FROM sheet_time_analysis;

-- =============================================
-- หลังรัน SQL นี้แล้ว ให้กดซิงค์ใหม่อีกครั้ง
-- การซิงค์จะ UPSERT (update ถ้ามีอยู่แล้ว, insert ถ้าใหม่)
-- ไม่ต้องลบข้อมูลทั้งหมดก่อน
-- =============================================
