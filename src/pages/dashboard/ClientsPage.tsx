import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calendar, Grid, List, ChevronUp, ChevronDown } from 'lucide-react';
import { clientsService } from '@/services/clients';
import { journalEntriesService } from '@/services/journalEntries';
import { clientReportsService } from '@/services/clientReports';
import { Client, JournalEntry, InsightEntry } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { TheraLoader } from '@/components/ui/TheraLoader';
import ClientForm from '@/components/clients/ClientForm';
import CreateJournalEntryForm from '@/components/clients/CreateJournalEntryForm';
import { GenerateInsightModal } from '@/components/clients/GenerateInsightModal';
import ClientReportModal from '@/components/clients/ClientReportModal';
import EditClientForm from '@/components/clients/EditClientForm';
import ClientActionsDropdown from '@/components/clients/ClientActionsDropdown';
import ActivityLogDrawer from '@/components/activity-logs/ActivityLogDrawer';
import { supabase } from '@/integrations/supabase/client';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useIsMobile } from '@/hooks/use-mobile';

type ViewMode = 'grid' | 'list';
type SortField = 'full_name' | 'email' | 'latest_journal' | 'latest_report' | 'latest_insight' | 'created_at';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'most_active' | 'report_ready' | 'has_journal_no_report';

interface ClientReport {
  id: string;
  request_type: string;
  response_payload: any;
  created_at: string;
  response_status: number;
  report_name?: string;
  report_tier?: string;
}

interface ClientWithJournal extends Client {
  latestJournalEntry?: JournalEntry;
  latestReport?: ClientReport;
  latestInsight?: InsightEntry;
}

