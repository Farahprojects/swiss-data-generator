-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.prompts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,                     -- "Default Chat", "Voice Coach v2", etc.
  kind         text NOT NULL CHECK (kind IN ('chat','voice','both')),
  scope        text NOT NULL CHECK (scope IN ('global','report','conversation')),
  target_id    text,                              -- null for global; set to report_id or conversation_id for overrides
  version      int  NOT NULL DEFAULT 1,
  is_active    boolean NOT NULL DEFAULT true,
  content      text NOT NULL,                     -- the actual system prompt
  params       jsonb NOT NULL DEFAULT '{}'::jsonb,-- e.g. {"temperature":0.7,"top_p":1,"voice":"alloy","speak_style":"calm"}
  notes        text,                              -- optional: why/when this exists
  created_by   text,                              -- optional: admin email/id
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER prompts_touch_updated_at
BEFORE UPDATE ON public.prompts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helpful lookups
CREATE INDEX prompts_active_kind_scope_idx ON public.prompts (is_active, kind, scope);
CREATE INDEX prompts_target_idx           ON public.prompts (scope, target_id);
CREATE INDEX prompts_name_version_idx     ON public.prompts (name, version);
