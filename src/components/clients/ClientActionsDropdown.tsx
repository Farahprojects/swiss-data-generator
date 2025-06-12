
import React from 'react';
import { MoreHorizontal, Plus, Lightbulb, FileText, Edit, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Client } from '@/types/database';

interface ClientActionsDropdownProps {
  client: Client;
  onCreateJournal: (client: Client) => void;
  onGenerateInsight: (client: Client) => void;
  onGenerateReport: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onArchiveClient: (client: Client) => void;
}

const ClientActionsDropdown = ({
  client,
  onCreateJournal,
  onGenerateInsight,
  onGenerateReport,
  onEditClient,
  onArchiveClient,
}: ClientActionsDropdownProps) => {
  const handleMenuItemClick = (action: () => void, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-background border shadow-md z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem 
          onClick={(e) => handleMenuItemClick(() => onCreateJournal(client), e)}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Journal
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => handleMenuItemClick(() => onGenerateInsight(client), e)}
          className="cursor-pointer"
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Generate Insight
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => handleMenuItemClick(() => onGenerateReport(client), e)}
          className="cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={(e) => handleMenuItemClick(() => onEditClient(client), e)}
          className="cursor-pointer"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Client
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={(e) => handleMenuItemClick(() => onArchiveClient(client), e)}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <Archive className="mr-2 h-4 w-4" />
          Archive Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ClientActionsDropdown;
