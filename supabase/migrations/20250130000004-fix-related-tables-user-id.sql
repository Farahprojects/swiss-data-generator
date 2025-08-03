-- Phase 2: Fix Related Tables - Update user_id to proper UUIDs
-- This ensures type consistency and proper foreign key relationships

-- 1. Fix report_logs.user_id from TEXT to UUID
-- First, create a temporary column
ALTER TABLE report_logs ADD COLUMN user_id_new UUID;

-- Update the new column with converted values (only for valid UUIDs)
UPDATE report_logs 
SET user_id_new = user_id::uuid 
WHERE user_id IS NOT NULL 
  AND user_id != '' 
  AND user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop the old column and rename the new one
ALTER TABLE report_logs DROP COLUMN user_id;
ALTER TABLE report_logs RENAME COLUMN user_id_new TO user_id;

-- Add foreign key constraint
ALTER TABLE report_logs 
ADD CONSTRAINT fk_report_logs_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Fix translator_logs.user_id to be NOT NULL
-- First, identify records with NULL user_id
-- We'll need to handle these in the application logic
-- For now, we'll keep it nullable but add a comment
COMMENT ON COLUMN translator_logs.user_id IS 'Should be NOT NULL - will be enforced in application logic';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_logs_user_id ON report_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_translator_logs_user_id ON translator_logs(user_id);

-- 4. Update RLS policies for report_logs and translator_logs
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access own report logs" ON report_logs;
DROP POLICY IF EXISTS "Users can access own translator logs" ON translator_logs;

-- Create new policies with proper user_id checks
CREATE POLICY "Users can access own report logs" 
ON report_logs FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Users can access own translator logs" 
ON translator_logs FOR ALL 
USING (user_id = auth.uid());

-- 5. Enable RLS on both tables if not already enabled
ALTER TABLE report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE translator_logs ENABLE ROW LEVEL SECURITY; 