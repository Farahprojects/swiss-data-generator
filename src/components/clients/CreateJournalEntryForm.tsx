import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
// import { useJournalMicrophone } from '@/hooks/microphone/useJournalMicrophone';
import { useTypewriter } from '@/components/ui/TypewriterText';
import { useToast } from '@/hooks/use-toast';
import { X, Mic } from 'lucide-react';
import { CreateJournalEntryData, JournalEntry } from '@/types/database';
import { journalEntriesService } from '@/services/journalEntries';
import { log } from '@/utils/logUtils';

const journalEntrySchema = z.object({
  entry_text: z.string().min(1, 'Entry text is required'),
});

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

interface CreateJournalEntryFormProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryCreated: () => void;
  existingEntry?: JournalEntry;
}

const CreateJournalEntryForm = ({ 
  clientId, 
  open, 
  onOpenChange, 
  onEntryCreated,
  existingEntry
}: CreateJournalEntryFormProps) => {
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'typing'>('idle');
  const [newTranscriptToType, setNewTranscriptToType] = useState('');
  const [existingText, setExistingText] = useState('');
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

  // Pre-populate form when editing
  useEffect(() => {
    if (existingEntry && open) {
      setValue('entry_text', existingEntry.entry_text);
    } else if (!existingEntry && open) {
      setValue('entry_text', '');
    }
  }, [existingEntry, open, setValue]);

  // Handle when silence is detected - show immediate feedback
  const handleSilenceDetected = () => {
    log('debug', 'Silence detected, showing processing state');
    setProcessingState('processing');
  };

  // Handle when transcript is ready - prepare for type animation
  const handleTranscriptReady = (transcript: string) => {
    log('debug', 'Transcript ready for typing animation', { length: transcript.length });
    const currentText = getValues('entry_text') || '';
    
    // Store existing text and new transcript separately
    setExistingText(currentText);
    const newTranscript = currentText ? ` ${transcript}` : transcript;
    setNewTranscriptToType(newTranscript);
    
    setProcessingState('typing');
    animationKeyRef.current++;
    setStartTyping(true);
  };

  // Type animation configuration
  const { displayedText, isTyping, start, stop } = useTypewriter(
    newTranscriptToType,
    {
      msPerWord: 100,
      autoStart: false,
      disabled: !startTyping
    }
  );

  // Handle typing completion and interruption
  useEffect(() => {
    if (startTyping && newTranscriptToType && !isTyping && displayedText === newTranscriptToType) {
      // Animation completed
      log('debug', 'Type animation complete');
      const finalText = existingText + newTranscriptToType;
      setValue('entry_text', finalText, { 
        shouldDirty: true, 
        shouldTouch: true, 
        shouldValidate: true 
      });
      setProcessingState('idle');
      setStartTyping(false);
      setNewTranscriptToType('');
      setExistingText('');
    }
  }, [startTyping, newTranscriptToType, isTyping, displayedText, existingText, setValue]);

  // Start typing when ready
  useEffect(() => {
    if (startTyping && newTranscriptToType) {
      start();
    }
  }, [startTyping, newTranscriptToType, start]);

  const stopTyping = useCallback(() => {
    log('debug', 'Type animation interrupted by user');
    stop();
    const finalText = existingText + newTranscriptToType;
    setValue('entry_text', finalText, { 
      shouldDirty: true, 
      shouldTouch: true, 
      shouldValidate: true 
    });
    setProcessingState('idle');
    setStartTyping(false);
    setNewTranscriptToType('');
    setExistingText('');
  }, [stop, existingText, newTranscriptToType, setValue]);

  // Temporarily disable microphone functionality
  const isRecording = false;
  const isProcessing = false;
  const toggleRecording = () => {};

  // Handle user typing during animation
  const handleTextareaChange = (value: string) => {
    if (isTyping) {
      log('debug', 'User typing detected during animation, stopping animation');
      stopTyping();
    }
    return value;
  };

  // Generate today's date and time as title
  const getDefaultTitle = () => {
    const today = new Date();
    return today.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const onSubmit = async (data: JournalEntryFormData) => {
    try {
      if (existingEntry) {
        // Update existing entry
        await journalEntriesService.updateJournalEntry(existingEntry.id, {
          entry_text: data.entry_text,
        });
        
        toast({
          title: "Success",
          description: "Journal entry updated successfully!",
        });
      } else {
        // Create new entry
        const entryData: CreateJournalEntryData = {
          client_id: clientId,
          title: getDefaultTitle(),
          entry_text: data.entry_text,
        };

        await journalEntriesService.createJournalEntry(entryData);
        
        toast({
          title: "Success",
          description: "Journal entry created successfully!",
        });
      }

      handleClose();
      onEntryCreated();
    } catch (error) {
      log('error', 'Error saving journal entry', error);
      toast({
        title: "Error",
        description: `Failed to ${existingEntry ? 'update' : 'create'} journal entry. Please try again.`,
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
    setNewTranscriptToType('');
    setExistingText('');
    reset();
    onOpenChange(false);
  };

  // Compute the display value for the textarea
  const getTextareaDisplayValue = () => {
    if (processingState === 'typing') {
      return existingText + displayedText;
    }
    return getValues('entry_text') || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {existingEntry ? 'Edit Journal Entry' : 'Write Your Journal Entry'}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="entry_text">What happened in this session? *</Label>
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
                    rows={12}
                    onChange={(e) => {
                      const newValue = handleTextareaChange(e.target.value);
                      field.onChange(newValue);
                    }}
                    value={getTextareaDisplayValue()}
                    disabled={processingState === 'typing'}
                    className={processingState === 'typing' ? 'bg-gray-50' : ''}
                  />
                )}
              />
              
              {/* Typing cursor overlay */}
              {processingState === 'typing' && (
                <div className="absolute bottom-3 left-3 pointer-events-none">
                  <TypingCursor visible={isTyping} />
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
                <TypingCursor visible={isTyping} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isRecording || isProcessing || processingState === 'typing' || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : existingEntry ? 'Update Entry' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJournalEntryForm;
