
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useClientData } from '@/hooks/useClientData';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { ClientJournalTab } from '@/components/clients/ClientJournalTab';
import ClientReportsTab from '@/components/clients/ClientReportsTab';
import { ClientInsightsTab } from '@/components/clients/ClientInsightsTab';
import EditClientForm from '@/components/clients/EditClientForm';
import ClientReportModal from '@/components/clients/ClientReportModal';
import CreateJournalEntryForm from '@/components/clients/CreateJournalEntryForm';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen, FileText, Lightbulb } from 'lucide-react';

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { isReady, hasValidAuth, error: authError } = useAuthGuard('ClientDetailPage');
  const [activeTab, setActiveTab] = useState('journal');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const isMobile = useIsMobile();
  
  const {
    client,
    journalEntries,
    clientReports,
    insightEntries,
    loading,
    loadClientData
  } = useClientData(clientId);

  // Show loading while auth is being verified
  if (!isReady) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Show auth error
  if (!hasValidAuth) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Authentication required: {authError || 'Please sign in to view client details'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading while client data is being fetched
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Show not found if no client
  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Client not found or you don't have permission to view this client.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateJournal = () => {
    setShowJournalModal(true);
  };

  const handleViewReport = (report: any) => {
    // Transform the report data to match ActivityLogDrawer format
    const transformedData = {
      id: report.id,
      created_at: report.created_at,
      response_status: report.response_status,
      request_type: report.request_type,
      report_tier: report.report_tier,
      total_cost_usd: 0, // This would come from api_usage if available
      processing_time_ms: null,
      response_payload: report.response_payload,
      request_payload: {},
      error_message: report.response_status >= 200 && report.response_status < 300 ? null : 'Report generation failed'
    };
    
    setSelectedReportData(transformedData);
    setShowReportDrawer(true);
  };

  const handleViewInsight = (insight: any) => {
    // Transform the insight data to match ActivityLogDrawer format
    const transformedData = {
      id: insight.id,
      created_at: insight.created_at,
      response_status: 200, // Insights are successfully created if they exist
      request_type: 'insight',
      report_tier: insight.type,
      total_cost_usd: 0,
      processing_time_ms: null,
      response_payload: {
        report: {
          title: insight.title || `${insight.type} Insight`,
          content: insight.content,
          generated_at: insight.created_at,
          type: insight.type,
          confidence_score: insight.confidence_score
        }
      },
      request_payload: {},
      error_message: null
    };
    
    setSelectedReportData(transformedData);
    setShowReportDrawer(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'journal':
        return (
          <ClientJournalTab 
            journalEntries={journalEntries}
            onCreateJournal={handleCreateJournal}
            onEntryUpdated={loadClientData}
            clientId={client.id}
            isMobile={isMobile}
          />
        );
      case 'reports':
        return (
          <ClientReportsTab 
            clientReports={clientReports}
            onCreateReport={() => setShowReportModal(true)}
            onViewReport={handleViewReport}
          />
        );
      case 'insights':
        return (
          <ClientInsightsTab 
            insightEntries={insightEntries}
            client={client}
            journalEntries={journalEntries}
            onInsightGenerated={loadClientData}
            onViewInsight={handleViewInsight}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Sticky Header - positioned under global navigation */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b w-full">
        <div className="w-full px-4 md:px-6 py-4">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Client Name */}
            <button
              onClick={() => setShowEditModal(true)}
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors flex-shrink-0"
            >
              {isMobile ? client.full_name.split(' ')[0] : client.full_name}
            </button>

            {/* Tab Navigation */}
            <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'journal' 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                {!isMobile && `Journal (${journalEntries.length})`}
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'reports' 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" />
                {!isMobile && `Reports (${clientReports.length})`}
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'insights' 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                {!isMobile && `Insights (${insightEntries.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`mx-auto ${isMobile ? 'px-2' : 'container px-6'} py-6`}>
        {renderTabContent()}
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

      {/* Report Modal */}
      {client && (
        <ClientReportModal
          client={client}
          open={showReportModal}
          onOpenChange={setShowReportModal}
          onReportGenerated={loadClientData}
        />
      )}

      {/* Journal Creation Modal */}
      {client && (
        <CreateJournalEntryForm
          clientId={client.id}
          open={showJournalModal}
          onOpenChange={setShowJournalModal}
          onEntryCreated={() => {
            setShowJournalModal(false);
            loadClientData();
          }}
        />
      )}

      {/* Report/Insight Viewer Drawer */}
      <ActivityLogDrawer
        isOpen={showReportDrawer}
        onClose={() => setShowReportDrawer(false)}
        logData={selectedReportData}
      />
    </div>
  );
};

export default ClientDetailPage;
