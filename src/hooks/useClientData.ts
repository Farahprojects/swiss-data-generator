
import { useState, useEffect } from 'react';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { clientReportsService } from '@/services/clientReports';
import { Client, JournalEntry, InsightEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
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
      const [clientData, journalData, reportsData] = await Promise.all([
        clientsService.getClient(clientId),
        journalEntriesService.getJournalEntries(clientId),
        clientReportsService.getClientReports(clientId)
      ]);
      
      setClient(clientData);
      setJournalEntries(journalData);
      setClientReports(reportsData);
      setInsightEntries([]); // Empty for now until we implement the service
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
