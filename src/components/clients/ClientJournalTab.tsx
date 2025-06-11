
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { JournalEntry } from '@/types/database';
import { formatDate } from '@/utils/dateFormatters';
import { journalEntriesService } from '@/services/journalEntries';
import { useToast } from '@/hooks/use-toast';
import CreateJournalEntryForm from './CreateJournalEntryForm';

interface ClientJournalTabProps {
  journalEntries: JournalEntry[];
  onCreateJournal: () => void;
  onEntryUpdated: () => void;
  clientId: string;
  isMobile: boolean;
}

const formatDateForMobile = (dateString: string): string => {
  const date = new Date(dateString);
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${monthShort} ${day}`;
};

export const ClientJournalTab: React.FC<ClientJournalTabProps> = ({
  journalEntries,
  onCreateJournal,
  onEntryUpdated,
  clientId,
  isMobile
}) => {
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      setDeletingEntryId(entryId);
      await journalEntriesService.deleteJournalEntry(entryId);
      toast({
        title: "Success",
        description: "Journal entry deleted successfully.",
      });
      onEntryUpdated();
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingEntryId(null);
    }
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
                <TableHead className="hidden md:table-cell">Summary</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm text-gray-600">
                    <span className="hidden md:inline">{formatDate(entry.created_at)}</span>
                    <span className="md:hidden">{formatDateForMobile(entry.created_at)}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={deletingEntryId === entry.id}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this journal entry? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
