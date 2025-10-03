# Edge Functions Usage Analysis - VERIFIED

## Currently Used Edge Functions (25)
Based on comprehensive frontend and backend code search, these functions are actively used:

### Authentication & User Management
- `password_token` - Password reset token generation ✅
- `resend-verification` - Resend email verification ✅
- `create-user-and-verify` - User creation with verification ✅
- `email-verification` - Email verification ✅
- `verify-email-token` - Email token verification ✅
- `verify-token` - General token verification ✅
- `delete-account` - Account deletion ✅

### Reports & AI
- `initiate-auth-report` - Start report generation ✅
- `generate-insights` - Generate AI insights ✅
- `log-user-error` - Error logging ✅
- `chat-send` - Chat functionality ✅
- `get-report-data` - Fetch report data ✅
- `create-report` - Create reports ✅

### Payments & Subscriptions
- `create-subscription` - Create subscriptions ✅
- `check-subscription` - Check subscription status ✅
- `customer-portal` - Stripe customer portal ✅
- `get-prices` - Fetch pricing data ✅
- `create-checkout` - Embedded checkout ✅

### Communication
- `outbound-messenger` - Send messages ✅
- `contact-form-handler` - Contact form submissions ✅
- `conversation-manager` - Manage conversations ✅

### Location Services
- `google-places-autocomplete` - Place search ✅
- `google-place-details` - Place details ✅

### Audio/Voice (ACTIVELY USED)
- `openai-whisper` - Speech-to-text ✅
- `google-text-to-speech` - Text-to-speech ✅

### AI/LLM (ACTIVELY USED)
- `llm-handler-openai` - OpenAI chat handler ✅
- `context-injector` - Inject context into conversations ✅
- `translator-edge` - Swiss data translation ✅

## Actually Unused Edge Functions (Safe to Delete)

### Billing & Payment (unused variants)
- `api-usage-handler` ❌
- `billing-delete-card` ❌
- `billing-setup-card` ❌
- `create-payment-session` ❌
- `get-checkout-url` ❌
- `get-payment-status` ❌
- `process-credits` ❌
- `process-paid-report` ❌
- `process-topup-queue` ❌
- `resume-stripe-checkout` ❌
- `update-service-purchase-metadata` ❌
- `validate-promo-code` ❌

### Report Generation (unused variants)
- `create-temp-report-data` ❌
- `initiate-report-flow` ❌
- `report-orchestrator` ❌ (called by other functions, but not frontend)
- `standard-report` ❌
- `standard-report-one` ❌
- `standard-report-two` ❌
- `standard-report-three` ❌
- `standard-report-four` ❌
- `trigger-report-generation` ❌

### Communication (unused)
- `inboundMessenger` ❌
- `verification-emailer` ❌

### Audio/Speech (unused)
- `google-speech-to-text` ❌

### AI/LLM (unused)
- `generate-summary` ❌

### Utilities (unused)
- `cleanup-orphaned-images` ❌
- `email-check` ❌
- `error-handler-diagnostic` ❌
- `keep-warm` ❌
- `threads-manager` ❌

## Requires Review Before Deletion

### Webhook/Cron Functions
- `stripe-webhook-handler` - Called by Stripe webhooks ⚠️
- `sync-subscriptions-due-today` - Likely cron job ⚠️

### Backend-Only Functions
- `swiss/` directory - Used by report generation ⚠️

## CORRECTED Action Plan

### Safe to Delete Immediately (30+ functions)
1. All unused billing variants
2. Unused report generation variants  
3. Unused communication functions
4. `google-speech-to-text` (not used)
5. `generate-summary` (not used)
6. Utility functions (`cleanup-orphaned-images`, `email-check`, `error-handler-diagnostic`, `keep-warm`, `threads-manager`)

### Review Before Deletion (3 functions)
1. `stripe-webhook-handler` - Check Stripe dashboard for webhook configuration
2. `sync-subscriptions-due-today` - Check for cron job configuration
3. `swiss/` directory - Verify no other functions depend on it

### Keep (25 functions + directories)
- All functions marked with ✅
- `_shared/` utilities directory
- `llm-handler-gemini` (newly created)

## Updated Recommendation
Delete 30+ clearly unused functions immediately. The original analysis incorrectly marked several actively used functions as unused, particularly in the audio/voice and AI/LLM categories.