# Swiss Data Generator

## Overview

This app generates accurate Swiss ephemeris astrological data in JSON format for use in AI applications.

## Key Features

- **Swiss Ephemeris Integration**: Powered by the `translator-edge` and `swiss` Supabase edge functions
- **Simple Data Generation**: Clean form interface for entering birth details
- **JSON Output**: Structured data ready to copy/paste into AI apps
- **System Prompts Library**: Pre-built prompts for astrology AI integration
- **Annual Subscription**: $30/year for unlimited access

## Main Pages

1. **`/` (Index)**: Landing page with features and sign-up CTA
2. **`/generate`**: Main data generation form (requires auth)
3. **`/prompts`**: System prompts library (requires auth)
4. **`/subscription`**: Subscription paywall and checkout
5. **`/settings`**: User account settings

## Core Technology

### Edge Functions
- **`translator-edge`** (`supabase/functions/translator-edge/index.ts`): 
  - Processes birth data and calls Swiss Ephemeris API
  - Handles geocoding and timezone inference
  - Returns structured JSON data
  
- **`swiss`** (`supabase/functions/swiss/index.ts`):
  - API gateway with authentication
  - Supports both API key and email-based auth
  - Manages user balance and logging

### Subscription System
- Stripe integration for $30/year subscription
- Database migration: `20251024000000_add_30_yearly_plan.sql`
- Single plan model: unlimited generation for one year

## Setup Instructions

### 1. Environment Variables

Create `.env.local` with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Database Migration

Run the pricing migration:
```sql
-- Update the Stripe price ID in:
supabase/migrations/20251024000000_add_30_yearly_plan.sql
```

Then apply:
```bash
supabase db push
```

### 3. Stripe Setup

1. Create a product in Stripe Dashboard
2. Set up a $30/year recurring price
3. Copy the price ID to the migration file
4. Update webhook endpoint for subscription events

### 4. Install & Run

```bash
npm install
npm run dev
```

## Removed Features (from original Therai app)

- Chat/conversation system
- Real-time messaging
- Thread management
- Blog system
- Calendar/booking
- Activity logs
- Multiple pricing tiers
- Voice features
- Reports/insights generation

## What Remains

- Authentication (Supabase Auth)
- Subscription management (Stripe)
- User settings
- Swiss ephemeris data generation
- Clean, minimal UI

## Deployment

The app is configured for Vercel deployment:
- `vercel.json` included
- Edge functions deploy to Supabase
- Static assets via Vercel

## Next Steps

1. **Create Stripe Product**: Set up the $30/year product and get price ID
2. **Update Migration**: Add your Stripe price ID to the migration
3. **Test Subscription Flow**: End-to-end test from signup to data generation
4. **Deploy**: Push to Vercel and Supabase

## Notes

- The Swiss ephemeris API must be configured in your Supabase environment
- Google API key required for geocoding (location → lat/lon)
- All astro data generation requires active subscription

