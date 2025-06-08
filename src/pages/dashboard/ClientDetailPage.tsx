import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { clientsService } from '@/services/clients';
import { Client } from '@/types/database';
import { ClientDetailHeader } from '@/components/clients/ClientDetailHeader';
import { ClientInfoCard } from '@/components/clients/ClientInfoCard';
import { ClientJournalTab } from '@/components/clients/ClientJournalTab';
import { ClientReportsTab } from '@/components/clients/ClientReportsTab';
import { ClientInsightsTab } from '@/components/clients/ClientInsightsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from '@/hooks/use-mobile';
import { useClientData } from '@/hooks/useClientData';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ClientDetailPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
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

  const [expandedSections, setExpandedSections] = useState({
    info: true,
    journals: false,
    reports: false,
    insights: false,
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('journals');

  const handleSectionToggle = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCreateJournal = () => {
    navigate(`/dashboard/clients/${clientId}/create-journal`);
  };

  const handleCreateReport = () => {
    // TODO: Implement create report functionality
    console.log('Create report clicked');
  };

  const handleEditClient = () => {
    // TODO: Implement edit client functionality
    console.log('Edit client clicked');
  };

  const handleDeleteClient = async () => {
    if (!clientId) return;

    try {
      await clientsService.deleteClient(clientId);
      toast({
        title: "Success",
        description: "Client deleted successfully!",
      });
      navigate('/dashboard/clients');
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6">Loading client details...</div>;
  }

  if (!client) {
    return <div className="container mx-auto px-4 py-6">Client not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <ClientDetailHeader 
        client={client} 
        isMobile={isMobile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        journalCount={journalEntries.length}
        reportCount={clientReports.length}
        insightCount={insightEntries.length}
        isClientInfoOpen={expandedSections.info}
        setIsClientInfoOpen={(open) => setExpandedSections(prev => ({ ...prev, info: open }))}
        onCreateJournal={handleCreateJournal}
        onCreateReport={handleCreateReport}
      />

      <ClientInfoCard
        client={client}
        isOpen={expandedSections.info}
        onEditClick={handleEditClient}
        onDeleteClient={handleDeleteClient}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
      />

      <Tabs defaultValue="journals" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="journals">Journals</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="journals" className="space-y-4">
          <ClientJournalTab
            journalEntries={journalEntries}
            onCreateJournal={handleCreateJournal}
            isMobile={isMobile}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ClientReportsTab
            clientReports={clientReports}
            onCreateReport={handleCreateReport}
            onViewReport={() => {}}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <ClientInsightsTab
            insightEntries={insightEntries}
            clientId={client.id}
            clientGoals={client.notes}
            journalEntries={journalEntries}
            clientReports={clientReports}
            onInsightGenerated={loadClientData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetailPage;
