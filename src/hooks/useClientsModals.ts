
import { useState, useCallback, useEffect } from 'react';
import { useModalState } from '@/contexts/ModalStateProvider';
import { useTabVisibility } from '@/hooks/useTabVisibility';
import { Client, JournalEntry } from '@/types/database';
import { transformReportForDrawer, ClientReport } from '@/utils/clientsFormatters';
import { ClientWithJournal } from '@/types/clients-page';

interface UseClientsModalsProps {
  refreshClientsData: () => Promise<void>;
}

export const useClientsModals = ({ refreshClientsData }: UseClientsModalsProps) => {
  const { modalState, setModalState, preserveModalState } = useModalState();
  const { isVisible } = useTabVisibility();
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<JournalEntry | null>(null);
  const [selectedClientJournalEntries, setSelectedClientJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [showReportDrawer, setShowReportDrawer] = useState(false);

  // Preserve modal state when tab becomes hidden
  useEffect(() => {
    if (!isVisible) {
      preserveModalState();
    }
  }, [isVisible, preserveModalState]);

  const handleClientCreated = useCallback(() => {
    console.log('✅ Client created, refreshing data silently');
    refreshClientsData();
  }, [refreshClientsData]);

  const handleClientUpdated = useCallback(() => {
    console.log('✅ Client updated, refreshing data silently');
    refreshClientsData();
    setModalState('showEditModal', false);
    setSelectedClient(null);
  }, [refreshClientsData, setModalState]);

  const handleJournalCreated = useCallback(() => {
    setModalState('showJournalModal', false);
    setSelectedClient(null);
    setSelectedJournalEntry(null);
    refreshClientsData();
  }, [setModalState, refreshClientsData]);

  const handleInsightGenerated = useCallback(() => {
    setModalState('showInsightModal', false);
    setSelectedClient(null);
    setSelectedClientJournalEntries([]);
    refreshClientsData();
  }, [setModalState, refreshClientsData]);

  const handleReportGenerated = useCallback(() => {
    setModalState('showReportModal', false);
    setSelectedClient(null);
    refreshClientsData();
  }, [setModalState, refreshClientsData]);

  const handleViewReport = useCallback((client: ClientWithJournal) => {
    if (client.latestReport) {
      const transformedData = transformReportForDrawer(client.latestReport);
      setSelectedReportData(transformedData);
      setShowReportDrawer(true);
    }
  }, []);

  return {
    modalState,
    setModalState,
    selectedClient,
    setSelectedClient,
    selectedJournalEntry,
    setSelectedJournalEntry,
    selectedClientJournalEntries,
    setSelectedClientJournalEntries,
    selectedReportData,
    showReportDrawer,
    setShowReportDrawer,
    handleClientCreated,
    handleClientUpdated,
    handleJournalCreated,
    handleInsightGenerated,
    handleReportGenerated,
    handleViewReport
  };
};
