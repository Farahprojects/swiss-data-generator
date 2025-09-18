// src/config/env.ts

// --- Provider Switches ---
// Use this to easily swap between different services without changing the core code.
export const STT_PROVIDER = import.meta.env.VITE_STT_PROVIDER || 'local'; // 'deepgram', 'openai', 'local'
export const LLM_PROVIDER = import.meta.env.VITE_LLM_PROVIDER || 'local'; // 'openai', 'google', 'local'
export const TTS_PROVIDER = import.meta.env.VITE_TTS_PROVIDER || 'local'; // 'elevenlabs', 'openai', 'local'

// --- API Keys ---
// These are placeholders. You should set the actual keys in your .env file.
// Example: VITE_OPENAI_API_KEY="sk-..."
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
export const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
export const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// --- Feature Flags ---
// Use these to toggle features on or off.
export const ENABLE_VOICE_INPUT = import.meta.env.VITE_ENABLE_VOICE_INPUT !== 'false'; // true by default
export const ENABLE_TEXT_INPUT = import.meta.env.VITE_ENABLE_TEXT_INPUT !== 'false'; // true by default

// --- Supabase Config ---
// Re-export from centralized supabase config to maintain compatibility
export { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured as isConfigured } from '@/integrations/supabase/config';


