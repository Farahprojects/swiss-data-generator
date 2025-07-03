
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientWithJournal } from '@/types/clients-page';
import { Client } from '@/types/database';
import { formatClientNameForMobile } from '@/utils/clientsFormatters';
import ClientActionsDropdown from '@/components/clients/ClientActionsDropdown';
import { Button } from '@/components/ui/button';

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
}) => {
  // Buttons' click handlers: prevent link navigation when button is clicked
  const handleJournalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (client.latestJournalEntry) {
      onEditJournal(client);
    }
  };
  const handleReportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (client.latestReport) {
      onViewReport(client);
    }
  };
  const handleInsightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (client.latestInsight) {
      onViewInsight(client);
    }
  };

  return (
    <Card className="group bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-200 hover:border-gray-300 rounded-2xl relative overflow-hidden">
      <div className="absolute top-6 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ClientActionsDropdown
          client={client}
          onCreateJournal={onCreateJournal}
          onGenerateInsight={onGenerateInsight}
          onGenerateReport={onGenerateReport}
          onEditClient={onEditClient}
          onArchiveClient={onArchiveClient}
        />
      </div>
      
      <Link to={`/dashboard/clients/${client.id}`} tabIndex={0} className="block">
        <CardHeader className="pb-6 pt-8 px-8 pr-16">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {!isMobile && (
                <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center text-white font-light text-lg flex-shrink-0 shadow-lg">
                  {client.avatar_url ? (
                    <img src={client.avatar_url} alt={client.full_name} className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    client.full_name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl font-light text-gray-900 leading-tight group-hover:text-gray-700 transition-colors">
                  {isMobile ? formatClientNameForMobile(client.full_name) : client.full_name}
                </CardTitle>
                {client.birth_location && (
                  <p className="text-gray-500 font-light mt-1 text-sm">
                    {client.birth_location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 pb-8 px-8">
          <div className="flex gap-3 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className={`px-4 py-2 text-sm font-light rounded-xl transition-all duration-200 ${
                client.latestJournalEntry 
                  ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300' 
                  : 'bg-gray-25 border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              onClick={handleJournalClick}
              disabled={!client.latestJournalEntry}
              tabIndex={0}
            >
              Journal
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`px-4 py-2 text-sm font-light rounded-xl transition-all duration-200 ${
                client.latestReport 
                  ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300' 
                  : 'bg-gray-25 border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              onClick={handleReportClick}
              disabled={!client.latestReport}
              tabIndex={0}
            >
              Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`px-4 py-2 text-sm font-light rounded-xl transition-all duration-200 ${
                client.latestInsight 
                  ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300' 
                  : 'bg-gray-25 border-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              onClick={handleInsightClick}
              disabled={!client.latestInsight}
              tabIndex={0}
            >
              Insight
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
});

ClientCard.displayName = 'ClientCard';
