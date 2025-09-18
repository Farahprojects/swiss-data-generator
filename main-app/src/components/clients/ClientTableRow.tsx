import React from 'react';
import { Link } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import ClientActionsDropdown from '@/components/clients/ClientActionsDropdown';
import { Client } from '@/types/database';
import { ClientWithJournal } from '@/types/clients-page';
import { formatDate, formatClientNameForMobile, formatReportType } from '@/utils/clientsFormatters';

interface ClientTableRowProps {
  client: ClientWithJournal;
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

export const ClientTableRow: React.FC<ClientTableRowProps> = React.memo(({ 
  client, 
  isMobile,
  onEditJournal,
  onViewReport,
  onViewInsight,
  onCreateJournal,
  onGenerateInsight,
  onGenerateReport,
  onEditClient,
  onArchiveClient
}) => (
  <TableRow className="border-gray-100 hover:bg-gray-50/50 transition-colors duration-200">
    <TableCell className="py-6 px-8">
      <Link to={`/dashboard/clients/${client.id}`} className="flex items-center gap-4 group">
        <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center text-white font-light text-sm flex-shrink-0 shadow-sm">
          {client.avatar_url ? (
            <img src={client.avatar_url} alt={client.full_name} className="w-12 h-12 rounded-2xl object-cover" />
          ) : (
            client.full_name.split(' ').map(n => n[0]).join('')
          )}
        </div>
        <div>
          <span className="text-gray-900 font-light group-hover:text-gray-700 transition-colors">
            {isMobile ? formatClientNameForMobile(client.full_name) : client.full_name}
          </span>
          {client.birth_location && (
            <div className="text-xs text-gray-500 mt-1 font-light">
              {client.birth_location}
            </div>
          )}
        </div>
      </Link>
    </TableCell>
    {!isMobile && (
      <TableCell className="py-6 px-8">
        <span className="text-gray-600 font-light text-sm">
          {client.email || '-'}
        </span>
      </TableCell>
    )}
    <TableCell 
      className={`py-6 px-8 ${client.latestJournalEntry ? 'cursor-pointer group' : ''}`}
      onClick={(e) => {
        if (client.latestJournalEntry) {
          e.stopPropagation();
          onEditJournal(client);
        }
      }}
    >
      {client.latestJournalEntry ? (
        <div className="text-blue-600 font-light text-sm group-hover:text-blue-700 transition-colors">
          {formatDate(client.latestJournalEntry.created_at)}
        </div>
      ) : (
        <span className="text-gray-400 font-light text-sm">-</span>
      )}
    </TableCell>
    <TableCell 
      className={`py-6 px-8 ${client.latestReport ? 'cursor-pointer group' : ''}`}
      onClick={(e) => {
        if (client.latestReport) {
          e.stopPropagation();
          onViewReport(client);
        }
      }}
    >
      {client.latestReport ? (
        <div className="text-blue-600 font-light text-sm group-hover:text-blue-700 transition-colors">
          {formatReportType(client.latestReport)}
        </div>
      ) : (
        <span className="text-gray-400 font-light text-sm">-</span>
      )}
    </TableCell>
    <TableCell 
      className={`py-6 px-8 ${client.latestInsight ? 'cursor-pointer group' : ''}`}
      onClick={(e) => {
        if (client.latestInsight) {
          e.stopPropagation();
          onViewInsight(client);
        }
      }}
    >
      {client.latestInsight ? (
        <div className="text-blue-600 font-light text-sm group-hover:text-blue-700 transition-colors">
          {formatDate(client.latestInsight.created_at)}
        </div>
      ) : (
        <span className="text-gray-400 font-light text-sm">-</span>
      )}
    </TableCell>
    <TableCell className="py-6 px-8 text-center" onClick={(e) => e.stopPropagation()}>
      <ClientActionsDropdown
        client={client}
        onCreateJournal={onCreateJournal}
        onGenerateInsight={onGenerateInsight}
        onGenerateReport={onGenerateReport}
        onEditClient={onEditClient}
        onArchiveClient={onArchiveClient}
      />
    </TableCell>
  </TableRow>
));

ClientTableRow.displayName = 'ClientTableRow';