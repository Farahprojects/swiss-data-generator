-- Add context_injected flag to conversations to mark server-side context attachment
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS context_injected boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_conversations_context_injected
ON public.conversations(context_injected);


