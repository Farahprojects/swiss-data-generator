
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useClientData } from '@/hooks/useClientData';
import { Card, CardContent } from '@/components/ui/card';
import { ClientJournalTab } from '@/components/clients/ClientJournalTab';
import ClientReportsTab from '@/components/clients/ClientReportsTab';
import { ClientInsightsTab } from '@/components/clients/ClientInsightsTab';
import EditClientForm from '@/components/clients/EditClientForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen, FileText, Lightbulb } from 'lucide-react';

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { isReady, hasValidAuth, error: authError } = useAuthGuard('ClientDetailPage');
  const [activeTab, setActiveTab] = useState('journal');
  const [showEditModal, setShowEditModal] = useState(false);
  
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'journal':
        return (
          <ClientJournalTab 
            journalEntries={journalEntries}
            onCreateJournal={() => {}}
            onEntryUpdated={loadClientData}
            clientId={client.id}
            isMobile={false}
          />
        );
      case 'reports':
        return (
          <ClientReportsTab 
            clientReports={clientReports}
            onCreateReport={() => {}}
            onViewReport={() => {}}
          />
        );
      case 'insights':
        return (
          <ClientInsightsTab 
            insightEntries={insightEntries}
            client={client}
            journalEntries={journalEntries}
            onInsightGenerated={loadClientData}
            onViewInsight={() => {}}
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
        <div className="w-full px-6 py-4">
          <div className="flex items-center gap-6">
            {/* Client Name */}
            <button
              onClick={() => setShowEditModal(true)}
              className="text-lg font-semibold text-foreground hover:text-primary transition-colors flex-shrink-0"
            >
              {client.full_name}
            </button>

            {/* Tab Navigation - properly spaced */}
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex items-center gap-2 text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'journal' 
                    ? 'text-primary font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Journal ({journalEntries.length})
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
                Reports ({clientReports.length})
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
                Insights ({insightEntries.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            {renderTabContent()}
          </CardContent>
        </Card>
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
    </div>
  );
};

export default ClientDetailPage;
