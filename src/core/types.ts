export type ProviderName = 'openai' | 'google' | 'deepgram' | 'elevenlabs' | 'local';

// Timings removed

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  chat_id: string;
  role: MessageRole;
  text: string;
  audioUrl?: string;
  createdAt: string;
  meta?: Record<string, any>;
  client_msg_id?: string;
  status?: 'thinking' | 'complete' | 'error';
  context_injected?: boolean;
  message_number?: number; // Global per-chat ordering key
  pending?: boolean; // Optimistic message flag
  tempId?: string; // Temporary ID for reconciliation
  source?: 'websocket' | 'fetch'; // Message source for animation logic
}

export interface Conversation {
  id: string;
  user_id?: string;
  reportId?: string;
  title?: string;
  created_at: string;
  updated_at: string;
  meta?: Record<string, any>;
  messages: Message[];
}
