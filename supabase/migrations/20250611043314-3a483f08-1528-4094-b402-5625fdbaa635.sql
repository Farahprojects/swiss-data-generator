
-- Add client_view_mode column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS client_view_mode TEXT DEFAULT 'grid' CHECK (client_view_mode IN ('grid', 'list'));

-- Update existing rows to have the default value
UPDATE public.user_preferences 
SET client_view_mode = 'grid' 
WHERE client_view_mode IS NULL;

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN public.user_preferences.client_view_mode IS 'User preferred view mode for clients page (grid or list)';
