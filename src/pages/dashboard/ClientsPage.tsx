
import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Calendar, Grid, List, ChevronUp, ChevronDown } from 'lucide-react';
import { journalEntriesService } from '@/services/journalEntries';
import { clientsService } from '@/services/clients';
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
import { useClientViewMode } from '@/hooks/useClientViewMode';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOptimizedClients } from '@/hooks/useOptimizedClients';
import { useModalState } from '@/contexts/ModalStateProvider';
import { useTabVisibility } from '@/hooks/useTabVisibility';

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

const ClientsPage = React.memo(() => {
  const { clients, loading, initialLoad, invalidateCache } = useOptimizedClients();
  const { modalState, setModalState, preserveModalState } = useModalState();
  const { isVisible } = useTabVisibility();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [showInsightDrawer, setShowInsightDrawer] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<JournalEntry | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedInsightData, setSelectedInsightData] = useState<any>(null);
  const [selectedClientJournalEntries, setSelectedClientJournalEntries] = useState<JournalEntry[]>([]);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const { toast } = useToast();
  const { viewMode: savedViewMode, loading: viewModeLoading, updateViewMode } = useClientViewMode();
  const isMobile = useIsMobile();
  
  // Use the saved view mode or default to 'grid' if none is set
  const viewMode = savedViewMode || 'grid';

  // Preserve modal state when tab becomes hidden
  React.useEffect(() => {
    if (!isVisible) {
      preserveModalState();
    }
  }, [isVisible, preserveModalState]);

  const setViewMode = useCallback(async (newViewMode: ViewMode) => {
    await updateViewMode(newViewMode);
  }, [updateViewMode]);

  const handleClientCreated = useCallback(() => {
    invalidateCache();
  }, [invalidateCache]);

  const handleClientUpdated = useCallback(() => {
    invalidateCache();
    setModalState('showEditModal', false);
    setSelectedClient(null);
  }, [invalidateCache, setModalState]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronUp className="w-4 h-4 opacity-30" />;
  }, [sortField, sortDirection]);

  // Memoized action handlers
  const handleCreateJournal = useCallback((client: Client) => {
    setSelectedClient(client);
    setSelectedJournalEntry(null);
    setModalState('showJournalModal', true);
  }, [setModalState]);

  const handleEditJournal = useCallback((client: ClientWithJournal) => {
    if (client.latestJournalEntry) {
      setSelectedClient(client);
      setSelectedJournalEntry(client.latestJournalEntry);
      setModalState('showJournalModal', true);
    }
  }, [setModalState]);

  const handleGenerateInsight = useCallback(async (client: Client) => {
    try {
      console.log('💡 Generating insight for client:', client.full_name);
      setSelectedClient(client);
      
      const journalEntries = await journalEntriesService.getJournalEntries(client.id);
      console.log('📔 Loaded journal entries for insight:', journalEntries.length, 'entries');
      setSelectedClientJournalEntries(journalEntries);
      
      setModalState('showInsightModal', true);
    } catch (error) {
      console.error('Error loading journal entries for insight:', error);
      toast({
        title: "Error",
        description: "Failed to load journal entries. Please try again.",
        variant: "destructive",
      });
    }
  }, [setModalState, toast]);

  const handleGenerateReport = useCallback((client: Client) => {
    setSelectedClient(client);
    setModalState('showReportModal', true);
  }, [setModalState]);

  const handleEditClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setModalState('showEditModal', true);
  }, [setModalState]);

  const handleArchiveClient = useCallback(async (client: Client) => {
    if (window.confirm(`Are you sure you want to archive ${client.full_name}? This action cannot be undone.`)) {
      try {
        await clientsService.deleteClient(client.id);
        toast({
          title: "Client Archived",
          description: `${client.full_name} has been archived successfully.`,
        });
        invalidateCache();
      } catch (error) {
        console.error('Error archiving client:', error);
        toast({
          title: "Error",
          description: "Failed to archive client. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [toast, invalidateCache]);

  const handleJournalCreated = useCallback(() => {
    setModalState('showJournalModal', false);
    setSelectedClient(null);
    setSelectedJournalEntry(null);
    invalidateCache();
  }, [setModalState, invalidateCache]);

  const handleInsightGenerated = useCallback(() => {
    setModalState('showInsightModal', false);
    setSelectedClient(null);
    setSelectedClientJournalEntries([]);
    invalidateCache();
  }, [setModalState, invalidateCache]);

  const handleReportGenerated = useCallback(() => {
    setModalState('showReportModal', false);
    setSelectedClient(null);
    invalidateCache();
  }, [setModalState, invalidateCache]);

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
      total_cost_usd: 0,
      processing_time_ms: null,
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

    // Apply filters
    switch (filterType) {
      case 'most_active':
        break;
      case 'report_ready':
        break;
      case 'has_journal_no_report':
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

  const ClientCard = useCallback(({ client }: { client: ClientWithJournal }) => (
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
              <CardTitle className="text-lg font-semibold text-primary leading-tight hover:text-primary/80 transition-colors">
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
  ), [isMobile, formatDate, formatClientNameForMobile]);

  const ClientTableRow = useCallback(({ client }: { client: ClientWithJournal }) => (
    <TableRow className="hover:bg-muted/50 cursor-pointer">
      <TableCell className="font-medium">
        <Link to={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors">
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
        className={`${client.latestJournalEntry ? 'text-primary cursor-pointer hover:text-primary/80 font-medium' : 'text-muted-foreground'}`}
        onClick={() => client.latestJournalEntry && handleEditJournal(client)}
      >
        {client.latestJournalEntry ? formatDate(client.latestJournalEntry.created_at) : '-'}
      </TableCell>
      <TableCell 
        className={`${client.latestReport ? 'text-primary cursor-pointer hover:text-primary/80 font-medium' : 'text-muted-foreground'} text-left`}
        onClick={() => client.latestReport && handleViewReport(client)}
      >
        {client.latestReport ? formatReportType(client.latestReport) : '-'}
      </TableCell>
      <TableCell 
        className={`${client.latestInsight ? 'text-primary cursor-pointer hover:text-primary/80 font-medium' : 'text-muted-foreground'} text-left`}
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
  ), [isMobile, formatClientNameForMobile, handleEditJournal, formatDate, formatReportType, handleViewReport, handleViewInsight]);

  // Show loading only for initial load or when view mode is loading
  if (initialLoad && (loading || viewModeLoading)) {
    return <TheraLoader message="Loading clients..." size="lg" />;
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        </div>
        
        <p className="text-muted-foreground -mt-1">Manage your client relationships and their journeys</p>
        
        {/* Controls Row */}
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
            onClick={() => setModalState('showNewClientModal', true)}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </div>
        
        {searchTerm && (
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedClients.length} result{filteredAndSortedClients.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAndSortedClients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
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
          <Button onClick={() => setModalState('showNewClientModal', true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Client
          </Button>
        </div>
      )}

      {/* Modals */}
      <ClientForm
        open={modalState.showNewClientModal}
        onOpenChange={(open) => setModalState('showNewClientModal', open)}
        onClientCreated={handleClientCreated}
      />

      {selectedClient && (
        <>
          <CreateJournalEntryForm
            open={modalState.showJournalModal}
            onOpenChange={(open) => setModalState('showJournalModal', open)}
            clientId={selectedClient.id}
            onEntryCreated={() => {
              setModalState('showJournalModal', false);
              setSelectedClient(null);
              setSelectedJournalEntry(null);
              invalidateCache();
            }}
            existingEntry={selectedJournalEntry || undefined}
          />

          <GenerateInsightModal
            open={modalState.showInsightModal}
            onOpenChange={(open) => setModalState('showInsightModal', open)}
            client={selectedClient}
            journalEntries={selectedClientJournalEntries}
            onInsightGenerated={() => {
              setModalState('showInsightModal', false);
              setSelectedClient(null);
              setSelectedClientJournalEntries([]);
              invalidateCache();
            }}
          />

          <ClientReportModal
            open={modalState.showReportModal}
            onOpenChange={(open) => setModalState('showReportModal', open)}
            client={selectedClient}
            onReportGenerated={() => {
              setModalState('showReportModal', false);
              setSelectedClient(null);
              invalidateCache();
            }}
          />

          <EditClientForm
            open={modalState.showEditModal}
            onOpenChange={(open) => setModalState('showEditModal', open)}
            client={selectedClient}
            onClientUpdated={handleClientUpdated}
          />
        </>
      )}

      <ActivityLogDrawer
        isOpen={showReportDrawer}
        onClose={() => setShowReportDrawer(false)}
        logData={selectedReportData}
      />

      <ActivityLogDrawer
        isOpen={showInsightDrawer}
        onClose={() => setShowInsightDrawer(false)}
        logData={selectedInsightData}
      />
    </div>
  );
});

ClientsPage.displayName = 'ClientsPage';

export default ClientsPage;
