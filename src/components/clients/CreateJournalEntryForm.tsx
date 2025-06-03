
import React, { useState, useRef } from 'react';
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
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useTypeAnimation } from '@/hooks/useTypeAnimation';
import { useToast } from '@/hooks/use-toast';
import { X, Mic } from 'lucide-react';
import JournalEntryMetadataForm from './JournalEntryMetadataForm';

const journalEntrySchema = z.object({
  entry_text: z.string().min(1, 'Entry text is required'),
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
  const [newTranscriptToType, setNewTranscriptToType] = useState('');
  const [existingText, setExistingText] = useState('');
  const [startTyping, setStartTyping] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [entryText, setEntryText] = useState('');
  const animationKeyRef = useRef(0);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors },
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
    
    // Store existing text and new transcript separately
    setExistingText(currentText);
    const newTranscript = currentText ? ` ${transcript}` : transcript;
    setNewTranscriptToType(newTranscript);
    
    setProcessingState('typing');
    animationKeyRef.current++;
    setStartTyping(true);
  };

  // Type animation configuration
  const { displayText, isTyping, showCursor, stopTyping } = useTypeAnimation(
    newTranscriptToType,
    startTyping,
    {
      speed: 50,
      punctuationDelay: 200,
      onComplete: () => {
        console.log('Type animation complete');
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
        console.log('Type animation interrupted by user');
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
    // Store the entry text and move to metadata form
    setEntryText(data.entry_text);
    setShowMetadataForm(true);
  };

  const handleClose = () => {
    if (isTyping) {
      stopTyping();
    }
    setProcessingState('idle');
    setStartTyping(false);
    setNewTranscriptToType('');
    setExistingText('');
    setShowMetadataForm(false);
    setEntryText('');
    reset();
    onOpenChange(false);
  };

  const handleBackFromMetadata = () => {
    setShowMetadataForm(false);
  };

  const handleEntryCreated = () => {
    handleClose();
    onEntryCreated();
  };

  // Compute the display value for the textarea
  const getTextareaDisplayValue = () => {
    if (processingState === 'typing') {
      return existingText + displayText;
    }
    return getValues('entry_text') || '';
  };

  return (
    <>
      <Dialog open={open && !showMetadataForm} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Write Your Journal Entry</DialogTitle>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isRecording || isProcessing || processingState === 'typing'}
              >
                Next: Add Title & Tags
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Metadata Form */}
      <JournalEntryMetadataForm
        clientId={clientId}
        entryText={entryText}
        open={showMetadataForm}
        onOpenChange={() => {}}
        onEntryCreated={handleEntryCreated}
        onBack={handleBackFromMetadata}
      />
    </>
  );
};

export default CreateJournalEntryForm;
