
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onCreateJournal(client)}>
          <Plus className="mr-2 h-4 w-4" />
          Journal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onGenerateInsight(client)}>
          <Lightbulb className="mr-2 h-4 w-4" />
          Insight
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onGenerateReport(client)}>
          <FileText className="mr-2 h-4 w-4" />
          Report
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEditClient(client)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Client
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onArchiveClient(client)}
          className="text-destructive focus:text-destructive"
        >
          <Archive className="mr-2 h-4 w-4" />
          Archive Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ClientActionsDropdown;
