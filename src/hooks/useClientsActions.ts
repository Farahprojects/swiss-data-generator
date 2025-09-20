
import { useCallback, useState } from 'react';
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

interface ConfirmAction {
  type: 'insight' | 'report' | 'archive' | null;
  client: Client | null;
}

export const useClientsActions = ({
  setSelectedClient,
  setSelectedJournalEntry,
  setSelectedClientJournalEntries,
  setModalState,
  refreshClientsData
}: UseClientsActionsProps) => {
  const { toast } = useToast();
  
  // Initialize state with proper default values
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(() => ({
    type: null,
    client: null
  }));

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

  const handleGenerateInsight = useCallback((client: Client) => {
    setConfirmAction({ type: 'insight', client });
  }, []);

  const handleGenerateReport = useCallback((client: Client) => {
    setConfirmAction({ type: 'report', client });
  }, []);

  const handleEditClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setModalState('showEditModal', true);
  }, [setSelectedClient, setModalState]);

  const handleArchiveClient = useCallback((client: Client) => {
    setConfirmAction({ type: 'archive', client });
  }, []);

  const executeInsightGeneration = useCallback(async (client: Client) => {
    try {
      console.log('💡 Generating insight for client:', client.full_name);
      setSelectedClient(client);
      
      const journalEntries = await journalEntriesService.getJournalEntries(client.id);
      console.log('📔 Loaded journal entries for insight:', journalEntries.length, 'entries');
      setSelectedClientJournalEntries(journalEntries);
      
      setModalState('showInsightModal', true);
      setConfirmAction({ type: null, client: null });
    } catch (error) {
      console.error('Error loading journal entries for insight:', error);
      toast({
        title: "Error",
        description: "Failed to load journal entries. Please try again.",
        variant: "destructive",
      });
      setConfirmAction({ type: null, client: null });
    }
  }, [setSelectedClient, setSelectedClientJournalEntries, setModalState, toast]);

  const executeReportGeneration = useCallback((client: Client) => {
    setSelectedClient(client);
    setModalState('showReportModal', true);
    setConfirmAction({ type: null, client: null });
  }, [setSelectedClient, setModalState]);

  const executeArchiveClient = useCallback(async (client: Client) => {
    try {
      await clientsService.deleteClient(client.id);
      toast({
        title: "Client Archived",
        description: `${client.full_name} has been archived successfully.`,
      });
      refreshClientsData();
      setConfirmAction({ type: null, client: null });
    } catch (error) {
      console.error('Error archiving client:', error);
      toast({
        title: "Error",
        description: "Failed to archive client. Please try again.",
        variant: "destructive",
      });
      setConfirmAction({ type: null, client: null });
    }
  }, [toast, refreshClientsData]);

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction.client) return;

    switch (confirmAction.type) {
      case 'insight':
        executeInsightGeneration(confirmAction.client);
        break;
      case 'report':
        executeReportGeneration(confirmAction.client);
        break;
      case 'archive':
        executeArchiveClient(confirmAction.client);
        break;
    }
  }, [confirmAction, executeInsightGeneration, executeReportGeneration, executeArchiveClient]);

  const handleCancelAction = useCallback(() => {
    setConfirmAction({ type: null, client: null });
  }, []);

  return {
    handleCreateJournal,
    handleEditJournal,
    handleGenerateInsight,
    handleGenerateReport,
    handleEditClient,
    handleArchiveClient,
    confirmAction,
    handleConfirmAction,
    handleCancelAction
  };
};
