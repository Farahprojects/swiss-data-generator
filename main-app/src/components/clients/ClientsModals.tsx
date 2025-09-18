
import React from 'react';
import ClientForm from '@/components/clients/ClientForm';
import CreateJournalEntryForm from '@/components/clients/CreateJournalEntryForm';
import { GenerateInsightModal } from '@/components/clients/GenerateInsightModal';
import ClientReportModal from '@/components/clients/ClientReportModal';
import EditClientForm from '@/components/clients/EditClientForm';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import { Client, JournalEntry } from '@/types/database';

interface ClientsModalsProps {
  modalState: any;
  setModalState: (key: string, value: boolean) => void;
  selectedClient: Client | null;
  selectedJournalEntry: JournalEntry | null;
  selectedClientJournalEntries: JournalEntry[];
  selectedReportData: any;
  selectedInsightData: any;
  showReportDrawer: boolean;
  showInsightDrawer: boolean;
  onCloseReportDrawer: () => void;
  onCloseInsightDrawer: () => void;
  onClientCreated: () => void;
  onClientUpdated: () => void;
  onJournalCreated: () => void;
  onInsightGenerated: () => void;
  onReportGenerated: () => void;
}

export const ClientsModals: React.FC<ClientsModalsProps> = ({
  modalState,
  setModalState,
  selectedClient,
  selectedJournalEntry,
  selectedClientJournalEntries,
  selectedReportData,
  selectedInsightData,
  showReportDrawer,
  showInsightDrawer,
  onCloseReportDrawer,
  onCloseInsightDrawer,
  onClientCreated,
  onClientUpdated,
  onJournalCreated,
  onInsightGenerated,
  onReportGenerated
}) => {
  return (
    <>
      {/* Client Form Modal */}
      <ClientForm
        open={modalState.showNewClientModal}
        onOpenChange={(open) => setModalState('showNewClientModal', open)}
        onClientCreated={onClientCreated}
      />

      {/* Client-specific Modals */}
      {selectedClient && (
        <>
          <CreateJournalEntryForm
            open={modalState.showJournalModal}
            onOpenChange={(open) => setModalState('showJournalModal', open)}
            clientId={selectedClient.id}
            onEntryCreated={onJournalCreated}
            existingEntry={selectedJournalEntry || undefined}
          />

          <GenerateInsightModal
            open={modalState.showInsightModal}
            onOpenChange={(open) => setModalState('showInsightModal', open)}
            client={selectedClient}
            journalEntries={selectedClientJournalEntries}
            onInsightGenerated={onInsightGenerated}
          />

          <ClientReportModal
            open={modalState.showReportModal}
            onOpenChange={(open) => setModalState('showReportModal', open)}
            client={selectedClient}
            onReportGenerated={onReportGenerated}
          />

          <EditClientForm
            open={modalState.showEditModal}
            onOpenChange={(open) => setModalState('showEditModal', open)}
            client={selectedClient}
            onClientUpdated={onClientUpdated}
          />
        </>
      )}

      {/* Activity Log Drawers */}
      <ActivityLogDrawer
        isOpen={showReportDrawer}
        onClose={onCloseReportDrawer}
        logData={selectedReportData}
      />

      <ActivityLogDrawer
        isOpen={showInsightDrawer}
        onClose={onCloseInsightDrawer}
        logData={selectedInsightData}
      />
    </>
  );
};
