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
import { ActionConfirmDialog } from '@/components/clients/ActionConfirmDialog';

const ClientsPage = React.memo(() => {
  const { viewMode: savedViewMode, loading: viewModeLoading, updateViewMode } = useClientViewMode();
  const isMobile = useIsMobile();
  
  // Use the saved view mode or default to 'grid' if none is set
  // But force 'grid' on mobile for display
  const effectiveViewMode = isMobile ? 'grid' : (savedViewMode || 'grid');
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
    viewMode,
    onViewModeChange: updateViewMode,
    onNewClient: () => clientsModals.setModalState('showNewClientModal', true),
    filteredCount: clientsData.clients.length,
    isMobile, // pass mobile status for header
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
    isMobile,
    ...commonProps
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

  const getConfirmDialogProps = () => {
    switch (clientsActions.confirmAction.type) {
      case 'insight':
        return {
          title: 'Generate Insight',
          description: 'This will analyze {clientName}\'s journal entries and generate an astrological insight. This action will consume AI credits.',
          actionLabel: 'Generate Insight'
        };
      case 'report':
        return {
          title: 'Generate Report',
          description: 'This will create a comprehensive astrological report for {clientName}. This action will consume AI credits.',
          actionLabel: 'Generate Report'
        };
      case 'archive':
        return {
          title: 'Archive Client',
          description: 'Are you sure you want to archive {clientName}? This action cannot be undone.',
          actionLabel: 'Archive Client',
          variant: 'destructive' as const
        };
      default:
        return {
          title: '',
          description: '',
          actionLabel: ''
        };
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <ClientsPageHeader {...headerProps} />
      {/* Always grid view on mobile, otherwise respect saved preference */}
      {effectiveViewMode === 'grid' ? (
        <ClientsGrid {...gridProps} />
      ) : (
        <ClientsTable {...tableProps} />
      )}
      
      {clientsData.clients.length === 0 && !clientsData.loading && (
        <ClientsEmptyState {...emptyStateProps} />
      )}
      
      <ClientsModals {...modalsProps} />
      
      <ActionConfirmDialog
        open={clientsActions.confirmAction.type !== null}
        onOpenChange={(open) => !open && clientsActions.handleCancelAction()}
        client={clientsActions.confirmAction.client}
        onConfirm={clientsActions.handleConfirmAction}
        {...getConfirmDialogProps()}
      />
    </div>
  );
});

ClientsPage.displayName = 'ClientsPage';

export default ClientsPage;
