
import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ClientTableRow } from '@/components/clients/ClientTableRow';
import { Client } from '@/types/database';
import { ClientWithJournal, SortField, SortDirection } from '@/types/clients-page';

interface ClientsTableProps {
  clients: ClientWithJournal[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  isMobile: boolean;
  onEditJournal: (client: ClientWithJournal) => void;
  onViewReport: (client: ClientWithJournal) => void;
  onViewInsight: (client: ClientWithJournal) => void;
  onCreateJournal: (client: Client) => void;
  onGenerateInsight: (client: Client) => void;
  onGenerateReport: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onArchiveClient: (client: Client) => void;
}

export const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  sortField,
  sortDirection,
  onSort,
  isMobile,
  onEditJournal,
  onViewReport,
  onViewInsight,
  onCreateJournal,
  onGenerateInsight,
  onGenerateReport,
  onEditClient,
  onArchiveClient
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronUp className="w-4 h-4 opacity-30" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200 bg-gray-50/30">
            <TableHead 
              className="font-light text-gray-600 cursor-pointer hover:bg-gray-50 py-6 px-8 text-left"
              onClick={() => onSort('full_name')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">Name</span>
                {getSortIcon('full_name')}
              </div>
            </TableHead>
            {!isMobile && (
              <TableHead 
                className="font-light text-gray-600 cursor-pointer hover:bg-gray-50 py-6 px-8 text-left"
                onClick={() => onSort('email')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">Email</span>
                  {getSortIcon('email')}
                </div>
              </TableHead>
            )}
            <TableHead 
              className="font-light text-gray-600 cursor-pointer hover:bg-gray-50 py-6 px-8 text-left"
              onClick={() => onSort('latest_journal')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">Journal</span>
                {getSortIcon('latest_journal')}
              </div>
            </TableHead>
            <TableHead 
              className="font-light text-gray-600 cursor-pointer hover:bg-gray-50 py-6 px-8 text-left"
              onClick={() => onSort('latest_report')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">Reports</span>
                {getSortIcon('latest_report')}
              </div>
            </TableHead>
            <TableHead 
              className="font-light text-gray-600 cursor-pointer hover:bg-gray-50 py-6 px-8 text-left"
              onClick={() => onSort('latest_insight')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">Insight</span>
                {getSortIcon('latest_insight')}
              </div>
            </TableHead>
            <TableHead className="font-light text-gray-600 py-6 px-8 text-center">
              <span className="text-sm">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map(client => (
            <ClientTableRow 
              key={client.id} 
              client={client}
              isMobile={isMobile}
              onEditJournal={onEditJournal}
              onViewReport={onViewReport}
              onViewInsight={onViewInsight}
              onCreateJournal={onCreateJournal}
              onGenerateInsight={onGenerateInsight}
              onGenerateReport={onGenerateReport}
              onEditClient={onEditClient}
              onArchiveClient={onArchiveClient}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
