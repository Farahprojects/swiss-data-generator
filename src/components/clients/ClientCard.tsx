
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { ClientWithJournal } from '@/types/clients-page';
import { Client } from '@/types/database';
import { formatDate, formatClientNameForMobile } from '@/utils/clientsFormatters';
import ClientActionsDropdown from '@/components/clients/ClientActionsDropdown';

interface ClientCardProps {
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

export const ClientCard: React.FC<ClientCardProps> = React.memo(({ 
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
  <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-border/50 hover:border-primary/20 relative">
    <div className="absolute top-3 right-3 z-10">
      <ClientActionsDropdown
        client={client}
        onCreateJournal={onCreateJournal}
        onGenerateInsight={onGenerateInsight}
        onGenerateReport={onGenerateReport}
        onEditClient={onEditClient}
        onArchiveClient={onArchiveClient}
      />
    </div>
    <Link to={`/dashboard/clients/${client.id}`}>
      <CardHeader className="pb-3 pt-4 px-4 pr-12">
        <div className="flex items-center gap-3">
          {!isMobile && (
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
              {client.avatar_url ? (
                <img src={client.avatar_url} alt={client.full_name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                client.full_name.split(' ').map(n => n[0]).join('')
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-primary leading-tight hover:text-primary/80 transition-colors">
              {isMobile ? formatClientNameForMobile(client.full_name) : client.full_name}
            </CardTitle>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Added {formatDate(client.created_at)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4 px-4">
        <div className="space-y-2">
          {!isMobile && client.email && (
            <div className="text-sm text-muted-foreground truncate">
              {client.email}
            </div>
          )}
          <div className="flex items-center justify-between">
            {client.birth_location && (
              <div className="text-xs text-muted-foreground">
                {client.birth_location}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {client.birth_date && `Born ${formatDate(client.birth_date)}`}
            </div>
          </div>
        </div>
      </CardContent>
    </Link>
  </Card>
));

ClientCard.displayName = 'ClientCard';
