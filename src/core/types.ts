import { Database } from '@/integrations/supabase/types';

export type ProviderName = 'openai' | 'google' | 'deepgram' | 'elevenlabs' | 'local';

export type MessageRole = 'user' | 'assistant' | 'system';

// Database message type - 100% aligned with Supabase schema
type DbMessage = Database['public']['Tables']['messages']['Row'];

// Extended message type with UI-only fields
export interface Message extends Omit<DbMessage, 'created_at' | 'meta'> {
  // Renamed fields for frontend convention
  createdAt: string; // maps to created_at
  meta?: Record<string, any>; // typed from Json
  
  // UI-only fields (not in DB)
  pending?: boolean; // Optimistic message flag
  tempId?: string; // Temporary ID for reconciliation
  source?: 'websocket' | 'fetch'; // Message source for animation logic
}

// Database conversation type - 100% aligned with Supabase schema
type DbConversation = Database['public']['Tables']['conversations']['Row'];

// Extended conversation type with UI-only fields
export interface Conversation extends Omit<DbConversation, 'meta'> {
  // Typed meta field
  meta?: Record<string, any>; // typed from Json
  
  // UI-only fields (not in DB)
  messages: Message[]; // Loaded separately, not a DB column
}
