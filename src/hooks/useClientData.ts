
import { useState, useEffect } from 'react';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { clientReportsService } from '@/services/clientReports';
import { insightsService } from '@/services/insights';
import { Client, JournalEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
}

interface InsightEntry {
  id: string;
  client_id: string;
  coach_id: string;
  title: string;
  content: string;
  type: 'pattern' | 'recommendation' | 'trend' | 'milestone';
  confidence_score?: number;
  created_at: string;
  updated_at: string;
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
      const [clientData, journalData, reportsData, insightsData] = await Promise.all([
        clientsService.getClient(clientId),
        journalEntriesService.getJournalEntries(clientId),
        clientReportsService.getClientReports(clientId),
        insightsService.getInsightEntries(clientId)
      ]);
      
      setClient(clientData);
      setJournalEntries(journalData);
      setClientReports(reportsData);
      setInsightEntries(insightsData as InsightEntry[]);
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
    loadClientData
  };
};
