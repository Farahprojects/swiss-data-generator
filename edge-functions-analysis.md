# Edge Functions Usage Analysis - UPDATED 2025-10-19

## Currently Used Edge Functions (39)
Based on comprehensive frontend and backend code search, these functions are actively used:

### Authentication & User Management (7)
- ✅ `password_token` - Password reset token generation
- ✅ `resend-verification` - Resend email verification
- ✅ `create-user-and-verify` - User creation with verification
- ✅ `email-verification` - Email verification
- ✅ `verify-email-token` - Email token verification
- ✅ `verify-token` - General token verification
- ✅ `delete-account` - Account deletion

### Reports & AI (6)
- ✅ `create-report` - Create reports
- ✅ `get-report-data` - Fetch report data (used in ReportSlideOver)
- ✅ `generate-insights` - Generate AI insights
- ✅ `log-user-error` - Error logging
- ✅ `chat-send` - Chat functionality
- ✅ `initiate-auth-report` - **CRITICAL** Called by conversation-manager when creating conversations with report_data

### Payments & Subscriptions (7)
- ✅ `create-subscription` - Create subscriptions (SubscriptionPaywall)
- ✅ `check-subscription` - Check subscription status
- ✅ `customer-portal` - Stripe customer portal
- ✅ `get-prices` - Fetch pricing data
- ✅ `create-subscription-checkout` - Subscription checkout
- ✅ `cancel-subscription` - Cancel subscription
- ✅ `update-subscription` - Update subscription

### Communication (3)
- ✅ `outbound-messenger` - Send messages (ComposeModal, ReplyModal)
- ✅ `contact-form-handler` - Contact form submissions
- ✅ `conversation-manager` - Manage conversations (CRUD operations)

### Location Services (2)
- ✅ `google-places-autocomplete` - Place search
- ✅ `google-place-details` - Place details

### Audio/Voice (2)
- ✅ `google-whisper` - Speech-to-text (used in voice/stt service)
- ✅ `google-text-to-speech` - **CRITICAL** Text-to-speech called by llm-handler-gemini for voice chat mode

### AI/LLM (3)
- ✅ `llm-handler-openai` - OpenAI chat handler (used via chat-send)
- ✅ `llm-handler-gemini` - Gemini chat handler (used via chat-send)
- ✅ `context-injector` - Inject context into conversations

### Backend/Infrastructure (8)
- ✅ `translator-edge` - Swiss ephemeris data translation (DO NOT DELETE)
- ✅ `report-orchestrator` - Orchestrates report generation, calls standard-report engines (DO NOT DELETE)
- ✅ `swiss/` - Swiss ephemeris calculations (DO NOT DELETE)
- ✅ `standard-report` - AI report generation engine (called by orchestrator)
- ✅ `standard-report-one` - AI report generation engine (called by orchestrator)
- ✅ `standard-report-two` - AI report generation engine (called by orchestrator)
- ✅ `standard-report-three` - AI report generation engine (called by orchestrator)
- ✅ `standard-report-four` - AI report generation engine (called by orchestrator)

---

## Backend/Webhook Functions (1)

### Webhooks (KEEP)
- ✅ `stripe-webhook-handler` - Called by Stripe webhooks (REQUIRED - handles all Stripe events, real-time subscription sync)

**Stripe Flow Verified:**
Frontend → `create-subscription-checkout` → Stripe → `stripe-webhook-handler` → Updates profiles/payment_method tables in real-time

---

## SAFE TO DELETE - Unused Functions (30)

### Billing & Payment Variants (14)
These are old/duplicate billing implementations:
- ❌ `api-usage-handler`
- ❌ `billing-delete-card`
- ❌ `billing-setup-card`
- ❌ `create-checkout` (replaced by create-subscription-checkout)
- ❌ `create-payment-intent`
- ❌ `create-payment-session`
- ❌ `get-checkout-url`
- ❌ `get-payment-status`
- ❌ `process-credits`
- ❌ `process-paid-report`
- ❌ `process-topup-queue`
- ❌ `resume-stripe-checkout`
- ❌ `update-service-purchase-metadata`
- ❌ `validate-promo-code`

