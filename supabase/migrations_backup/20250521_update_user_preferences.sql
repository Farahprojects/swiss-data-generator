
-- Add new columns for specific notification types
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS password_change_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_change_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS security_alert_notifications BOOLEAN DEFAULT TRUE;

-- Update any existing rows to have default values
UPDATE public.user_preferences
SET 
  password_change_notifications = TRUE,
  email_change_notifications = TRUE,
  security_alert_notifications = TRUE
WHERE password_change_notifications IS NULL
   OR email_change_notifications IS NULL
   OR security_alert_notifications IS NULL;

-- Add comment to explain the purpose of these columns
COMMENT ON COLUMN public.user_preferences.password_change_notifications IS 'Whether to send notifications when password is changed';
COMMENT ON COLUMN public.user_preferences.email_change_notifications IS 'Whether to send notifications when email is changed';
COMMENT ON COLUMN public.user_preferences.security_alert_notifications IS 'Whether to send notifications for security events';
