
import React from 'react';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientWithJournal } from '@/types/clients-page';

interface ClientsGridProps {
  clients: ClientWithJournal[];
  isMobile: boolean;
}

export const ClientsGrid: React.FC<ClientsGridProps> = ({ clients, isMobile }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {clients.map(client => (
        <ClientCard key={client.id} client={client} isMobile={isMobile} />
      ))}
    </div>
  );
};
