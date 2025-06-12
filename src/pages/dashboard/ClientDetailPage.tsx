
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useClientData } from '@/hooks/useClientData';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientJournalTab } from '@/components/clients/ClientJournalTab';
import ClientReportsTab from '@/components/clients/ClientReportsTab';
import { ClientInsightsTab } from '@/components/clients/ClientInsightsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, BookOpen, FileText, Lightbulb } from 'lucide-react';

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { isReady, hasValidAuth, error: authError } = useAuthGuard('ClientDetailPage');
  const [activeTab, setActiveTab] = useState('journal');
  const [showClientModal, setShowClientModal] = useState(false);
  
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
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Client Name */}
            <Button
              variant="ghost"
              onClick={() => setShowClientModal(true)}
              className="text-lg font-semibold hover:bg-primary/10 hover:text-primary"
            >
              {client.full_name}
            </Button>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant={activeTab === 'journal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('journal')}
                className="flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Journal Entries ({journalEntries.length})
              </Button>
              <Button
                variant={activeTab === 'reports' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('reports')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Reports ({clientReports.length})
              </Button>
              <Button
                variant={activeTab === 'insights' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('insights')}
                className="flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                Insights ({insightEntries.length})
              </Button>
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

      {/* Client Details Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-sm">{client.full_name}</p>
            </div>
            {client.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-sm">{client.phone}</p>
              </div>
            )}
            {client.birth_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Birth Date</label>
                <p className="text-sm">{new Date(client.birth_date).toLocaleDateString()}</p>
              </div>
            )}
            {client.birth_time && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Birth Time</label>
                <p className="text-sm">{client.birth_time}</p>
              </div>
            )}
            {client.birth_location && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Birth Location</label>
                <p className="text-sm">{client.birth_location}</p>
              </div>
            )}
            {client.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetailPage;
