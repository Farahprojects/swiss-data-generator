
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowLeft } from 'lucide-react';
import { clientsService } from '@/services/clients';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClientData } from '@/hooks/useClientData';
import EditClientForm from '@/components/clients/EditClientForm';
import CreateJournalEntryForm from '@/components/clients/CreateJournalEntryForm';
import ClientReportModal from '@/components/clients/ClientReportModal';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import { ClientDetailHeader } from '@/components/clients/ClientDetailHeader';
import { ClientInfoCard } from '@/components/clients/ClientInfoCard';
import { ClientJournalTab } from '@/components/clients/ClientJournalTab';
import { ClientReportsTab } from '@/components/clients/ClientReportsTab';
import { ClientInsightsTab } from '@/components/clients/ClientInsightsTab';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
  report_tier?: string;
}

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const { client, journalEntries, clientReports, insightEntries, loading, loadClientData } = useClientData(id);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateJournalModal, setShowCreateJournalModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ClientReport | null>(null);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('journals');

  const handleDeleteClient = async () => {
    if (!client) return;
    
    try {
      await clientsService.deleteClient(client.id);
      toast({
        title: "Success",
        description: "Client deleted successfully.",
      });
      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewReport = (report: ClientReport) => {
    setSelectedReport(report);
    setShowReportDrawer(true);
  };

  const handleGenerateInsight = () => {
    setShowCreateJournalModal(false); // Close any other modals
    setShowReportModal(false);
    // The insights modal will be handled by the ClientInsightsTab component
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading client details...</div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/clients')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Client not found</div>
          <p className="text-gray-600 mb-4">The client you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard/clients')}>
            Return to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <ClientDetailHeader
          client={client}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          journalCount={journalEntries.length}
          reportCount={clientReports.length}
          insightCount={insightEntries.length}
          isClientInfoOpen={isClientInfoOpen}
          setIsClientInfoOpen={setIsClientInfoOpen}
          onCreateJournal={() => setShowCreateJournalModal(true)}
          onCreateReport={() => setShowReportModal(true)}
          onGenerateInsight={handleGenerateInsight}
          isMobile={isMobile}
        />

        {/* Content with proper spacing for fixed header */}
        <div className="pt-20 space-y-6 px-4 md:px-6">
          <ClientInfoCard
            client={client}
            isOpen={isClientInfoOpen}
            onEditClick={() => setShowEditModal(true)}
            onDeleteClient={handleDeleteClient}
            showDeleteDialog={showDeleteDialog}
            setShowDeleteDialog={setShowDeleteDialog}
            alwaysShowOnDesktop={true}
            isMobile={isMobile}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="hidden">
              <TabsTrigger value="journals">Journals</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="journals" className="space-y-4">
              <ClientJournalTab
                journalEntries={journalEntries}
                onCreateJournal={() => setShowCreateJournalModal(true)}
                onEntryUpdated={loadClientData}
                clientId={client?.id || ''}
                isMobile={isMobile}
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <ClientReportsTab
                clientReports={clientReports}
                onCreateReport={() => setShowReportModal(true)}
                onViewReport={handleViewReport}
              />
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <ClientInsightsTab 
                insightEntries={insightEntries}
                client={client}
                journalEntries={journalEntries}
                onInsightGenerated={loadClientData}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Client Modal */}
        {client && (
          <EditClientForm
            client={client}
            open={showEditModal}
            onOpenChange={setShowEditModal}
            onClientUpdated={loadClientData}
          />
        )}

        {/* Create Journal Entry Modal */}
        {client && (
          <CreateJournalEntryForm
            clientId={client.id}
            open={showCreateJournalModal}
            onOpenChange={setShowCreateJournalModal}
            onEntryCreated={loadClientData}
          />
        )}

        {/* Generate Report Modal */}
        {client && (
          <ClientReportModal
            client={client}
            open={showReportModal}
            onOpenChange={setShowReportModal}
            onReportGenerated={loadClientData}
          />
        )}

        {/* Report Viewer Drawer */}
        <ActivityLogDrawer
          isOpen={showReportDrawer}
          onClose={() => setShowReportDrawer(false)}
          logData={selectedReport ? {
            id: selectedReport.id,
            created_at: selectedReport.created_at,
            response_status: selectedReport.response_status,
            request_type: selectedReport.request_type,
            endpoint: selectedReport.request_type,
            report_tier: null,
            total_cost_usd: 0,
            processing_time_ms: null,
            response_payload: selectedReport.response_payload,
            request_payload: null,
            error_message: null,
            google_geo: false
          } : null}
        />
      </div>
    </TooltipProvider>
  );
};

export default ClientDetailPage;
