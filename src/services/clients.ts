
import { supabase } from '@/integrations/supabase/client';
import { Client, CreateClientData } from '@/types/database';

export const clientsService = {
  // Get all clients for the current user
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }

    return data || [];
  },

  // Get a single client by ID
  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching client:', error);
      throw error;
    }

    return data;
  },

  // Create a new client
  async createClient(clientData: CreateClientData): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...clientData,
        coach_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw error;
    }

    return data;
  },

  // Update a client
  async updateClient(id: string, updates: Partial<CreateClientData>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      throw error;
    }

    return data;
  },

  // Delete a client
  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }
};
