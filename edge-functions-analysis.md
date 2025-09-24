# Edge Functions Usage Analysis

## Currently Used Edge Functions (23)
Based on frontend code search, these functions are actively used:

### Authentication & User Management
- `password_token` - Password reset token generation
- `resend-verification` - Resend email verification
- `create-user-and-verify` - User creation with verification
- `email-verification` - Email verification
- `verify-email-token` - Email token verification
- `verify-token` - General token verification
- `delete-account` - Account deletion

### Reports & AI
- `initiate-auth-report` - Start report generation
- `generate-insights` - Generate AI insights
- `log-user-error` - Error logging
- `chat-send` - Chat functionality

### Payments & Subscriptions
- `create-subscription-checkout` - Subscription checkout
- `create-payment-intent` - Payment processing
- `mark-payment-cancelled` - Cancel payments
- `create-subscription` - Create subscriptions
- `check-subscription` - Check subscription status
- `customer-portal` - Stripe customer portal

### Communication
- `outbound-messenger` - Send messages
- `contact-form-handler` - Contact form submissions
- `conversation-manager` - Manage conversations

### Location Services
- `google-places-autocomplete` - Place search
- `google-place-details` - Place details

## Unused Edge Functions (40+)
These functions are NOT referenced in the frontend code and can be removed:

### Billing & Payment (unused variants)
- `api-usage-handler`
- `billing-delete-card`
- `billing-setup-card`
- `create-checkout`
- `create-payment-session`
- `get-checkout-url`
- `get-payment-status`
- `get-prices`
- `process-credits`
- `process-paid-report`
- `process-topup-queue`
- `resume-stripe-checkout`
- `stripe-webhook-handler`
- `sync-subscriptions-due-today`
- `update-service-purchase-metadata`
- `validate-promo-code`

### Report Generation (unused variants)
- `create-report`
- `create-temp-report-data`
- `get-report-data`
- `initiate-report-flow`
- `report-orchestrator`
- `standard-report`
- `standard-report-four`
- `standard-report-one`
- `standard-report-three`
- `standard-report-two`
- `trigger-report-generation`

### Communication (unused)
- `inboundMessenger`
- `verification-emailer`

### Audio/Speech (unused)
- `google-speech-to-text`
- `google-text-to-speech`
- `openai-whisper`

### AI/LLM (unused)
- `context-injector`
- `generate-summary`
- `llm-handler-openai`
- `translator-edge`

### Utilities (unused)
- `cleanup-orphaned-images`
- `email-check`
- `error-handler-diagnostic`
- `keep-warm`
- `threads-manager`

### Directories
- `swiss/` - Swiss ephemeris functions (may be used by backend)
- `_shared/` - Shared utilities (keep this)

## Recommendations

### Safe to Delete (High Confidence)
These functions have clear unused alternatives or are completely unused:
- All `standard-report-*` variants except the one actually used
- Duplicate payment functions (`create-checkout` vs `create-subscription-checkout`)
- Audio processing functions (no frontend audio features)
- `cleanup-orphaned-images` (no image cleanup in frontend)
- `keep-warm` (utility function not called)

### Review Before Deleting
These might be used by backend processes or webhooks:
- `stripe-webhook-handler` - May be called by Stripe webhooks
- `sync-subscriptions-due-today` - May be cron job
- `swiss/` directory - Backend astrology calculations
- `process-*` functions - May be background jobs

### Action Plan
1. Delete the 25+ clearly unused functions
2. Review webhook/cron functions before deletion
3. Keep `_shared/` utilities
4. Monitor logs after deletion to ensure no breaking changes