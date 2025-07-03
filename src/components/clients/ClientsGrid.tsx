
import React from 'react';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientWithJournal } from '@/types/clients-page';
import { Client } from '@/types/database';

interface ClientsGridProps {
  clients: ClientWithJournal[];
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

export const ClientsGrid: React.FC<ClientsGridProps> = ({ 
  clients, 
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {clients.map(client => (
        <ClientCard 
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
    </div>
  );
};
