import React, { useState, useRef } from 'react';
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
import { ProcessingIndicator } from '@/components/ui/ProcessingIndicator';
import { TypingCursor } from '@/components/ui/TypingCursor';
import { CreateJournalEntryData } from '@/types/database';
import { journalEntriesService } from '@/services/journalEntries';
import { useToast } from '@/hooks/use-toast';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTypeAnimation } from '@/hooks/useTypeAnimation';
import { X, Mic } from 'lucide-react';

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
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'typing'>('idle');
  const [textToType, setTextToType] = useState('');
  const [startTyping, setStartTyping] = useState(false);
  const animationKeyRef = useRef(0);
  
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

  // Handle when silence is detected - show immediate feedback
  const handleSilenceDetected = () => {
    console.log('Silence detected, showing processing state');
    setProcessingState('processing');
  };

  // Handle when transcript is ready - prepare for type animation
  const handleTranscriptReady = (transcript: string) => {
    console.log('Transcript ready:', transcript);
    const currentText = getValues('entry_text') || '';
    const newText = currentText ? `${currentText} ${transcript}` : transcript;
    
    setTextToType(newText);
    setProcessingState('typing');
    animationKeyRef.current++;
    setStartTyping(true);
  };

  // Type animation configuration
  const { displayText, isTyping, showCursor, stopTyping } = useTypeAnimation(
    textToType,
    startTyping,
    {
      speed: 50,
      punctuationDelay: 200,
      onComplete: () => {
        console.log('Type animation complete');
        setValue('entry_text', textToType, { 
          shouldDirty: true, 
          shouldTouch: true, 
          shouldValidate: true 
        });
        setProcessingState('idle');
        setStartTyping(false);
        setTextToType('');
      },
      onInterrupt: () => {
        console.log('Type animation interrupted by user');
        setValue('entry_text', textToType, { 
          shouldDirty: true, 
          shouldTouch: true, 
          shouldValidate: true 
        });
        setProcessingState('idle');
        setStartTyping(false);
        setTextToType('');
      }
    }
  );

  const { isRecording, isProcessing, toggleRecording } = useSpeechToText(
    handleTranscriptReady,
    handleSilenceDetected
  );

  // Handle user typing during animation
  const handleTextareaChange = (value: string) => {
    if (isTyping) {
      console.log('User typing detected during animation, stopping animation');
      stopTyping();
    }
    return value;
  };

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
    if (isTyping) {
      stopTyping();
    }
    setProcessingState('idle');
    setStartTyping(false);
    setTextToType('');
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
            <div className="relative">
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
                    onChange={(e) => {
                      const newValue = handleTextareaChange(e.target.value);
                      field.onChange(newValue);
                    }}
                    value={processingState === 'typing' ? displayText : field.value}
                    disabled={processingState === 'typing'}
                    className={processingState === 'typing' ? 'bg-gray-50' : ''}
                  />
                )}
              />
              
              {/* Typing cursor overlay */}
              {processingState === 'typing' && (
                <div className="absolute bottom-3 left-3 pointer-events-none">
                  <TypingCursor visible={showCursor} />
                </div>
              )}
            </div>
            
            {errors.entry_text && (
              <p className="text-sm text-destructive">{errors.entry_text.message}</p>
            )}
            
            {/* Processing indicator */}
            {processingState === 'processing' && (
              <ProcessingIndicator 
                message="Processing speech..." 
                className="mt-2"
              />
            )}
            
            {processingState === 'typing' && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 mt-2">
                <span>Adding text...</span>
                <TypingCursor visible={showCursor} />
              </div>
            )}
            
            {/* Mic button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isProcessing || processingState !== 'idle'}
                className={`p-2.5 rounded-full transition-colors ${
                  isRecording 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'text-gray-500 hover:bg-gray-100'
                } ${(isProcessing || processingState !== 'idle') ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                title={isRecording ? 'Stop recording' : 'Start voice recording'}
              >
                <Mic className="w-5 h-5" />
              </button>
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
            <Button 
              type="submit" 
              disabled={isSubmitting || isRecording || isProcessing || processingState === 'typing'}
            >
              {isSubmitting ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJournalEntryForm;
