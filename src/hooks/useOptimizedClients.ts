
import { useState, useEffect, useMemo, useRef } from 'react';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { clientReportsService } from '@/services/clientReports';
import { Client, JournalEntry, InsightEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
  report_tier?: string;
}

interface ClientWithJournal extends Client {
  latestJournalEntry?: JournalEntry;
  latestReport?: ClientReport;
  latestInsight?: InsightEntry;
}

// Cache for client data with timestamp
interface ClientCache {
  data: ClientWithJournal[];
  timestamp: number;
}

const CACHE_DURATION = 30000; // 30 seconds
let clientsCache: ClientCache | null = null;

export const useOptimizedClients = () => {
  const [clients, setClients] = useState<ClientWithJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();
  const loadingRef = useRef(false);

  const loadClients = async (forceRefresh = false) => {
    // Prevent concurrent loads
    if (loadingRef.current && !forceRefresh) return;
    
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && clientsCache && (now - clientsCache.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached client data');
      setClients(clientsCache.data);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    try {
      loadingRef.current = true;
      if (initialLoad) {
        setLoading(true);
      }
      
      console.log('🔄 Fetching fresh client data');
      const clientsData = await clientsService.getClients();
      
      // Load additional data for each client
      const clientsWithJournals = await Promise.all(
        clientsData.map(async (client) => {
          try {
            const [journalEntries, clientReports, insightEntries] = await Promise.all([
              journalEntriesService.getJournalEntries(client.id),
              clientReportsService.getClientReports(client.id),
              supabase
                .from('insight_entries')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false })
                .then(({ data }) => data || [])
            ]);
            
            const latestJournalEntry = journalEntries.length > 0 ? journalEntries[0] : undefined;
            const latestReport = clientReports.length > 0 ? clientReports[0] : undefined;
            const latestInsight = insightEntries.length > 0 ? {
              ...insightEntries[0],
              type: insightEntries[0].type as 'pattern' | 'recommendation' | 'trend' | 'milestone'
            } as InsightEntry : undefined;
            
            return {
              ...client,
              latestJournalEntry,
              latestReport,
              latestInsight
            } as ClientWithJournal;
          } catch (error) {
            console.error(`Error loading data for client ${client.id}:`, error);
            return client as ClientWithJournal;
          }
        })
      );
      
      // Update cache
      clientsCache = {
        data: clientsWithJournals,
        timestamp: now
      };
      
      setClients(clientsWithJournals);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoad(false);
      loadingRef.current = false;
    }
  };

  // Invalidate cache when needed
  const invalidateCache = () => {
    clientsCache = null;
    loadClients(true);
  };

  useEffect(() => {
    loadClients();
  }, []);

  return {
    clients,
    loading,
    initialLoad,
    loadClients: () => loadClients(true),
    invalidateCache
  };
};
