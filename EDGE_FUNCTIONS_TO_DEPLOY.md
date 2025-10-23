# Edge Functions to Deploy for Swiss Data Generator

## 🚀 Essential Functions (Must Deploy)

Copy these edge function directories from your old project to TheraiAstro:

### 1. **translator-edge** ⭐ (CRITICAL)
**Path**: `supabase/functions/translator-edge/`
**Purpose**: Core Swiss ephemeris data generation
**Why**: This is your main data generation engine

---

### 2. **create-subscription-checkout**
**Path**: `supabase/functions/create-subscription-checkout/`
**Purpose**: Create Stripe checkout sessions for subscriptions
**Why**: Users need this to subscribe

---

### 3. **stripe-webhook-handler**
**Path**: `supabase/functions/stripe-webhook-handler/`
**Purpose**: Process Stripe webhook events (subscription updates, payments)
**Why**: Updates user subscription status in database

---

### 4. **check-subscription**
**Path**: `supabase/functions/check-subscription/`
**Purpose**: Verify user's subscription status
**Why**: Frontend checks if user has active subscription

---

### 5. **customer-portal**
**Path**: `supabase/functions/customer-portal/`
**Purpose**: Create Stripe customer portal sessions
**Why**: Users manage their subscription/payment methods

---

### 6. **cancel-subscription**
**Path**: `supabase/functions/cancel-subscription/`
**Purpose**: Cancel user subscriptions
**Why**: Allow users to cancel from settings

---

### 7. **email-verification** (Optional but Recommended)
**Path**: `supabase/functions/email-verification/`
**Purpose**: Send email verification links
**Why**: Email verification flow

---

### 8. **_shared** Directory
**Path**: `supabase/functions/_shared/`
**Purpose**: Shared utilities used by multiple functions
**Files to include**:
- `astroFormat.ts` - Astro data formatting
- `astroFormatter.ts` - Additional formatting
- `astroUtils.ts` - Utility functions
- `config.ts` - Configuration
- `cors.ts` - CORS headers

---

## ❌ Functions You DON'T Need (Skip These)

- `swiss/` - ❌ Removed, redundant
- `chat-send/` - ❌ Chat features removed
- `conversation-manager/` - ❌ Chat features removed
- `context-injector/` - ❌ Chat features removed
- `report-orchestrator/` - ❌ Report generation removed
- `generate-insights/` - ❌ Insights removed
- `llm-handler-gemini/` - ❌ LLM features removed
- `google-whisper/` - ❌ Voice features removed
- `google-text-to-speech/` - ❌ Voice features removed
- `openai-whisper/` - ❌ Voice features removed
- `inboundMessenger/` - ❌ Email messaging removed
- `outboundMessenger/` - ❌ Email messaging removed
- `google-places-*` - ❌ Places features removed
- All other chat/conversation/report functions

---

## 📋 Deployment Checklist

### Step 1: Copy Function Directories
From **therai-celestial-nexus** to **swiss-data-generator**:

```bash
# In your terminal
cd /Users/peterfarrah/swiss-data-generator

# Copy essential functions
cp -r ../therai-celestial-nexus/supabase/functions/translator-edge supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/create-subscription-checkout supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/stripe-webhook-handler supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/check-subscription supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/customer-portal supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/cancel-subscription supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/email-verification supabase/functions/
cp -r ../therai-celestial-nexus/supabase/functions/_shared supabase/functions/
```

### Step 2: Deploy to TheraiAstro Supabase

```bash
# Login to Supabase (if not already)
supabase login

# Link to your TheraiAstro project
supabase link --project-ref YOUR_THERAIASTRO_PROJECT_ID

# Deploy all functions
supabase functions deploy translator-edge
supabase functions deploy create-subscription-checkout
supabase functions deploy stripe-webhook-handler
supabase functions deploy check-subscription
supabase functions deploy customer-portal
supabase functions deploy cancel-subscription
supabase functions deploy email-verification
```

### Step 3: Set Environment Secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

```
SUPABASE_URL=https://your-theraiastro-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_...  (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_API_KEY=your_google_api_key
SWISS_EPHEMERIS_URL=https://your-swiss-api.com
GEOCODE_TTL_MIN=1440
GEOCODE_CACHE_TABLE=geo_cache
OUTBOUND_SMTP_ENDPOINT=your_smtp_endpoint (if using email verification)
```

### Step 4: Update Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-theraiastro-project.supabase.co/functions/v1/stripe-webhook-handler`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret to Supabase secrets

---

## 🧪 Test Functions

After deployment, test each function:

```bash
# Test translator-edge
curl -X POST \
  https://your-project.supabase.co/functions/v1/translator-edge \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"request":"natal","birth_date":"1990-01-01","birth_time":"12:00","location":"New York, USA"}'

# Test check-subscription
curl -X POST \
  https://your-project.supabase.co/functions/v1/check-subscription \
  -H "Authorization: Bearer YOUR_USER_JWT"
```

---

## 📦 Summary

**Total Functions**: 7-8 (compared to 40+ in original)

**Critical Path**:
1. User signs up → Supabase Auth
2. User subscribes → `create-subscription-checkout`
3. Stripe confirms → `stripe-webhook-handler`
4. User generates data → `translator-edge`
5. User manages subscription → `customer-portal`, `check-subscription`, `cancel-subscription`

Clean, simple, focused! 🎯

