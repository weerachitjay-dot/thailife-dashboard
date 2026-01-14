-- Add product column to sheet_time_analysis for filtering
ALTER TABLE "public"."sheet_time_analysis" 
ADD COLUMN IF NOT EXISTS "product" text;

-- Update RLS if needed (Public Read Time already covers select using true)
