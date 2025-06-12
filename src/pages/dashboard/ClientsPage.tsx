
import React from 'react';
import { TheraLoader } from '@/components/ui/TheraLoader';
import { useClientViewMode } from '@/hooks/useClientViewMode';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClientsData } from '@/hooks/useClientsData';
import { useClientsActions } from '@/hooks/useClientsActions';
import { useClientsModals } from '@/hooks/useClientsModals';
import { ClientsPageHeader } from '@/components/clients/ClientsPageHeader';
import { ClientsGrid } from '@/components/clients/ClientsGrid';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientsEmptyState } from '@/components/clients/ClientsEmptyState';
import { ClientsModals } from '@/components/clients/ClientsModals';

const ClientsPage = React.memo(() => {
  const { viewMode: savedViewMode, loading: viewModeLoading, updateViewMode } = useClientViewMode();
  const isMobile = useIsMobile();
  
  // Use the saved view mode or default to 'grid' if none is set
  const viewMode = savedViewMode || 'grid';
  
  const clientsData = useClientsData();
  const clientsModals = useClientsModals({ 
    refreshClientsData: clientsData.refreshClientsData 
  });
  
  const clientsActions = useClientsActions({
    setSelectedClient: clientsModals.setSelectedClient,
    setSelectedJournalEntry: clientsModals.setSelectedJournalEntry,
    setSelectedClientJournalEntries: clientsModals.setSelectedClientJournalEntries,
    setModalState: clientsModals.setModalState,
    refreshClientsData: clientsData.refreshClientsData
  });

  // Show loading ONLY during initial load AND view mode loading
  if (clientsData.loading && viewModeLoading) {
    return <TheraLoader message="Loading clients..." size="lg" />;
  }

  const headerProps = {
    backgroundRefreshing: clientsData.backgroundRefreshing,
    searchTerm: clientsData.searchTerm,
    onSearchChange: clientsData.setSearchTerm,
    filterType: clientsData.filterType,
    onFilterChange: clientsData.setFilterType,
    viewMode,
    onViewModeChange: updateViewMode,
    onNewClient: () => clientsModals.setModalState('showNewClientModal', true),
    filteredCount: clientsData.clients.length
  };

  const commonProps = {
    onEditJournal: clientsActions.handleEditJournal,
    onViewReport: clientsModals.handleViewReport,
    onViewInsight: clientsModals.handleViewInsight,
    onCreateJournal: clientsActions.handleCreateJournal,
    onGenerateInsight: clientsActions.handleGenerateInsight,
    onGenerateReport: clientsActions.handleGenerateReport,
    onEditClient: clientsActions.handleEditClient,
    onArchiveClient: clientsActions.handleArchiveClient
  };

  const gridProps = {
    clients: clientsData.clients,
    isMobile
  };

  const tableProps = {
    clients: clientsData.clients,
    sortField: clientsData.sortField,
    sortDirection: clientsData.sortDirection,
    onSort: clientsData.handleSort,
    isMobile,
    ...commonProps
  };

  const emptyStateProps = {
    hasSearchTerm: !!clientsData.searchTerm,
    onNewClient: () => clientsModals.setModalState('showNewClientModal', true)
  };

  const modalsProps = {
    modalState: clientsModals.modalState,
    setModalState: clientsModals.setModalState,
    selectedClient: clientsModals.selectedClient,
    selectedJournalEntry: clientsModals.selectedJournalEntry,
    selectedClientJournalEntries: clientsModals.selectedClientJournalEntries,
    selectedReportData: clientsModals.selectedReportData,
    selectedInsightData: clientsModals.selectedInsightData,
    showReportDrawer: clientsModals.showReportDrawer,
    showInsightDrawer: clientsModals.showInsightDrawer,
    onCloseReportDrawer: () => clientsModals.setShowReportDrawer(false),
    onCloseInsightDrawer: () => clientsModals.setShowInsightDrawer(false),
    onClientCreated: clientsModals.handleClientCreated,
    onClientUpdated: clientsModals.handleClientUpdated,
    onJournalCreated: clientsModals.handleJournalCreated,
    onInsightGenerated: clientsModals.handleInsightGenerated,
    onReportGenerated: clientsModals.handleReportGenerated
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <ClientsPageHeader {...headerProps} />
      
      {viewMode === 'grid' ? (
        <ClientsGrid {...gridProps} />
      ) : (
        <ClientsTable {...tableProps} />
      )}
      
      {clientsData.clients.length === 0 && !clientsData.loading && (
        <ClientsEmptyState {...emptyStateProps} />
      )}
      
      <ClientsModals {...modalsProps} />
    </div>
  );
});

ClientsPage.displayName = 'ClientsPage';

export default ClientsPage;
