import { useState, useCallback, useRef } from 'react';
import { UseFormSetValue } from 'react-hook-form';
// import { useJournalMicrophone } from './microphone/useJournalMicrophone';
import { useToast } from './use-toast';
import { ReportFormData } from '@/types/public-report';

export interface FieldMapping {
  field: keyof ReportFormData;
  pattern: RegExp[];
  transform?: (value: string) => string;
}

export interface SpeechFlow {
  id: string;
  prompt: string;
  expectedFields: FieldMapping[];
  confirmationMessage: string;
}

// Smart field mapping patterns
const FIELD_PATTERNS: Record<string, FieldMapping> = {
  name: {
    field: 'name',
    pattern: [
      /my name is ([^,.\n]+)/i,
      /i'm ([^,.\n]+)/i,
      /call me ([^,.\n]+)/i,
      /^([^,.\n]+) is my name/i,
    ],
    transform: (value: string) => value.trim().replace(/\s+/g, ' ')
  },
  email: {
    field: 'email',
    pattern: [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /email is ([^,.\s]+)/i,
      /my email ([^,.\s]+)/i,
    ]
  },
  birthDate: {
    field: 'birthDate',
    pattern: [
      /born (?:on )?([^,.\n]+)/i,
      /birthday (?:is )?([^,.\n]+)/i,
      /birth date (?:is )?([^,.\n]+)/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
    ],
    transform: (value: string) => {
      // Convert natural language dates to YYYY-MM-DD format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return value;
    }
  },
  birthTime: {
    field: 'birthTime',
    pattern: [
      /born at (\d{1,2}:\d{2}(?:\s*[AP]M)?)/i,
      /birth time (?:was )?(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i,
      /(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i,
      /(\d{1,2} o'clock)/i,
    ],
    transform: (value: string) => {
      // Convert to 24-hour format
      const timeMatch = value.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] || '00';
        const ampm = timeMatch[3]?.toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
      return value;
    }
  },
  birthLocation: {
    field: 'birthLocation',
    pattern: [
      /born in ([^,.\n]+)/i,
      /from ([^,.\n]+)/i,
      /in ([^,.\n]+)/i,
      /city is ([^,.\n]+)/i,
      /location (?:is )?([^,.\n]+)/i,
    ]
  },
};

// Predefined flows for common scenarios
export const SPEECH_FLOWS: Record<string, SpeechFlow> = {
  personalDetails: {
    id: 'personalDetails',
    prompt: "Say your name, date of birth, time of birth, and city where you were born",
    expectedFields: [
      FIELD_PATTERNS.name,
      FIELD_PATTERNS.birthDate,
      FIELD_PATTERNS.birthTime,
      FIELD_PATTERNS.birthLocation,
    ],
    confirmationMessage: "Perfect! I've captured your personal details."
  },
  emailCapture: {
    id: 'emailCapture',
    prompt: "What's your email address?",
    expectedFields: [FIELD_PATTERNS.email],
    confirmationMessage: "Email captured!"
  },
  partnerDetails: {
    id: 'partnerDetails',
    prompt: "Now tell me your partner's name, date of birth, time of birth, and city",
    expectedFields: [
      { ...FIELD_PATTERNS.name, field: 'secondPersonName' },
      { ...FIELD_PATTERNS.birthDate, field: 'secondPersonBirthDate' },
      { ...FIELD_PATTERNS.birthTime, field: 'secondPersonBirthTime' },
      { ...FIELD_PATTERNS.birthLocation, field: 'secondPersonBirthLocation' },
    ],
    confirmationMessage: "Great! Your partner's details are captured."
  },
};

export interface MappedField {
  field: keyof ReportFormData;
  value: string;
  confidence: number;
}

export const useSpeechOrchestrator = (setValue: UseFormSetValue<ReportFormData>) => {
  const [currentFlow, setCurrentFlow] = useState<SpeechFlow | null>(null);
  const [mappedFields, setMappedFields] = useState<MappedField[]>([]);
  const [isShowingConfirmation, setIsShowingConfirmation] = useState(false);
  const [transcript, setTranscript] = useState('');
  const pendingTranscript = useRef<string>('');
  const { toast } = useToast();

  // Smart field extraction from transcript
  const extractFields = useCallback((text: string, expectedFields: FieldMapping[]): MappedField[] => {
    const results: MappedField[] = [];
    
    expectedFields.forEach(mapping => {
      for (const pattern of mapping.pattern) {
        const match = text.match(pattern);
        if (match) {
          let value = match[1] || match[0];
          
          if (mapping.transform) {
            value = mapping.transform(value);
          }
          
          // Calculate confidence based on pattern specificity
          const confidence = pattern.source.includes('\\d') ? 0.9 : 0.7;
          
          results.push({
            field: mapping.field,
            value: value.trim(),
            confidence
          });
          break; // Use first matching pattern
        }
      }
    });
    
    return results;
  }, []);

  // Temporarily disable microphone functionality
  const isRecording = false;
  const isProcessing = false;
  const audioLevel = 0;
  const toggleRecording = () => {};

  const startFlow = useCallback((flowId: string) => {
    const flow = SPEECH_FLOWS[flowId];
    if (!flow) {
      toast({
        title: 'Error',
        description: 'Unknown speech flow',
        variant: 'destructive',
      });
      return;
    }
    
    setCurrentFlow(flow);
    setMappedFields([]);
    setIsShowingConfirmation(false);
    setTranscript('');
    
    toast({
      title: 'Ready to record',
      description: flow.prompt,
    });
  }, [toast]);

  const confirmMapping = useCallback(() => {
    mappedFields.forEach(mapped => {
      setValue(mapped.field, mapped.value);
    });
    
    toast({
      title: currentFlow?.confirmationMessage || 'Fields updated!',
      description: `${mappedFields.length} field${mappedFields.length > 1 ? 's' : ''} successfully filled.`,
    });
    
    // Reset state
    setCurrentFlow(null);
    setMappedFields([]);
    setIsShowingConfirmation(false);
    setTranscript('');
  }, [mappedFields, setValue, currentFlow, toast]);

  const rejectMapping = useCallback(() => {
    setIsShowingConfirmation(false);
    setMappedFields([]);
    
    toast({
      title: 'Try again',
      description: currentFlow?.prompt || 'Please speak again',
    });
  }, [currentFlow, toast]);

  const cancelFlow = useCallback(() => {
    setCurrentFlow(null);
    setMappedFields([]);
    setIsShowingConfirmation(false);
    setTranscript('');
  }, []);

  return {
    // State
    currentFlow,
    mappedFields,
    isShowingConfirmation,
    transcript,
    isRecording,
    isProcessing,
    audioLevel,
    
    // Actions
    startFlow,
    confirmMapping,
    rejectMapping,
    cancelFlow,
    toggleRecording,
    
    // Available flows
    availableFlows: Object.values(SPEECH_FLOWS),
  };
};