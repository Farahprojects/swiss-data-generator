
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CreateJournalEntryData } from '@/types/database';
import { journalEntriesService } from '@/services/journalEntries';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

const metadataSchema = z.object({
  title: z.string().optional(),
  tags: z.string().optional(),
});

type MetadataFormData = z.infer<typeof metadataSchema>;

interface JournalEntryMetadataFormProps {
  clientId: string;
  entryText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryCreated: () => void;
  onBack: () => void;
}

const JournalEntryMetadataForm = ({ 
  clientId, 
  entryText,
  open, 
  onOpenChange, 
  onEntryCreated,
  onBack
}: JournalEntryMetadataFormProps) => {
  const { toast } = useToast();
  
  // Get today's date in a readable format
  const getDefaultTitle = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      title: getDefaultTitle(),
      tags: '',
    },
  });

  const onSubmit = async (data: MetadataFormData) => {
    try {
      const entryData: CreateJournalEntryData = {
        client_id: clientId,
        title: data.title || undefined,
        entry_text: entryText,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      await journalEntriesService.createJournalEntry(entryData);
      
      toast({
        title: "Success",
        description: "Journal entry created successfully!",
      });

      reset();
      onOpenChange(false);
      onEntryCreated();
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast({
        title: "Error",
        description: "Failed to create journal entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleBackClick = () => {
    onBack();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Title & Tags</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter a title for this entry..."
            />
            <p className="text-sm text-gray-500">
              Defaults to today's date
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              {...register('tags')}
              placeholder="Enter tags separated by commas (e.g., session, breakthrough, goal)"
            />
            <p className="text-sm text-gray-500">
              Separate multiple tags with commas
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Entry Preview</h4>
            <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-3">
              {entryText}
            </p>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleBackClick}>
              Back to Entry
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JournalEntryMetadataForm;
