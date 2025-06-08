
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { JournalEntry } from '@/types/database';
import { formatDateTime, getRelativeTime } from '@/utils/dateFormatters';

interface ClientJournalTabProps {
  journalEntries: JournalEntry[];
  onCreateJournal: () => void;
  isMobile: boolean;
}

export const ClientJournalTab: React.FC<ClientJournalTabProps> = ({
  journalEntries,
  onCreateJournal,
  isMobile
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Journals</h3>
        <Button onClick={onCreateJournal}>
          <Plus className="w-4 h-4 mr-2" />
          Create Entry
        </Button>
      </div>

      {journalEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-2">No journal entries yet</div>
              <p className="text-gray-600 mb-4">Start documenting your sessions and insights</p>
              <Button onClick={onCreateJournal}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {journalEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {entry.title && (
                      <CardTitle className="text-lg mb-2">{entry.title}</CardTitle>
                    )}
                    <div className="text-sm text-gray-600">
                      {isMobile ? getRelativeTime(entry.created_at) : formatDateTime(entry.created_at)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{entry.entry_text}</p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex gap-1 mt-3 pt-3 border-t">
                    {entry.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
