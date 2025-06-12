
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
      onClick={() => client.latestJournalEntry && onEditJournal(client)}
    >
      {client.latestJournalEntry ? formatDate(client.latestJournalEntry.created_at) : '-'}
    </TableCell>
    <TableCell 
      className={`${client.latestReport ? 'text-primary cursor-pointer hover:text-primary/80 font-medium' : 'text-muted-foreground'} text-left`}
      onClick={() => client.latestReport && onViewReport(client)}
    >
      {client.latestReport ? formatReportType(client.latestReport) : '-'}
    </TableCell>
    <TableCell 
      className={`${client.latestInsight ? 'text-primary cursor-pointer hover:text-primary/80 font-medium' : 'text-muted-foreground'} text-left`}
      onClick={() => client.latestInsight && onViewInsight(client)}
    >
      {client.latestInsight ? formatDate(client.latestInsight.created_at) : '-'}
    </TableCell>
    <TableCell>
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
