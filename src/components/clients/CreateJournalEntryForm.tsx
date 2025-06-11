
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
import { StreamingProgressIndicator } from '@/components/ui/StreamingProgressIndicator';
import { TypingCursor } from '@/components/ui/TypingCursor';
import { useStreamingSpeechToText } from '@/hooks/useStreamingSpeechToText';
import { useEdgeFunctionWarming } from '@/hooks/useEdgeFunctionWarming';
import { useTypeAnimation } from '@/hooks/useTypeAnimation';
import { useToast } from '@/hooks/use-toast';
import { X, Mic } from 'lucide-react';
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
  const [processingState, setProcessingState] = useState<'idle' | 'streaming' | 'typing'>('idle');
  const [newTranscriptToType, setNewTranscriptToType] = useState('');
  const [existingText, setExistingText] = useState('');
  const [startTyping, setStartTyping] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const animationKeyRef = useRef(0);
  
  // Initialize edge function warming
  useEdgeFunctionWarming();
  
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

  // Handle when silence is detected
  const handleSilenceDetected = () => {
    console.log('Silence detected, finalizing transcript');
    setProcessingState('typing');
  };

  // Handle streaming transcript updates
  const handleTranscriptUpdate = (transcript: string, isFinal: boolean) => {
    console.log('Streaming transcript update:', transcript, 'isFinal:', isFinal);
    
    if (isFinal) {
      // Final transcript - prepare for typing animation
      const currentText = getValues('entry_text') || '';
      setExistingText(currentText);
      const newTranscript = currentText ? ` ${transcript}` : transcript;
      setNewTranscriptToType(newTranscript);
      setCurrentStreamingText('');
      
      setProcessingState('typing');
      animationKeyRef.current++;
      setStartTyping(true);
    } else {
      // Interim results - show in real-time
      setCurrentStreamingText(transcript);
    }
  };

  // Fast type animation configuration (reduced from 50ms to 20ms)
  const { displayText, isTyping, showCursor, stopTyping } = useTypeAnimation(
    newTranscriptToType,
    startTyping,
    {
      speed: 20, // Faster typing speed
      punctuationDelay: 100, // Reduced pause delays
      onComplete: () => {
        console.log('Fast type animation complete');
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
        console.log('Fast type animation interrupted by user');
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

  const { 
    isRecording, 
    isProcessing, 
    audioLevel, 
    processingProgress, 
    toggleRecording 
  } = useStreamingSpeechToText(
    handleTranscriptUpdate,
    handleSilenceDetected
  );

  // Update processing state based on streaming STT
  useEffect(() => {
    if (isRecording) {
      setProcessingState('streaming');
    } else if (!isProcessing && processingState === 'streaming') {
      setProcessingState('idle');
    }
  }, [isRecording, isProcessing, processingState]);

  // Handle user typing during animation
  const handleTextareaChange = (value: string) => {
    if (isTyping) {
      console.log('User typing detected during animation, stopping animation');
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
    setCurrentStreamingText('');
    reset();
    onOpenChange(false);
  };

  // Compute the display value for the textarea
  const getTextareaDisplayValue = () => {
    if (processingState === 'typing') {
      return existingText + displayText;
    } else if (processingState === 'streaming' && currentStreamingText) {
      const currentText = getValues('entry_text') || '';
      return currentText + (currentText ? ' ' : '') + currentStreamingText;
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
                  <TypingCursor visible={showCursor} />
                </div>
              )}
            </div>
            
            {errors.entry_text && (
              <p className="text-sm text-destructive">{errors.entry_text.message}</p>
            )}
            
            {/* Enhanced processing indicators */}
            {processingState === 'streaming' && (
              <StreamingProgressIndicator 
                progress={processingProgress}
                isProcessing={isProcessing}
                className="mt-2"
              />
            )}
            
            {processingState === 'streaming' && currentStreamingText && (
              <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                <span>Live transcript: "{currentStreamingText}"</span>
              </div>
            )}
            
            {processingState === 'typing' && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 mt-2">
                <span>Adding text...</span>
                <TypingCursor visible={showCursor} />
              </div>
            )}
            
            {/* Enhanced mic button with audio level indicator */}
            <div className="flex justify-end items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Audio level:</span>
                  <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isProcessing || processingState === 'typing'}
                className={`p-2.5 rounded-full transition-colors ${
                  isRecording 
                    ? 'bg-red-100 text-red-600' 
                    : 'text-gray-500 hover:bg-gray-100'
                } ${(isProcessing || processingState === 'typing') ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                title={isRecording ? 'Stop recording' : 'Start streaming voice recording'}
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
