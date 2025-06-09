
export interface Client {
  id: string;
  coach_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  birth_time?: string;
  birth_location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  client_id: string;
  coach_id: string;
  title?: string;
  entry_text: string;
  tags?: string[];
  linked_report_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InsightEntry {
  id: string;
  client_id: string;
  coach_id: string;
  title?: string;
  content: string;
  type: 'pattern' | 'recommendation' | 'trend' | 'milestone';
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

export interface InsightPrompt {
  id: string;
  name: string;
  description?: string;
  prompt_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  full_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  birth_time?: string;
  birth_location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  avatar_url?: string;
}

export interface CreateJournalEntryData {
  client_id: string;
  title?: string;
  entry_text: string;
  tags?: string[];
  linked_report_id?: string;
}

export interface CreateInsightEntryData {
  client_id: string;
  title?: string;
  content: string;
  type: 'pattern' | 'recommendation' | 'trend' | 'milestone';
  confidence_score?: number;
}
