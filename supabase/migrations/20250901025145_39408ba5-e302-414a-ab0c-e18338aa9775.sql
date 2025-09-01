
-- 1) Create a durable audit table for Stripe webhooks (used by the webhook handler)
create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_event_type text not null,
  stripe_kind text not null, -- e.g., 'checkout', 'invoice', 'customer', etc.
  stripe_customer_id text,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

-- Enable RLS and restrict to service role (webhook runs with service role)
alter table public.stripe_webhook_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'stripe_webhook_events' 
      and policyname = 'service_role_manage_stripe_webhook_events'
  ) then
    create policy "service_role_manage_stripe_webhook_events"
      on public.stripe_webhook_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- Helpful indexes (idempotent create using DO block)
do $$
begin
  if not exists (
    select 1 from pg_indexes 
    where schemaname='public' and indexname='idx_stripe_webhook_events_created_at'
  ) then
    create index idx_stripe_webhook_events_created_at
      on public.stripe_webhook_events (created_at desc);
  end if;

  if not exists (
    select 1 from pg_indexes 
    where schemaname='public' and indexname='idx_stripe_webhook_events_processed'
  ) then
    create index idx_stripe_webhook_events_processed
      on public.stripe_webhook_events (processed, created_at desc);
  end if;
end$$;

-- 2) Performance index for fetching the current card quickly
do $$
begin
  if not exists (
    select 1 from pg_indexes 
    where schemaname='public' and indexname='idx_payment_method_user_active'
  ) then
    create index idx_payment_method_user_active
      on public.payment_method (user_id, active);
  end if;
end$$;
