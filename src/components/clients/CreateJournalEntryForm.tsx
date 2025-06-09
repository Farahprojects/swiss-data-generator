
import React, { useState, useRef, useEffect } from 'react';
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
import { useSpeechToTextOptimized } from '@/hooks/useSpeechToTextOptimized';
import { useTypeAnimation } from '@/hooks/useTypeAnimation';
import { useToast } from '@/hooks/use-toast';
import { X, Mic, MicIcon } from 'lucide-react';
import { CreateJournalEntryData, JournalEntry } from '@/types/database';
import { journalEntriesService } from '@/services/journalEntries';

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

  // Optimized silence detection callback
  const handleSilenceDetected = React.useCallback(() => {
    console.log('Silence detected, showing processing state');
    setProcessingState('processing');
  }, []);

  // Optimized transcript ready callback
  const handleTranscriptReady = React.useCallback((transcript: string) => {
    console.log('Transcript ready:', transcript);
    const currentText = getValues('entry_text') || '';
    
    setExistingText(currentText);
    const newTranscript = currentText ? ` ${transcript}` : transcript;
    setNewTranscriptToType(newTranscript);
    
    setProcessingState('typing');
    animationKeyRef.current++;
    setStartTyping(true);
  }, [getValues]);

  // Use optimized speech-to-text hook with performance config
  const { isRecording, isProcessing, audioLevel, toggleRecording } = useSpeechToTextOptimized(
    handleTranscriptReady,
    handleSilenceDetected,
    {
      silenceThreshold: 10, // Slightly higher threshold for less sensitive detection
      silenceTimeout: 2500, // Slightly shorter timeout for faster response
      maxRecordingTime: 45000, // 45 seconds max
      audioAnalysisInterval: 150 // Less frequent analysis for better performance
    }
  );

  // Type animation configuration with optimized settings
  const { displayText, isTyping, showCursor, stopTyping } = useTypeAnimation(
    newTranscriptToType,
    startTyping,
    {
      speed: 30, // Faster typing for better UX
      punctuationDelay: 150, // Shorter delays
      onComplete: () => {
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
      },
      onInterrupt: () => {
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
    }
  );

  // Optimized textarea change handler
  const handleTextareaChange = React.useCallback((value: string) => {
    if (isTyping) {
      stopTyping();
    }
    return value;
  }, [isTyping, stopTyping]);

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
        await journalEntriesService.updateJournalEntry(existingEntry.id, {
          entry_text: data.entry_text,
        });
        
        toast({
          title: "Success",
          description: "Journal entry updated successfully!",
        });
      } else {
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
      console.error('Error saving journal entry:', error);
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

  // Optimized display value computation
  const getTextareaDisplayValue = React.useMemo(() => {
    if (processingState === 'typing') {
      return existingText + displayText;
    }
    return getValues('entry_text') || '';
  }, [processingState, existingText, displayText, getValues]);

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
                    value={getTextareaDisplayValue}
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
            
            {/* Optimized processing indicators */}
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
            
            {/* Enhanced mic button with visual feedback */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Audio level indicator */}
                {isRecording && (
                  <div className="flex items-center gap-1">
                    <div className="text-xs text-muted-foreground">Level:</div>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-100"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isProcessing || processingState !== 'idle'}
                className={`p-2.5 rounded-full transition-all duration-200 ${
                  isRecording 
                    ? 'bg-red-100 text-red-600 animate-pulse' 
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
