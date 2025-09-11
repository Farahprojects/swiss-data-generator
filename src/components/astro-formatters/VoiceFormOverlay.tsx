import React, { useState, useRef, useCallback } from 'react';
import { X, Mic, MicOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConversationAudioPipeline } from '@/services/audio/ConversationAudioPipeline';
import { sttService } from '@/services/voice/stt';
import { useAudioStore } from '@/stores/audioStore';

interface VoiceFormData {
  name: string;
  dob: string;
  time: string;
  place: string;
  email: string;
  compatibility: boolean;
}

interface VoiceFormOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReady: (data: VoiceFormData) => void;
  isSecondPerson?: boolean;
  onNextPerson?: () => void;
}

export const VoiceFormOverlay: React.FC<VoiceFormOverlayProps> = ({
  isOpen,
  onClose,
  onDataReady,
  isSecondPerson = false,
  onNextPerson
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<VoiceFormData>({
    name: '',
    dob: '',
    time: '',
    place: '',
    email: '',
    compatibility: false
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [transcription, setTranscription] = useState('');
  
  const pipelineRef = useRef<ConversationAudioPipeline | null>(null);
  const { initializeAudioContext, resumeAudioContext } = useAudioStore();

  // Regex patterns for parsing birth data
  const parseBirthData = useCallback((text: string): Partial<VoiceFormData> => {
    const result: Partial<VoiceFormData> = {};
    const errors: string[] = [];
    
    // Clean the text
    const cleanText = text.toLowerCase().trim();
    
    // Name pattern - usually at the start, before any date/time
    const nameMatch = cleanText.match(/^([^,\d]+?)(?:\s*,\s*|\s+(?:born|birth|dob|date))/);
    if (nameMatch) {
      result.name = nameMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Date patterns - various formats
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i, // Month DD, YYYY
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i // DD Month YYYY
    ];
    
    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        if (pattern.source.includes('january|february')) {
          // Month name format
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                            'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.indexOf(match[1].toLowerCase());
          if (monthIndex !== -1) {
            const month = String(monthIndex + 1).padStart(2, '0');
            const day = match[2].padStart(2, '0');
            const year = match[3];
            result.dob = `${year}-${month}-${day}`;
            break;
          }
        } else {
          // Numeric format
          const [, part1, part2, part3] = match;
          if (part1.length === 4) {
            // YYYY-MM-DD format
            result.dob = `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
          } else {
            // MM/DD/YYYY or MM-DD-YYYY format
            result.dob = `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
          }
          break;
        }
      }
    }
    
    // Time patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i, // HH:MM AM/PM
      /(\d{1,2})\s*(am|pm)/i, // H AM/PM
      /(\d{1,2}):(\d{2})/ // HH:MM (24-hour)
    ];
    
    for (const pattern of timePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const ampm = match[3]?.toLowerCase();
        
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        
        result.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        break;
      }
    }
    
    // Place patterns - usually after time or date
    const placePatterns = [
      /(?:in|at|born in|place)\s+([^,]+?)(?:\s*,\s*|\s*$)/i,
      /(?:location|where)\s+([^,]+?)(?:\s*,\s*|\s*$)/i
    ];
    
    for (const pattern of placePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        result.place = match[1].trim().replace(/\b\w/g, l => l.toUpperCase());
        break;
      }
    }
    
    // If no specific place pattern, try to find city/state/country after date/time
    if (!result.place) {
      const afterDateTime = cleanText.replace(/^[^,]*?(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december).*?(?:\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i, '');
      const placeMatch = afterDateTime.match(/([a-z\s]+)/i);
      if (placeMatch && placeMatch[1].trim().length > 2) {
        result.place = placeMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    return result;
  }, []);

  const startVoiceCapture = useCallback(async () => {
    try {
      setIsRecording(true);
      setErrors([]);
      setTranscription('');
      
      // Initialize audio context
      const audioContext = initializeAudioContext();
      await resumeAudioContext();
      
      // Create audio pipeline
      pipelineRef.current = new ConversationAudioPipeline({
        onSpeechStart: () => {
          console.log('Speech started');
        },
        onSpeechEnd: async (audioBlob) => {
          console.log('Speech ended, processing...');
          setIsProcessing(true);
          
          try {
            // Send to STT service
            const result = await sttService.transcribe(audioBlob, 'conversation', '');
            const text = result.text;
            setTranscription(text);
            
            // Parse the transcription
            const parsedData = parseBirthData(text);
            
            // Update form data
            setFormData(prev => ({
              ...prev,
              ...parsedData
            }));
            
            // Check for parsing errors
            const newErrors: string[] = [];
            if (!parsedData.name) newErrors.push('Name not detected');
            if (!parsedData.dob) newErrors.push('Date of birth not detected');
            if (!parsedData.time) newErrors.push('Time of birth not detected');
            if (!parsedData.place) newErrors.push('Place of birth not detected');
            
            setErrors(newErrors);
            
          } catch (error) {
            console.error('STT processing error:', error);
            setErrors(['Failed to process speech. Please try again.']);
          } finally {
            setIsProcessing(false);
          }
        },
        onError: (error) => {
          console.error('Audio pipeline error:', error);
          setErrors(['Microphone error. Please try again.']);
          setIsRecording(false);
        }
      });
      
      await pipelineRef.current.init();
      await pipelineRef.current.start();
      
    } catch (error) {
      console.error('Voice capture error:', error);
      setErrors(['Failed to start voice capture. Please try again.']);
      setIsRecording(false);
    }
  }, [initializeAudioContext, resumeAudioContext, parseBirthData]);

  const stopVoiceCapture = useCallback(async () => {
    if (pipelineRef.current) {
      await pipelineRef.current.dispose();
      pipelineRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (errors.length === 0) {
      onDataReady(formData);
    }
  }, [formData, errors, onDataReady]);

  const handleFieldChange = useCallback((field: keyof VoiceFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-light italic">
            {isSecondPerson ? 'Second Person Details' : 'Voice Input'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Voice Capture Section */}
          <div className="text-center space-y-4">
            <div className="text-lg font-light">
              Please say your name, date of birth, time of birth, and place of birth in order.
            </div>
            
            <Button
              onClick={isRecording ? stopVoiceCapture : startVoiceCapture}
              disabled={isProcessing}
              className="w-full h-12 text-lg font-light"
              variant={isRecording ? "destructive" : "default"}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : isRecording ? (
                <div className="flex items-center space-x-2">
                  <MicOff className="h-5 w-5" />
                  <span>Stop Recording</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Mic className="h-5 w-5" />
                  <span>Tap to Speak</span>
                </div>
              )}
            </Button>
            
            {transcription && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-600 mb-2">Transcription:</div>
                <div className="text-sm font-mono">{transcription}</div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleFieldChange('dob', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time of Birth</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleFieldChange('time', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="place">Place of Birth</Label>
                <Input
                  id="place"
                  value={formData.place}
                  onChange={(e) => handleFieldChange('place', e.target.value)}
                  placeholder="Enter place of birth"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="Enter email address"
                className="font-mono"
              />
              <div className="text-xs text-gray-500">Email must be entered manually for security</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compatibility"
                checked={formData.compatibility}
                onChange={(e) => handleFieldChange('compatibility', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="compatibility" className="text-sm">
                Include compatibility analysis
              </Label>
            </div>
          </div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2 text-red-600 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Please check the following:</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="font-light"
            >
              Cancel
            </Button>
            
            <div className="flex space-x-2">
              {isSecondPerson && onNextPerson && (
                <Button
                  onClick={onNextPerson}
                  variant="outline"
                  className="font-light"
                >
                  Next Person
                </Button>
              )}
              
              <Button
                onClick={handleSubmit}
                disabled={errors.length > 0 || !formData.name || !formData.dob || !formData.time || !formData.place || !formData.email}
                className="font-light"
              >
                {isSecondPerson ? 'Complete' : 'Use This Data'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