const ClientsPage = () => {
  const [clients, setClients] = useState<ClientWithJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [showInsightDrawer, setShowInsightDrawer] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<JournalEntry | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedInsightData, setSelectedInsightData] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const { toast } = useToast();
  const { preferences, updateClientViewMode } = useUserPreferences();
  const isMobile = useIsMobile();
  
  // Initialize viewMode state - start with null to indicate loading
  const [viewMode, setViewModeState] = useState<ViewMode | null>(null);

  // Update viewMode when preferences load
  useEffect(() => {
    if (preferences?.client_view_mode) {
      setViewModeState(preferences.client_view_mode);
    } else if (preferences) {
      // Preferences loaded but no client_view_mode set, use default
      setViewModeState('grid');
    }
  }, [preferences]);

  const setViewMode = async (newViewMode: ViewMode) => {
    setViewModeState(newViewMode);
    await updateClientViewMode(newViewMode);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await clientsService.getClients();
      
      // Load journal entries, reports and insights for each client
      const clientsWithJournals = await Promise.all(
        clientsData.map(async (client) => {
          try {
            const [journalEntries, clientReports, insightEntries] = await Promise.all([
              journalEntriesService.getJournalEntries(client.id),
              clientReportsService.getClientReports(client.id),
              supabase
                .from('insight_entries')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false })
                .then(({ data }) => data || [])
            ]);
            
            const latestJournalEntry = journalEntries.length > 0 ? journalEntries[0] : undefined;
            const latestReport = clientReports.length > 0 ? clientReports[0] : undefined;
            const latestInsight = insightEntries.length > 0 ? {
              ...insightEntries[0],
              type: insightEntries[0].type as 'pattern' | 'recommendation' | 'trend' | 'milestone'
            } as InsightEntry : undefined;
            
            return {
              ...client,
              latestJournalEntry,
              latestReport,
              latestInsight
            } as ClientWithJournal;
          } catch (error) {
            console.error(`Error loading data for client ${client.id}:`, error);
            return client as ClientWithJournal;
          }
        })
      );
      
      setClients(clientsWithJournals);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = () => {
    loadClients();
  };

  const handleClientUpdated = () => {
    loadClients();
    setShowEditModal(false);
    setSelectedClient(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // Action handlers
  const handleCreateJournal = (client: Client) => {
    setSelectedClient(client);
    setSelectedJournalEntry(null);
    setShowJournalModal(true);
  };

  const handleEditJournal = (client: ClientWithJournal) => {
    if (client.latestJournalEntry) {
      setSelectedClient(client);
      setSelectedJournalEntry(client.latestJournalEntry);
      setShowJournalModal(true);
    }
  };

  const handleGenerateInsight = (client: Client) => {
    setSelectedClient(client);
    setShowInsightModal(true);
  };

  const handleGenerateReport = (client: Client) => {
    setSelectedClient(client);
    setShowReportModal(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleArchiveClient = async (client: Client) => {
    if (window.confirm(`Are you sure you want to archive ${client.full_name}? This action cannot be undone.`)) {
      try {
        await clientsService.deleteClient(client.id);
        toast({
          title: "Client Archived",
          description: `${client.full_name} has been archived successfully.`,
        });
        loadClients();
      } catch (error) {
        console.error('Error archiving client:', error);
        toast({
          title: "Error",
          description: "Failed to archive client. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleJournalCreated = () => {
    setShowJournalModal(false);
    setSelectedClient(null);
    setSelectedJournalEntry(null);
    loadClients();
  };

  const handleInsightGenerated = () => {
    setShowInsightModal(false);
    setSelectedClient(null);
    loadClients();
  };

  const handleReportGenerated = () => {
    setShowReportModal(false);
    setSelectedClient(null);
    loadClients();
  };

  const formatReportType = (report: ClientReport): string => {
    if (report.report_tier) {
      return report.report_tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return report.request_type || 'Report';
  };

  const transformReportForDrawer = (report: ClientReport) => {
    return {
      id: report.id,
      created_at: report.created_at,
      response_status: report.response_status,
      request_type: report.request_type,
      report_tier: report.report_tier,
      total_cost_usd: 0, // Default value since not needed on clients page
      processing_time_ms: null, // Default value since not needed on clients page
      response_payload: report.response_payload,
      request_payload: null,
      error_message: undefined,
      google_geo: false
    };
  };

  const transformInsightForDrawer = (insight: InsightEntry) => {
    return {
      id: insight.id,
      created_at: insight.created_at,
      response_status: 200,
      request_type: 'insight',
      report_tier: 'insight',
      total_cost_usd: 0,
      processing_time_ms: null,
      response_payload: {
        report: insight.content
      },
      request_payload: null,
      error_message: undefined,
      google_geo: false
    };
  };

  const handleViewReport = (client: ClientWithJournal) => {
    if (client.latestReport) {
      const transformedData = transformReportForDrawer(client.latestReport);
      setSelectedReportData(transformedData);
      setShowReportDrawer(true);
    }
  };

  const handleViewInsight = (client: ClientWithJournal) => {
    if (client.latestInsight) {
      const transformedData = transformInsightForDrawer(client.latestInsight);
      setSelectedInsightData(transformedData);
      setShowInsightDrawer(true);
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client =>
      client.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply filters (placeholder logic - you'll need to implement based on your data structure)
    switch (filterType) {
      case 'most_active':
        // Filter logic for most active clients
        break;
      case 'report_ready':
        // Filter logic for report-ready clients
        break;
      case 'has_journal_no_report':
        // Filter logic for clients with journals but no reports
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'full_name':
          aValue = a.full_name;
          bValue = b.full_name;
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'latest_journal':
          aValue = a.latestJournalEntry ? new Date(a.latestJournalEntry.created_at) : new Date(0);
          bValue = b.latestJournalEntry ? new Date(b.latestJournalEntry.created_at) : new Date(0);
          break;
        case 'latest_report':
          aValue = a.latestReport ? new Date(a.latestReport.created_at) : new Date(0);
          bValue = b.latestReport ? new Date(b.latestReport.created_at) : new Date(0);
          break;
        case 'latest_insight':
          aValue = a.latestInsight ? new Date(a.latestInsight.created_at) : new Date(0);
          bValue = b.latestInsight ? new Date(b.latestInsight.created_at) : new Date(0);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchTerm, filterType, sortField, sortDirection]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatClientNameForMobile = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    
    const firstName = names[0];
    const lastNameInitial = names[names.length - 1][0];
    return `${firstName} ${lastNameInitial}.`;
  };

  const ClientCard = ({ client }: { client: ClientWithJournal }) => (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border/50 hover:border-primary/20">
      <Link to={`/dashboard/clients/${client.id}`}>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-3">
            {!isMobile && (
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt={client.full_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  client.full_name.split(' ').map(n => n[0]).join('')
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground leading-tight">
                {isMobile ? formatClientNameForMobile(client.full_name) : client.full_name}
              </CardTitle>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Added {formatDate(client.created_at)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-4">
          <div className="space-y-2">
            {!isMobile && client.email && (
              <div className="text-sm text-muted-foreground truncate">
                {client.email}
              </div>
            )}
            <div className="flex items-center justify-between">
              {client.birth_location && (
                <div className="text-xs text-muted-foreground">
                  {client.birth_location}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {client.birth_date && `Born ${formatDate(client.birth_date)}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  const ClientTableRow = ({ client }: { client: ClientWithJournal }) => (
    <TableRow className="hover:bg-muted/50 cursor-pointer">
      <TableCell className="font-medium">
        <Link to={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 hover:text-primary">
          {!isMobile && (
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
              {client.avatar_url ? (
                <img src={client.avatar_url} alt={client.full_name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                client.full_name.split(' ').map(n => n[0]).join('')
              )}
            </div>
          )}
          <span>{isMobile ? formatClientNameForMobile(client.full_name) : client.full_name}</span>
        </Link>
      </TableCell>
      {!isMobile && (
        <TableCell className="text-muted-foreground text-left">
          {client.email || '-'}
        </TableCell>
      )}
      <TableCell 
        className={`text-muted-foreground ${client.latestJournalEntry ? 'cursor-pointer hover:text-primary' : ''}`}
        onClick={() => client.latestJournalEntry && handleEditJournal(client)}
      >
        {client.latestJournalEntry ? formatDate(client.latestJournalEntry.created_at) : '-'}
      </TableCell>
      <TableCell 
        className={`text-muted-foreground ${client.latestReport ? 'cursor-pointer hover:text-primary' : ''}`}
        onClick={() => client.latestReport && handleViewReport(client)}
      >
        {client.latestReport ? formatReportType(client.latestReport) : '-'}
      </TableCell>
      <TableCell 
        className={`text-muted-foreground ${client.latestInsight ? 'cursor-pointer hover:text-primary' : ''}`}
        onClick={() => client.latestInsight && handleViewInsight(client)}
      >
        {client.latestInsight ? formatDate(client.latestInsight.created_at) : '-'}
      </TableCell>
      <TableCell>
        <ClientActionsDropdown
          client={client}
          onCreateJournal={handleCreateJournal}
          onGenerateInsight={handleGenerateInsight}
          onGenerateReport={handleGenerateReport}
          onEditClient={handleEditClient}
          onArchiveClient={handleArchiveClient}
        />
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return <TheraLoader message="Loading clients..." size="lg" />;
  }

  // Show loading if viewMode hasn't been determined yet
  if (viewMode === null) {
    return <TheraLoader message="Loading preferences..." size="lg" />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mt-8 space-y-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        </div>
        
        {/* Subtitle */}
        <p className="text-muted-foreground -mt-1">Manage your client relationships and their journeys</p>
        
        {/* Controls Row - Search, Filters, View Toggle and Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Filter Dropdown */}
          <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="most_active">Most Active</SelectItem>
              <SelectItem value="report_ready">Report-Ready</SelectItem>
              <SelectItem value="has_journal_no_report">Has Journal, No Report</SelectItem>
            </SelectContent>
          </Select>
          
          {/* View Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </div>
        
        {/* Search Results Count */}
        {searchTerm && (
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedClients.length} result{filteredAndSortedClients.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'grid' ? (
        /* Clients Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAndSortedClients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        /* Clients Table */
        <div className="bg-background border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('full_name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {getSortIcon('full_name')}
                  </div>
                </TableHead>
                {!isMobile && (
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-muted/50 text-left"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      {getSortIcon('email')}
                    </div>
                  </TableHead>
                )}
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('latest_journal')}
                >
                  <div className="flex items-center gap-1">
                    Journal
                    {getSortIcon('latest_journal')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50 text-left"
                  onClick={() => handleSort('latest_report')}
                >
                  <div className="flex items-center gap-1">
                    Reports
                    {getSortIcon('latest_report')}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-semibold cursor-pointer hover:bg-muted/50 text-left"
                  onClick={() => handleSort('latest_insight')}
                >
                  <div className="flex items-center gap-1">
                    Insight
                    {getSortIcon('latest_insight')}
                  </div>
                </TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedClients.map(client => (
                <ClientTableRow key={client.id} client={client} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">No clients found</div>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first client'}
          </p>
          <Button onClick={() => setShowNewClientModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Client
          </Button>
        </div>
      )}

      {/* Modals */}
      <ClientForm
        open={showNewClientModal}
        onOpenChange={setShowNewClientModal}
        onClientCreated={handleClientCreated}
      />

      {selectedClient && (
        <>
          <CreateJournalEntryForm
            open={showJournalModal}
            onOpenChange={setShowJournalModal}
            clientId={selectedClient.id}
            onEntryCreated={handleJournalCreated}
            existingEntry={selectedJournalEntry || undefined}
          />

          <GenerateInsightModal
            open={showInsightModal}
            onOpenChange={setShowInsightModal}
            client={selectedClient}
            journalEntries={[]}
            onInsightGenerated={handleInsightGenerated}
          />

          <ClientReportModal
            open={showReportModal}
            onOpenChange={setShowReportModal}
            client={selectedClient}
            onReportGenerated={handleReportGenerated}
          />

          <EditClientForm
            open={showEditModal}
            onOpenChange={setShowEditModal}
            client={selectedClient}
            onClientUpdated={handleClientUpdated}
          />
        </>
      )}

      {/* Report Viewer Drawer */}
      <ActivityLogDrawer
        isOpen={showReportDrawer}
        onClose={() => setShowReportDrawer(false)}
        logData={selectedReportData}
      />

      {/* Insight Viewer Drawer */}
      <ActivityLogDrawer
        isOpen={showInsightDrawer}
        onClose={() => setShowInsightDrawer(false)}
        logData={selectedInsightData}
      />
    </div>
  );
};

export default ClientsPage;
