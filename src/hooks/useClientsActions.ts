
import { useCallback } from 'react';
import { journalEntriesService } from '@/services/journalEntries';
import { clientsService } from '@/services/clients';
import { useToast } from '@/hooks/use-toast';
import { Client, JournalEntry } from '@/types/database';
import { ClientWithJournal } from '@/types/clients-page';

interface UseClientsActionsProps {
  setSelectedClient: (client: Client | null) => void;
  setSelectedJournalEntry: (entry: JournalEntry | null) => void;
  setSelectedClientJournalEntries: (entries: JournalEntry[]) => void;
  setModalState: (key: string, value: boolean) => void;
  refreshClientsData: () => Promise<void>;
}

export const useClientsActions = ({
  setSelectedClient,
  setSelectedJournalEntry,
  setSelectedClientJournalEntries,
  setModalState,
  refreshClientsData
}: UseClientsActionsProps) => {
  const { toast } = useToast();

  const handleCreateJournal = useCallback((client: Client) => {
    setSelectedClient(client);
    setSelectedJournalEntry(null);
    setModalState('showJournalModal', true);
  }, [setSelectedClient, setSelectedJournalEntry, setModalState]);

  const handleEditJournal = useCallback((client: ClientWithJournal) => {
    if (client.latestJournalEntry) {
      setSelectedClient(client);
      setSelectedJournalEntry(client.latestJournalEntry);
      setModalState('showJournalModal', true);
    }
  }, [setSelectedClient, setSelectedJournalEntry, setModalState]);

  const handleGenerateInsight = useCallback(async (client: Client) => {
    try {
      console.log('💡 Generating insight for client:', client.full_name);
      setSelectedClient(client);
      
      const journalEntries = await journalEntriesService.getJournalEntries(client.id);
      console.log('📔 Loaded journal entries for insight:', journalEntries.length, 'entries');
      setSelectedClientJournalEntries(journalEntries);
      
      setModalState('showInsightModal', true);
    } catch (error) {
      console.error('Error loading journal entries for insight:', error);
      toast({
        title: "Error",
        description: "Failed to load journal entries. Please try again.",
        variant: "destructive",
      });
    }
  }, [setSelectedClient, setSelectedClientJournalEntries, setModalState, toast]);

  const handleGenerateReport = useCallback((client: Client) => {
    setSelectedClient(client);
    setModalState('showReportModal', true);
  }, [setSelectedClient, setModalState]);

  const handleEditClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setModalState('showEditModal', true);
  }, [setSelectedClient, setModalState]);

  const handleArchiveClient = useCallback(async (client: Client) => {
    if (window.confirm(`Are you sure you want to archive ${client.full_name}? This action cannot be undone.`)) {
      try {
        await clientsService.deleteClient(client.id);
        toast({
          title: "Client Archived",
          description: `${client.full_name} has been archived successfully.`,
        });
        refreshClientsData();
      } catch (error) {
        console.error('Error archiving client:', error);
        toast({
          title: "Error",
          description: "Failed to archive client. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [toast, refreshClientsData]);

  return {
    handleCreateJournal,
    handleEditJournal,
    handleGenerateInsight,
    handleGenerateReport,
    handleEditClient,
    handleArchiveClient
  };
};
