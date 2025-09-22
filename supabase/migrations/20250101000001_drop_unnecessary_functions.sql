-- Drop unnecessary functions and triggers
-- This removes the functions that were causing the search_path security warnings

-- 1. Drop the summary trigger and function
DROP TRIGGER IF EXISTS trigger_summary_check ON messages;
DROP FUNCTION IF EXISTS check_and_trigger_summary();

-- 2. Drop the message number function
DROP FUNCTION IF EXISTS get_next_message_number(UUID);

-- 3. Drop the touch_updated_at trigger and function
DROP TRIGGER IF EXISTS prompts_touch_updated_at ON public.prompts;
DROP FUNCTION IF EXISTS public.touch_updated_at();

-- 4. Drop the temp audio triggers and functions
DROP TRIGGER IF EXISTS update_temp_audio_updated_at ON public.temp_audio;
DROP FUNCTION IF EXISTS update_temp_audio_updated_at();
DROP FUNCTION IF EXISTS cleanup_old_temp_audio();

-- Note: The temp_audio table itself is kept as it might be used elsewhere
-- If you want to drop the table too, uncomment the line below:
-- DROP TABLE IF EXISTS public.temp_audio CASCADE;
