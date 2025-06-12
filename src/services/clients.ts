
import { supabaseWithAuth } from '@/utils/supabaseWithAuth';
import { Client, CreateClientData } from '@/types/database';
import { logToSupabase } from '@/utils/batchedLogManager';
import { authService } from '@/services/authService';

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

    return (data as Client[]) || [];
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

    return (data as Client) || null;
  },

  async createClient(clientData: CreateClientData): Promise<Client> {
    // Ensure we have the current user's ID for coach_id
    const session = await authService.ensureValidSession();
    if (!session?.user?.id) {
      throw new Error('Authentication required to create client');
    }

    const dataWithCoachId = {
      ...clientData,
      coach_id: session.user.id
    };

    const { data, error } = await supabaseWithAuth.query('clients', (client) =>
      client
        .from('clients')
        .insert(dataWithCoachId)
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

    if (!data) {
      throw new Error('No data returned from client creation');
    }

    return data as Client;
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

    if (!data) {
      throw new Error('No data returned from client update');
    }

    return data as Client;
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
