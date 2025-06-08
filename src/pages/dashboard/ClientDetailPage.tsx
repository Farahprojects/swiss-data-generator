import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, Plus, Edit, Trash2, FileText, ChevronDown, ChevronUp, Pencil, BookOpen, Lightbulb } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { clientReportsService } from '@/services/clientReports';
import { Client, JournalEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import EditClientForm from '@/components/clients/EditClientForm';
import CreateJournalEntryForm from '@/components/clients/CreateJournalEntryForm';
import ClientReportModal from '@/components/clients/ClientReportModal';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
}

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [client, setClient] = useState<Client | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [clientReports, setClientReports] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateJournalModal, setShowCreateJournalModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ClientReport | null>(null);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('journal');

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [clientData, journalData, reportsData] = await Promise.all([
        clientsService.getClient(id),
        journalEntriesService.getJournalEntries(id),
        clientReportsService.getClientReports(id)
      ]);
      
      setClient(clientData);
      setJournalEntries(journalData);
      setClientReports(reportsData);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast({
        title: "Error",
        description: "Failed to load client data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatReportTier = (tier: string | null): string => {
    if (!tier) return 'Unknown';
    // Replace underscores with spaces and capitalize properly
    return tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDisplayName = (report: ClientReport): string => {
    if (report.report_name) {
      // Remove any descriptive text after delimiters like " - ", " | ", etc.
      const cleanName = report.report_name
        .split(' - ')[0]  // Remove everything after " - "
        .split(' | ')[0]  // Remove everything after " | "
        .split(' (')[0]   // Remove everything after " ("
        .trim();
      
      return cleanName || `#${report.id.substring(0, 8)}`;
    }
    return `#${report.id.substring(0, 8)}`;
  };

  const getReportTypeLabel = (reportType: string) => {
    const typeMap: { [key: string]: string } = {
      'natal': 'Natal Report',
      'composite': 'Composite Report', 
      'compatibility': 'Compatibility Report',
      'return': 'Solar/Lunar Return',
      'positions': 'Planetary Positions',
      'sync': 'Sync Report',
      'essence': 'Essence Report',
      'flow': 'Flow Report',
      'mindset': 'Mindset Report',
      'monthly': 'Monthly Report',
      'focus': 'Focus Report',
    };
    return typeMap[reportType] || reportType;
  };

  const getAbbreviatedName = (fullName: string) => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0];
    }
    const firstName = nameParts[0];
    const lastNameInitial = nameParts[nameParts.length - 1].charAt(0);
    return `${firstName} ${lastNameInitial}.`;
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
      <div className="space-y-6">
        {/* Sticky Action Bar */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between py-3 px-4">
            {/* Desktop View */}
            <div className="hidden md:flex items-center gap-4 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/dashboard/clients')}
                    className="text-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Clients</TooltipContent>
              </Tooltip>
              
              <div className="flex items-center gap-2 flex-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('journal')}
                  className={`text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'journal' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  Journals ({journalEntries.length})
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('reports')}
                  className={`text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'reports' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  Reports ({clientReports.length})
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveTab('insights')}
                  className={`text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'insights' ? 'bg-primary/10 text-primary' : ''}`}
                >
                  Insights (0)
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowCreateJournalModal(true)}
                      className="text-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      Journal
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Journal Entry</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowReportModal(true)}
                      className="text-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Report
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate Report</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      Insight
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Insight</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex items-center justify-between w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/dashboard/clients')}
                    className="text-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Clients</TooltipContent>
              </Tooltip>

              <div className="text-sm font-medium truncate flex-1 text-center px-2">
                {client && getAbbreviatedName(client.full_name)}
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('journal')}
                      className={`h-8 w-8 p-0 text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'journal' ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Journals ({journalEntries.length})</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('reports')}
                      className={`h-8 w-8 p-0 text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'reports' ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reports ({clientReports.length})</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('insights')}
                      className={`h-8 w-8 p-0 text-foreground hover:bg-primary/10 hover:text-primary ${activeTab === 'insights' ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <Lightbulb className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Insights (0)</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Client Information Card */}
        <Collapsible open={isClientInfoOpen} onOpenChange={setIsClientInfoOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {client?.full_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Edit buttons */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditModal(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditModal(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Client</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {client?.full_name}? This action cannot be undone and will permanently remove all client data, including journal entries and reports.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteClient}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Client
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isClientInfoOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {client.email && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500 mb-1">Email</div>
                        <div className="font-medium break-words break-all">{client.email}</div>
                      </div>
                    </div>
                  )}
                  
                  {client.phone && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500 mb-1">Phone</div>
                        <div className="font-medium">{client.phone}</div>
                      </div>
                    </div>
                  )}
                  
                  {client.birth_date && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500 mb-1">Birth Date</div>
                        <div className="font-medium">{formatDate(client.birth_date)}</div>
                      </div>
                    </div>
                  )}
                  
                  {client.birth_time && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500 mb-1">Birth Time</div>
                        <div className="font-medium">{client.birth_time}</div>
                      </div>
                    </div>
                  )}
                  
                  {client.birth_location && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500 mb-1">Birth Location</div>
                        <div className="font-medium break-words">{client.birth_location}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {client.notes && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="mb-2">
                      <h4 className="font-medium text-gray-900">Notes</h4>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed">{client.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="hidden">
            <TabsTrigger value="journal">Journals</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Journals</h3>
              <Button onClick={() => setShowCreateJournalModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Entry
              </Button>
            </div>

            {journalEntries.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <div className="text-gray-400 text-lg mb-2">No journal entries yet</div>
                    <p className="text-gray-600 mb-4">Start documenting your sessions and insights</p>
                    <Button onClick={() => setShowCreateJournalModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {journalEntries.map((entry) => (
                  <Card key={entry.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          {entry.title && (
                            <CardTitle className="text-lg">{entry.title}</CardTitle>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{entry.entry_text}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-3 pt-3 border-t">
                          {entry.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Reports</h3>
              <Button onClick={() => setShowReportModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>

            {clientReports.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <div className="text-gray-400 text-lg mb-2">No reports generated yet</div>
                    <p className="text-gray-600 mb-4">Generate astrological reports for this client</p>
                    <Button onClick={() => setShowReportModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {clientReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {getDisplayName(report)}
                          </CardTitle>
                          <div className="text-sm text-gray-600 mt-1">
                            {getReportTypeLabel(report.request_type)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              Generated on {formatDateTime(report.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge variant={report.response_status >= 200 && report.response_status < 300 ? 'default' : 'destructive'}>
                            {report.response_status >= 200 && report.response_status < 300 ? 'success' : 'failed'}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewReport(report)}
                            disabled={!(report.response_status >= 200 && report.response_status < 300)}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Report
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Insights</h3>
            </div>
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="text-gray-400 text-lg mb-2">No insights available</div>
                  <p className="text-gray-600 mb-4">AI insights will appear here based on client data and patterns</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
