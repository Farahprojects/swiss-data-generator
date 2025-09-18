
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
  swiss_data: any;
  created_at: string;
  response_status: number;
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
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const { toast } = useToast();
  const loadingRef = useRef(false);
  const hasInitiallyLoadedRef = useRef(false);

  const loadClients = async (forceRefresh = false) => {
    // Prevent concurrent loads
    if (loadingRef.current && !forceRefresh) return;
    
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && clientsCache && (now - clientsCache.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached client data');
      setClients(clientsCache.data);
      
      // Only set loading to false if this is the initial load
      if (!hasInitiallyLoadedRef.current) {
        setLoading(false);
        hasInitiallyLoadedRef.current = true;
      }
      return;
    }

    try {
      loadingRef.current = true;
      
      // Only show loading spinner for initial loads, background indicator for refreshes
      if (!hasInitiallyLoadedRef.current) {
        console.log('🔄 Initial load: Fetching fresh client data');
        setLoading(true);
      } else {
        console.log('🔄 Background refresh: Fetching fresh client data');
        setBackgroundRefreshing(true);
      }
      
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
      console.log('✅ Clients data loaded successfully:', clientsWithJournals.length, 'clients');
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Always update loading state after operation completes
      if (!hasInitiallyLoadedRef.current) {
        setLoading(false);
        hasInitiallyLoadedRef.current = true;
      } else {
        setBackgroundRefreshing(false);
      }
      loadingRef.current = false;
    }
  };

  // Invalidate cache when needed - this will do a background refresh
  const invalidateCache = async () => {
    console.log('🗑️ Invalidating clients cache - background refresh only');
    clientsCache = null;
    await loadClients(true);
  };

  useEffect(() => {
    loadClients();
  }, []);

  return {
    clients,
    loading: loading && !hasInitiallyLoadedRef.current, // Only show loading during initial load
    backgroundRefreshing,
    loadClients: () => loadClients(true),
    invalidateCache
  };
};
