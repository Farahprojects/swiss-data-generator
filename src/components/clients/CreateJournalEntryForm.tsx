
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { X, Mic, MicOff } from 'lucide-react';

const journalEntrySchema = z.object({
  title: z.string().optional(),
  entry_text: z.string().min(1, 'Entry text is required'),
  tags: z.string().optional(),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

interface CreateJournalEntryFormProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryCreated: () => void;
}

const CreateJournalEntryForm = ({ 
  clientId, 
  open, 
  onOpenChange, 
  onEntryCreated 
}: CreateJournalEntryFormProps) => {
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
  });

  // Handle transcript ready callback
  const handleTranscriptReady = (transcript: string) => {
    const currentText = getValues('entry_text') || '';
    const newText = currentText ? `${currentText} ${transcript}` : transcript;
    
    setValue('entry_text', newText, { 
      shouldDirty: true, 
      shouldTouch: true, 
      shouldValidate: true 
    });
  };

  const { isRecording, isProcessing, toggleRecording } = useSpeechToText(handleTranscriptReady);

  const onSubmit = async (data: JournalEntryFormData) => {
    try {
      const entryData: CreateJournalEntryData = {
        client_id: clientId,
        title: data.title || undefined,
        entry_text: data.entry_text,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Journal Entry</DialogTitle>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_text">Entry Text *</Label>
            <Controller
              control={control}
              name="entry_text"
              defaultValue=""
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="entry_text"
                  placeholder="Write your journal entry here or use the mic button below to speak..."
                  rows={8}
                />
              )}
            />
            {errors.entry_text && (
              <p className="text-sm text-destructive">{errors.entry_text.message}</p>
            )}
            
            {/* Simple mic button with glow effect */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`flex items-center gap-2 transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-50 text-red-700 border-red-300 shadow-lg shadow-red-200/50 animate-pulse' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Record'}
                  </>
                )}
              </Button>
            </div>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isRecording || isProcessing}>
              {isSubmitting ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJournalEntryForm;
