# Security Configuration

## Environment Variables Required

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://api.therai.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here

# API Keys (Optional - for local development)
VITE_OPENAI_API_KEY=sk-your-openai-key-here
VITE_DEEPGRAM_API_KEY=your-deepgram-key-here
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key-here

# Provider Configuration
VITE_STT_PROVIDER=local
VITE_LLM_PROVIDER=local
VITE_TTS_PROVIDER=local

# Feature Flags
VITE_ENABLE_VOICE_INPUT=true
VITE_ENABLE_TEXT_INPUT=true
```

## Security Fixes Applied

✅ **Fixed hardcoded credentials in `src/integrations/supabase/client.ts`**
- Removed hardcoded Supabase URL and anon key
- Now uses centralized config with environment variables

✅ **Updated `src/integrations/supabase/config.ts`**
- Replaced hardcoded fallback credentials with placeholder values
- Proper environment variable pattern with fallbacks

✅ **No sensitive data exposed in frontend code**
- All credentials now come from environment variables
- Fallback values are placeholders, not real credentials

## Security Best Practices

1. **Never commit real credentials to git**
2. **Use environment variables for all sensitive data**
3. **The anon key is safe to expose in frontend** (it's designed for public use)
4. **Service role keys should NEVER be in frontend code**
5. **Use RLS policies to secure data access**

## Next Steps

1. Set up your `.env.local` file with real credentials
2. Add RLS policies to secure database tables
3. Review and audit any remaining hardcoded values
