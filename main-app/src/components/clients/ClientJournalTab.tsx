
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, FileText, Edit2, Trash2, ChevronRight, Calendar } from 'lucide-react';
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

const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });
};

const getSummary = (entry: JournalEntry) => {
  let text = entry.entry_text;
  
  // Remove dates in the format "Month Day, Year at Time AM/PM" (e.g., "June 12, 2025 at 1:18 PM")
  const dateTimeRegex = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+(?:AM|PM)\b/g;
  text = text.replace(dateTimeRegex, '').trim();
  
  // Clean up any extra whitespace that might be left
  text = text.replace(/\s+/g, ' ').trim();
  
  return text.substring(0, 150) + (text.length > 150 ? '...' : '');
};

const hasExpandableContent = (entry: JournalEntry) => {
  let text = entry.entry_text;
  
  // Remove dates in the format "Month Day, Year at Time AM/PM"
  const dateTimeRegex = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+(?:AM|PM)\b/g;
  text = text.replace(dateTimeRegex, '').trim();
  text = text.replace(/\s+/g, ' ').trim();
  
  return text.length > 200;
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Journals</h3>
          <Button onClick={onCreateJournal}>
            <Plus className="w-4 h-4 mr-2" />
            Add
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
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {journalEntries.map((entry) => {
              const summary = getSummary(entry);
              const hasContent = hasExpandableContent(entry);
              
              return (
                <Card key={entry.id} className="p-6 hover:shadow-md transition-all duration-200 border border-gray-100">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {entry.title || 'Journal Entry'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDateForDisplay(entry.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 font-medium px-3 py-1"
                        >
                          Journal
                        </Badge>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-3">
                      <p className="text-gray-900 leading-relaxed text-base">
                        {summary}
                      </p>
                      
                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag, index) => (
                            <Badge 
                              key={index}
                              variant="outline" 
                              className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-1"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Expandable Full Entry */}
                      {hasContent && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="full-entry" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-900">Full Entry</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {entry.entry_text}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditEntry(entry)}
                              className="text-gray-600 hover:text-primary hover:bg-primary/5 p-2 h-auto"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span>Edit entry</span>
                          </TooltipContent>
                        </Tooltip>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button 
                                  disabled={deletingEntryId === entry.id}
                                  className="text-gray-600 hover:text-destructive transition-colors p-2 disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>Delete entry</span>
                              </TooltipContent>
                            </Tooltip>
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
                    </div>
                  </div>
                </Card>
              );
            })}
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
    </TooltipProvider>
  );
};
