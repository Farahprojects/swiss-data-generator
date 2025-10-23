# TheraiAstro Database Setup Checklist

## ✅ Essential Tables for Swiss Data Generator

### 1. **profiles** (User Management)
**Purpose**: Store user accounts, subscription status, and Stripe data

**Key Columns**:
- `id` - UUID (links to auth.users)
- `email` - User email
- `display_name` - User's display name
- `subscription_active` - Boolean (true if subscribed)
- `subscription_status` - Text (active, inactive, etc.)
- `subscription_plan` - Text (plan name)
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Stripe subscription ID
- `created_at`, `updated_at` - Timestamps

**Why**: Core user data + subscription tracking

---

### 2. **price_list** (Pricing Plans)
**Purpose**: Store subscription pricing information

**Key Columns**:
- `id` - Text (e.g., '30_yearly')
- `endpoint` - Text ('subscription')
- `name` - Text ('Annual Access')
- `description` - Text
- `unit_price_usd` - Numeric (30.00)
- `stripe_price_id` - Text (your Stripe price ID)

**Pre-loaded Data**: $30/year plan

**Why**: Frontend queries this to show pricing

---

### 3. **geo_cache** (Geocoding Cache)
**Purpose**: Cache Google geocoding results (location → lat/lon)

**Key Columns**:
- `place` - Text PRIMARY KEY (e.g., "New York, USA")
- `lat` - Numeric (latitude)
- `lon` - Numeric (longitude)
- `updated_at` - Timestamp

**Why**: translator-edge uses this to avoid repeated Google API calls

---

### 4. **translator_logs** (Activity Logging)
**Purpose**: Log all translator-edge function calls

**Key Columns**:
- `id` - UUID
- `request_type` - Text (natal, transits, etc.)
- `request_payload` - JSONB (input data)
- `swiss_data` - JSONB (output data)
- `response_status` - Integer (200, 500, etc.)
- `processing_time_ms` - Integer
- `google_geo` - Boolean (used Google geocoding?)
- `swiss_error` - Boolean (error occurred?)
- `created_at` - Timestamp

**Why**: Debugging and monitoring

---

### 5. **stripe_webhook_events** (Webhook Audit)
**Purpose**: Store all incoming Stripe webhook events

**Key Columns**:
- `id` - UUID
- `stripe_event_id` - Text UNIQUE
- `stripe_event_type` - Text (e.g., 'customer.subscription.created')
- `stripe_customer_id` - Text
- `payload` - JSONB (full event data)
- `processed` - Boolean
- `processed_at`, `created_at` - Timestamps

**Why**: Stripe webhook handler uses this for audit trail

---

### 6. **payment_method** (Optional)
**Purpose**: Track user payment methods

**Key Columns**:
- `id` - UUID
- `user_id` - UUID
- `stripe_payment_method_id` - Text
- `card_brand`, `card_last4` - Text
- `active` - Boolean
- `next_billing_at` - Timestamp

**Why**: Display payment info in user settings

---


## 🚀 Setup Instructions

### Step 1: Run the SQL Script
1. Open Supabase Dashboard for TheraiAstro project
2. Go to SQL Editor
3. Copy contents of `THERAIAST RO_DATABASE_SETUP.sql`
4. Run the script
5. Verify all tables are created

### Step 2: Update Stripe Price ID
In the `price_list` table, update the row with your actual Stripe price ID:
```sql
UPDATE price_list 
SET stripe_price_id = 'price_YOUR_ACTUAL_STRIPE_ID'
WHERE id = '30_yearly';
```

### Step 3: Update Environment Variables
Create/update `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Update Supabase edge function secrets:
```bash
# In Supabase Dashboard > Edge Functions > Secrets
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_API_KEY=your_google_api_key
SWISS_EPHEMERIS_URL=https://your-swiss-api.com
```

### Step 4: Deploy Edge Functions
```bash
# Deploy essential functions only
supabase functions deploy translator-edge
supabase functions deploy create-subscription-checkout
supabase functions deploy stripe-webhook-handler
supabase functions deploy check-subscription
supabase functions deploy customer-portal
supabase functions deploy cancel-subscription
```

**Note**: `swiss` function removed - app calls `translator-edge` directly

### Step 5: Configure Stripe Webhooks
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook-handler`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret and add to Supabase secrets

---

## 📊 What You DON'T Need (Removed from original Therai)

❌ conversations
❌ messages  
❌ threads
❌ reports
❌ insights
❌ blog_posts
❌ calendar_sessions
❌ user_preferences
❌ folders
❌ voice_settings
❌ Many other chat-related tables

**Result**: Clean, focused database for data generation only!

---

## 🧪 Testing

After setup, test:
1. ✅ User signup/login works
2. ✅ Subscription flow works (test mode first!)
3. ✅ Generate page creates data
4. ✅ Webhooks update subscription status
5. ✅ User can access Generate page when subscribed
6. ✅ Paywall shows when not subscribed

