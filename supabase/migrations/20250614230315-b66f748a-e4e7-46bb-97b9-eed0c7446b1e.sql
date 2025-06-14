
-- Add is_starred, is_archived, and is_read columns to the email_messages table
ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Optionally, add a comment to each for clarity
COMMENT ON COLUMN public.email_messages.is_starred IS 'Indicates if the email is starred by the user';
COMMENT ON COLUMN public.email_messages.is_archived IS 'Indicates if the email is archived (hidden from main view)';
COMMENT ON COLUMN public.email_messages.is_read IS 'Indicates if the email is read or unread for UI purposes';
