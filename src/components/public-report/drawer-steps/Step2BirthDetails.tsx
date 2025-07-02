import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProcessingIndicator } from '@/components/ui/ProcessingIndicator';
import { TypingCursor } from '@/components/ui/TypingCursor';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useToast } from '@/hooks/use-toast';
import { ReportFormData } from '@/types/public-report';
import PersonCard from './PersonCard';

interface Step2BirthDetailsProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const Step2BirthDetails = ({ register, setValue, watch, errors, onNext, onPrev }: Step2BirthDetailsProps) => {
  const [showSecondPerson, setShowSecondPerson] = useState(false);
  const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const { toast } = useToast();

  const reportCategory = watch('reportCategory');
  const isCompatibilityReport = reportCategory === 'compatibility';

  // Watch first person fields
  const name = watch('name');
  const email = watch('email');
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');
  const birthLocation = watch('birthLocation');

  // Watch second person fields
  const secondPersonName = watch('secondPersonName');
  const secondPersonBirthDate = watch('secondPersonBirthDate');
  const secondPersonBirthTime = watch('secondPersonBirthTime');
  const secondPersonBirthLocation = watch('secondPersonBirthLocation');

  const isFirstPersonComplete = name && email && birthDate && birthTime && birthLocation;
  const isSecondPersonComplete = secondPersonName && secondPersonBirthDate && secondPersonBirthTime && secondPersonBirthLocation;

  const canProceed = isCompatibilityReport 
    ? (isFirstPersonComplete && isSecondPersonComplete)
    : isFirstPersonComplete;

  const handleAddSecondPerson = () => {
    setShowSecondPerson(true);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setVoiceText(transcript);
    setIsProcessingVoice(false);
    toast({
      title: "Voice recorded",
      description: "You can now edit the details and submit when ready",
    });
  };

  const handleSilenceDetected = () => {
    setIsProcessingVoice(false);
  };

  const { isRecording, isProcessing, toggleRecording } = useSpeechToText(
    handleVoiceTranscript,
    handleSilenceDetected
  );

  const scrollToFirstError = () => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Find the first error field and scroll to it
    const errorFields = [
      { field: 'name', element: document.querySelector('#name') },
      { field: 'email', element: document.querySelector('#email') },
      { field: 'birthDate', element: document.querySelector('#birthDate') },
      { field: 'birthTime', element: document.querySelector('#birthTime') },
      { field: 'birthLocation', element: document.querySelector('#birthLocation') },
      { field: 'secondPersonName', element: document.querySelector('#secondPersonName') },
      { field: 'secondPersonBirthDate', element: document.querySelector('#secondPersonBirthDate') },
      { field: 'secondPersonBirthTime', element: document.querySelector('#secondPersonBirthTime') },
      { field: 'secondPersonBirthLocation', element: document.querySelector('#secondPersonBirthLocation') },
    ];

    for (const { field, element } of errorFields) {
      if (errors[field as keyof FieldErrors<ReportFormData>] && element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
        break;
      }
    }
  };

  const handleReviewAndPay = () => {
    setHasTriedToSubmit(true);
    
    // Check if form is valid before proceeding
    if (canProceed) {
      onNext();
    } else {
      // Scroll to first error after a brief delay to allow error states to update
      setTimeout(() => {
        scrollToFirstError();
      }, 100);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 w-full"
      >
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Your Info</h2>
            <p className="text-gray-600">
              {isCompatibilityReport 
                ? "We need both people's details for your compatibility report" 
                : "We need these to create your personalized report"
              }
            </p>
          </div>
        </div>

        <div className="space-y-6 w-full">
          {/* Voice Recording Section - Enhanced visibility */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 p-6 space-y-4 sticky top-4 z-30 backdrop-blur-md shadow-lg bg-white/95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Quick Voice Entry
              </h3>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isProcessing || isProcessingVoice}
                className={`p-4 rounded-full transition-all duration-200 shadow-lg border-2 ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-red-300 border-red-300' 
                    : 'bg-primary text-white hover:bg-primary/90 hover:scale-105 border-primary/20'
                } ${(isProcessing || isProcessingVoice) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                title={isRecording ? 'Stop recording' : 'Record your details'}
              >
                <Mic className="w-6 h-6" />
              </button>
            </div>
            
            {(isProcessing || isProcessingVoice) && (
              <ProcessingIndicator 
                message="Processing speech..." 
                className="py-2"
              />
            )}
            
            {voiceText && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Recorded Details</label>
                <Textarea
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  placeholder="Your voice recording will appear here..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">You can edit the details above and then submit when ready</p>
              </div>
            )}
            
            {!voiceText && !isRecording && !isProcessing && (
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium">Tap the mic</span> to quickly record all your details at once
              </p>
            )}
          </div>

          {/* First Person Card */}
          <PersonCard
            personNumber={1}
            title={isCompatibilityReport ? "Your Details" : "Your Details"}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            hasTriedToSubmit={hasTriedToSubmit}
          />

          {/* Add Second Person Button */}
          {isCompatibilityReport && !showSecondPerson && isFirstPersonComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Button
                onClick={handleAddSecondPerson}
                variant="outline"
                className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Partner's Details
              </Button>
            </motion.div>
          )}

          {/* Second Person Card */}
          <AnimatePresence>
            {isCompatibilityReport && showSecondPerson && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PersonCard
                  personNumber={2}
                  title="Partner's Details"
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  hasTriedToSubmit={hasTriedToSubmit}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Review & Pay Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pb-6 w-full"
        >
          <Button
            onClick={handleReviewAndPay}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
            size="lg"
          >
            Review & Pay
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Step2BirthDetails;
