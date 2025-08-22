export type ProviderName = 'openai' | 'google' | 'deepgram' | 'elevenlabs' | 'local';

export interface Timings {
  stt_ms?: number;
  llm_ms?: number;
  tts_ms?: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  chat_id: string;
  role: MessageRole;
  text: string;
  audioUrl?: string;
  timings?: Timings;
  createdAt: string;
  meta?: Record<string, any>;
  client_msg_id?: string;
  status?: 'thinking' | 'complete' | 'error';
}

export interface Conversation {
  id: string;
  guestId?: string;
  reportId?: string;
  createdAt: string;
  updatedAt: string;
  meta?: Record<string, any>;
  messages: Message[];
}
