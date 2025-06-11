
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { JournalEntry } from '@/types/database';
import { formatDate } from '@/utils/dateFormatters';
import CreateJournalEntryForm from './CreateJournalEntryForm';

interface ClientJournalTabProps {
  journalEntries: JournalEntry[];
  onCreateJournal: () => void;
  onEntryUpdated: () => void;
  clientId: string;
  isMobile: boolean;
}

export const ClientJournalTab: React.FC<ClientJournalTabProps> = ({
  journalEntries,
  onCreateJournal,
  onEntryUpdated,
  clientId,
  isMobile
}) => {
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = (entry: JournalEntry) => {
    // TODO: Implement delete functionality
    console.log('Delete entry:', entry.id);
  };

  const getSummary = (entry: JournalEntry) => {
    return entry.entry_text.substring(0, 100) + (entry.entry_text.length > 100 ? '...' : '');
  };

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
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {entry.title || 'Journal Entry'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {getSummary(entry)}
                    </div>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteEntry(entry)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Journal Entry Modal */}
      <CreateJournalEntryForm
        clientId={clientId}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onEntryCreated={() => {
          handleCloseEditModal();
          onEntryUpdated();
        }}
        existingEntry={editingEntry || undefined}
      />
    </div>
  );
};
