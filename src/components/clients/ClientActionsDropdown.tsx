
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
  const handleCreateJournal = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('📝 Journal action clicked for:', client.full_name);
    onCreateJournal(client);
  };

  const handleGenerateInsight = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('💡 Insight action clicked for:', client.full_name);
    onGenerateInsight(client);
  };

  const handleGenerateReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('📊 Report action clicked for:', client.full_name);
    onGenerateReport(client);
  };

  const handleEditClient = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('✏️ Edit action clicked for:', client.full_name);
    onEditClient(client);
  };

  const handleArchiveClient = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🗄️ Archive action clicked for:', client.full_name);
    onArchiveClient(client);
  };

  const handleDropdownTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🔽 Actions dropdown opened for:', client.full_name);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={handleDropdownTriggerClick}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCreateJournal}>
          <Plus className="mr-2 h-4 w-4" />
          Journal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGenerateInsight}>
          <Lightbulb className="mr-2 h-4 w-4" />
          Insight
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGenerateReport}>
          <FileText className="mr-2 h-4 w-4" />
          Report
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleEditClient}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Client
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleArchiveClient}
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
