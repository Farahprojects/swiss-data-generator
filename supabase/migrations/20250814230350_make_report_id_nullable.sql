-- Alter the conversations table to make report_id nullable
ALTER TABLE public.conversations
ALTER COLUMN report_id DROP NOT NULL;
