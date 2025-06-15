
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Grid, List, Plus, Search } from 'lucide-react';
import { ViewMode } from '@/types/clients-page';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClientsPageHeaderProps {
  backgroundRefreshing: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewClient: () => void;
  filteredCount: number;
  isMobile?: boolean;
}

export const ClientsPageHeader: React.FC<ClientsPageHeaderProps> = ({
  backgroundRefreshing,
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onNewClient,
  filteredCount,
  isMobile = false,
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
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search input always on the left */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search clients"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-48"
          />
        </div>
        {/* If not mobile, render view toggle next */}
        {!isMobile && (
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
        )}
        {/* This spacer pushes the button to the far right */}
        <div className="flex-1 min-w-[12px]" />
        {/* "+ Client" button always on right */}
        <Button 
          onClick={onNewClient}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          + Client
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
