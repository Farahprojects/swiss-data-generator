
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
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight">
            Your <span className="italic font-medium">clients</span>
          </h1>
          {backgroundRefreshing && (
            <div className="text-sm text-gray-500 animate-pulse">
              Updating...
            </div>
          )}
        </div>
        <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
          Manage your client relationships and their transformative journeys
        </p>
      </div>
      
      {/* Controls Row */}
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search clients by name or location..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-12 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-gray-900 transition-all duration-300 font-light"
          />
        </div>
        
        {/* View toggle and Add Client button */}
        <div className="flex items-center gap-4">
          {/* If not mobile, render view toggle */}
          {!isMobile && (
            <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className={`px-6 py-3 font-light transition-all duration-300 rounded-none ${
                  viewMode === 'grid' 
                    ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm' 
                    : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Grid className="w-4 h-4 mr-2" />
                <span className="text-sm">Grid</span>
              </Button>
              <div className="w-px h-6 bg-gray-200"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange('list')}
                className={`px-6 py-3 font-light transition-all duration-300 rounded-none ${
                  viewMode === 'list' 
                    ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm' 
                    : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                <span className="text-sm">List</span>
              </Button>
            </div>
          )}
          
          {/* Add Client button */}
          <Button 
            onClick={onNewClient}
            size="lg"
            className="bg-gray-900 text-white hover:bg-gray-800 font-light py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Add Client
          </Button>
        </div>
      </div>
      
      {searchTerm && (
        <div className="text-center">
          <div className="inline-block text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-xl font-light">
            {filteredCount} result{filteredCount !== 1 ? 's' : ''} found for "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};
