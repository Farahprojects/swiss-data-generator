
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ClientsEmptyStateProps {
  hasSearchTerm: boolean;
  onNewClient: () => void;
}

export const ClientsEmptyState: React.FC<ClientsEmptyStateProps> = ({ hasSearchTerm, onNewClient }) => {
  return (
    <div className="text-center py-12">
      <div className="text-muted-foreground text-lg mb-2">No clients found</div>
      <p className="text-muted-foreground mb-4">
        {hasSearchTerm ? 'Try adjusting your search terms' : 'Start by adding your first client'}
      </p>
      <Button onClick={onNewClient}>
        <Plus className="w-4 h-4 mr-2" />
        Add Your First Client
      </Button>
    </div>
  );
};
