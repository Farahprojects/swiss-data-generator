
import { supabaseWithAuth } from '@/utils/supabaseWithAuth';
import { Client } from '@/types/database';
import { logToSupabase } from '@/utils/batchedLogManager';

export const clientsService = {
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabaseWithAuth.query('clients', (client) =>
      client
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
    );

    if (error) {
      logToSupabase('Failed to fetch clients', {
        level: 'error',
        page: 'clientsService',
        data: { error: error.message }
      });
      throw new Error(error.message || 'Failed to fetch clients');
    }

    return data || [];
  },

  async getClientById(id: string): Promise<Client | null> {
    const { data, error } = await supabaseWithAuth.query('clients', (client) =>
      client
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle()
    );

    if (error) {
      logToSupabase('Failed to fetch client by ID', {
        level: 'error',
        page: 'clientsService',
        data: { error: error.message, clientId: id }
      });
      throw new Error(error.message || 'Failed to fetch client');
    }

    return data;
  },

  async createClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const { data, error } = await supabaseWithAuth.query('clients', (client) =>
      client
        .from('clients')
        .insert(clientData)
        .select()
        .single()
    );

    if (error) {
      logToSupabase('Failed to create client', {
        level: 'error',
        page: 'clientsService',
        data: { error: error.message }
      });
      throw new Error(error.message || 'Failed to create client');
    }

    return data;
  },

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabaseWithAuth.query('clients', (client) =>
      client
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    );

    if (error) {
      logToSupabase('Failed to update client', {
        level: 'error',
        page: 'clientsService',
        data: { error: error.message, clientId: id }
      });
      throw new Error(error.message || 'Failed to update client');
    }

    return data;
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabaseWithAuth.query('clients', (client) =>
      client
        .from('clients')
        .delete()
        .eq('id', id)
    );

    if (error) {
      logToSupabase('Failed to delete client', {
        level: 'error',
        page: 'clientsService',
        data: { error: error.message, clientId: id }
      });
      throw new Error(error.message || 'Failed to delete client');
    }
  }
};
