
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useClientData } from '@/hooks/useClientData';
import ClientDetailHeader from '@/components/clients/ClientDetailHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import ClientJournalTab from '@/components/clients/ClientJournalTab';
import ClientReportsTab from '@/components/clients/ClientReportsTab';
import ClientInsightsTab from '@/components/clients/ClientInsightsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const ClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { isReady, hasValidAuth, error: authError } = useAuthGuard('ClientDetailPage');
  
  const {
    client,
    journalEntries,
    isLoading: clientLoading,
    error: clientError,
    refetch
  } = useClientData(clientId || '', hasValidAuth);

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
  if (clientLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Show client error
  if (clientError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {clientError}
          </AlertDescription>
        </Alert>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ClientDetailHeader client={client} onUpdate={refetch} />
      
      <Tabs defaultValue="journal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <ClientJournalTab 
                clientId={client.id} 
                journalEntries={journalEntries}
                onUpdate={refetch}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <ClientReportsTab clientId={client.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <ClientInsightsTab clientId={client.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetailPage;
