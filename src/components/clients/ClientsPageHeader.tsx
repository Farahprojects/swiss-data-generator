
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Grid, List } from 'lucide-react';
import { ViewMode, FilterType } from '@/types/clients-page';

interface ClientsPageHeaderProps {
  backgroundRefreshing: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterType: FilterType;
  onFilterChange: (filter: FilterType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewClient: () => void;
  filteredCount: number;
}

export const ClientsPageHeader: React.FC<ClientsPageHeaderProps> = ({
  backgroundRefreshing,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onNewClient,
  filteredCount
}) => {
  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        {backgroundRefreshing && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Updating...
          </div>
        )}
      </div>
      
      <p className="text-muted-foreground -mt-1">Manage your client relationships and their journeys</p>
      
      {/* Controls Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search clients by name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-64"
          />
        </div>

        <Select value={filterType} onValueChange={onFilterChange}>
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
            onClick={() => onViewModeChange('grid')}
            className="rounded-r-none"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-l-none"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
        
        <Button 
          onClick={onNewClient}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Client
        </Button>
      </div>
      
      {searchTerm && (
        <div className="text-sm text-muted-foreground">
          {filteredCount} result{filteredCount !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
};
