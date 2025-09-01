
-- 1) Extend payment_method to carry last charge, next billing and history

ALTER TABLE public.payment_method
  ADD COLUMN IF NOT EXISTS last_charge_at           TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_charge_status       TEXT,
  ADD COLUMN IF NOT EXISTS last_invoice_id          TEXT,
  ADD COLUMN IF NOT EXISTS last_invoice_number      TEXT,
  ADD COLUMN IF NOT EXISTS last_invoice_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS last_invoice_currency    TEXT DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS last_receipt_url         TEXT,
  ADD COLUMN IF NOT EXISTS next_billing_at          TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS invoice_history          JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Helpful index for fast reads/updates on the active card for a user
CREATE INDEX IF NOT EXISTS idx_payment_method_user_active
  ON public.payment_method(user_id, active);

-- Optional: comments for clarity
COMMENT ON COLUMN public.payment_method.last_charge_at IS 'Timestamp of the most recent successful or attempted charge tied to the active subscription';
COMMENT ON COLUMN public.payment_method.last_charge_status IS 'Status of the last charge (e.g., succeeded, failed, requires_payment_method)';
COMMENT ON COLUMN public.payment_method.last_invoice_id IS 'Stripe invoice ID of the last charge (if available)';
COMMENT ON COLUMN public.payment_method.last_invoice_number IS 'Human-friendly invoice number (if available)';
COMMENT ON COLUMN public.payment_method.last_invoice_amount_cents IS 'Amount of the last charge in cents';
COMMENT ON COLUMN public.payment_method.last_invoice_currency IS 'Currency of the last charge';
COMMENT ON COLUMN public.payment_method.last_receipt_url IS 'Receipt URL for the last charge (if available)';
COMMENT ON COLUMN public.payment_method.next_billing_at IS 'Next scheduled billing date for the active subscription';
COMMENT ON COLUMN public.payment_method.invoice_history IS 'Array of compact invoice entries for display in the Billing UI';