### Report Generation Variants (3)
Old/unused report workflow functions:
- ❌ `create-temp-report-data`
- ❌ `initiate-report-flow`
- ❌ `trigger-report-generation`

### Communication (2)
- ❌ `inboundMessenger`
- ❌ `verification-emailer`

### Audio/Voice (2)
- ❌ `google-speech-to-text` (replaced by google-whisper)
- ❌ `openai-whisper` (replaced by google-whisper)

### Authentication Variants (2)
- ❌ `signup_token` (functionality merged into create-user-and-verify)
- ❌ `update-password` (handled by Supabase Auth directly)

### Utilities (7)
- ❌ `cleanup-orphaned-images`
- ❌ `email-check`
- ❌ `error-handler-diagnostic`
- ❌ `keep-warm`
- ❌ `threads-manager`
- ❌ `generate-summary`
- ❌ `sync-subscriptions-due-today` (redundant - Stripe webhooks handle subscription sync in real-time)

---

## Action Plan

### 1. Delete Immediately (30 functions)
These are confirmed unused based on frontend code search:
```bash
# Billing variants (14)
api-usage-handler
billing-delete-card
billing-setup-card
create-checkout
create-payment-intent
create-payment-session
get-checkout-url
get-payment-status
process-credits
process-paid-report
process-topup-queue
resume-stripe-checkout
update-service-purchase-metadata
validate-promo-code

# Report variants (3)
create-temp-report-data
initiate-report-flow
trigger-report-generation

# Communication (2)
inboundMessenger
verification-emailer

# Audio/Voice (2)
google-speech-to-text
openai-whisper

# Auth variants (2)
signup_token
update-password

# Utilities (7)
cleanup-orphaned-images
email-check
error-handler-diagnostic
keep-warm
threads-manager
generate-summary
sync-subscriptions-due-today
```

### 2. Keep All (39 functions + _shared)
All functions marked with ✅ above, including:
- All standard-report engines (AI report generation)
- translator-edge & swiss/ (ephemeris calculations)
- report-orchestrator (calls standard-report engines)
- initiate-auth-report (called by conversation-manager)

---

## Total Summary
- **Keep**: 38 active functions + 1 webhook (stripe-webhook-handler) = **39 functions**
- **Delete**: **30 unused functions** (including sync-subscriptions-due-today)
- **Space saved**: ~43% of edge functions (30 deleted out of 69 total)

## Critical Backend Connections (DO NOT DELETE)
These functions are called by other edge functions, not directly from frontend:
- `initiate-auth-report` - Called by **conversation-manager** when creating conversations with report_data
- `google-text-to-speech` - Called by **llm-handler-gemini** for voice chat mode
- `report-orchestrator` - Called by report generation flow
- `standard-report` engines - Called by report-orchestrator
- `translator-edge` - Swiss ephemeris data translation
- `swiss/` - Swiss ephemeris calculations

## Stripe Payment Flow (VERIFIED ✅)
```
Frontend                    Edge Function                    Stripe                      Webhook
───────────────────────────────────────────────────────────────────────────────────────────────
create-subscription         create-subscription              Creates customer            stripe-webhook-handler
  (SubscriptionPaywall)                                       Creates checkout            - Updates profiles
                                                              Redirects user              - Updates payment_method
check-subscription          check-subscription               Checks status               - Handles all events
  (SubscriptionSuccess)     
customer-portal             customer-portal                  Opens portal                stripe-webhook-handler
  (BillingPanel)                                              Manages subscription        - Syncs changes
create-subscription         create-subscription-checkout     Creates checkout            stripe-webhook-handler
  -checkout                                                   Returns session URL         - Processes completion
cancel-subscription         cancel-subscription              Cancels subscription        stripe-webhook-handler
  (CancelModal)                                                                           - Updates status
update-subscription         update-subscription              Updates subscription        stripe-webhook-handler
  (BillingPanel)                                              plan/billing                - Syncs changes
```
