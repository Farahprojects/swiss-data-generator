
import { useState, useEffect } from 'react';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { Client, JournalEntry, InsightEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClientReport {
  id: string;
  request_type: string;
  swiss_data: any;
  created_at: string;
  response_status: number;
  report_tier?: string;
  is_archived?: boolean;
}

export const useClientData = (clientId: string | undefined) => {
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [clientReports, setClientReports] = useState<ClientReport[]>([]);
  const [insightEntries, setInsightEntries] = useState<InsightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClientData = async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      
      // Load client reports with report_tier field and filter out archived reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('translator_logs')
        .select('id, request_type, swiss_data, created_at, response_status, report_tier, is_archived')
        .eq('client_id', clientId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Error fetching client reports:', reportsError);
        throw reportsError;
      }

      const [clientData, journalData, insightsData] = await Promise.all([
        clientsService.getClientById(clientId),
        journalEntriesService.getJournalEntries(clientId),
        supabase
          .from('insight_entries')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
      ]);
      
      setClient(clientData);
      setJournalEntries(journalData);
      setClientReports(reportsData || []);
      
      // Cast the insight entries to match our TypeScript interface
      const typedInsights: InsightEntry[] = (insightsData.data || []).map(insight => ({
        ...insight,
        type: insight.type as 'pattern' | 'recommendation' | 'trend' | 'milestone'
      }));
      
      setInsightEntries(typedInsights);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: "Error",
        description: "Failed to load client data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  return {
    client,
    journalEntries,
    clientReports,
    insightEntries,
    loading,
    loadClientData,
    setClientReports
  };
};
