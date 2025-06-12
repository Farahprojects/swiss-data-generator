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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen, FileText, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PdfGenerator } from '@/services/pdf/PdfGenerator';
import { transformLogDataToPdfData } from '@/services/pdf/utils/reportDataTransformer';
import { useToast } from '@/hooks/use-toast';

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { isReady, hasValidAuth, error: authError } = useAuthGuard('ClientDetailPage');
  const [activeTab, setActiveTab] = useState('journal');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [viewingInsight, setViewingInsight] = useState<any>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
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

  const handleViewReport = async (report: any) => {
    try {
      // Transform the report data to PDF format
      const pdfData = transformLogDataToPdfData(report);
      
      // Generate and download the PDF
      await PdfGenerator.generateReportPdf(pdfData);
      
      toast({
        title: "Success",
        description: "Report PDF generated and downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewInsight = (insight: any) => {
    setViewingInsight(insight);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'journal':
        return (
          <ClientJournalTab 
            journalEntries={journalEntries}
            onCreateJournal={() => {}}
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

      {/* Insight View Modal */}
      {viewingInsight && (
        <Dialog open={!!viewingInsight} onOpenChange={() => setViewingInsight(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {viewingInsight.title || `${viewingInsight.type} Insight`}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Generated on {new Date(viewingInsight.created_at).toLocaleDateString()}
                  {viewingInsight.confidence_score && 
                    ` • ${viewingInsight.confidence_score}% confidence`
                  }
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {viewingInsight.content}
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setViewingInsight(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClientDetailPage;
