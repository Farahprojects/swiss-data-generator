
import { supabase } from '@/integrations/supabase/client';
import { JournalEntry, CreateJournalEntryData } from '@/types/database';

export const journalEntriesService = {
  // Get all journal entries for a client
  async getJournalEntries(clientId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journal entries:', error);
      throw error;
    }

    return data || [];
  },

  // Create a new journal entry
  async createJournalEntry(entryData: CreateJournalEntryData): Promise<JournalEntry> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        ...entryData,
        coach_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating journal entry:', error);
      throw error;
    }

    return data;
  },

  // Update a journal entry
  async updateJournalEntry(id: string, updates: Partial<CreateJournalEntryData>): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating journal entry:', error);
      throw error;
    }

    return data;
  },

  // Delete a journal entry
  async deleteJournalEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
  }
};
