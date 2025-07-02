import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Mic } from 'lucide-react';
import clsx from 'clsx';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProcessingIndicator } from '@/components/ui/ProcessingIndicator';
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

/**
 * Sticky mic FAB offset below the Google‑Maps autocomplete element.
 * – Keeps voice‑entry always visible
 * – Turns into a recorder with live progress + transcript preview
 */
const Step2BirthDetails = React.memo(function Step2BirthDetails({
  register,
  setValue,
  watch,
  errors,
  onNext,
  onPrev,
}: Step2BirthDetailsProps) {
  /* ------------------------------------------------------------------ */
  /*                             FORM LOGIC                              */
  /* ------------------------------------------------------------------ */
  const [showSecondPerson, setShowSecondPerson] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const { toast } = useToast();

  const reportCategory = watch('reportCategory');
  const isCompatibilityReport = reportCategory === 'compatibility';

  // Person‑1
  const isFirstPersonComplete = useMemo(() => {
    const name = watch('name');
    const email = watch('email');
    const birthDate = watch('birthDate');
    const birthTime = watch('birthTime');
    const birthLocation = watch('birthLocation');
    return !!(name && email && birthDate && birthTime && birthLocation);
  }, [watch]);

  // Person‑2 (compatibility only)
  const isSecondPersonComplete = useMemo(() => {
    if (!isCompatibilityReport) return true; // not required
    const n = watch('secondPersonName');
    const d = watch('secondPersonBirthDate');
    const t = watch('secondPersonBirthTime');
    const l = watch('secondPersonBirthLocation');
    return !!(n && d && t && l);
  }, [watch, isCompatibilityReport]);

  const canProceed = isCompatibilityReport
    ? isFirstPersonComplete && isSecondPersonComplete
    : isFirstPersonComplete;

  /* ------------------------------------------------------------------ */
  /*                           VOICE RECORDING                           */
  /* ------------------------------------------------------------------ */
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const {
    isRecording,
    isProcessing: isSTTProcessing,
    toggleRecording,
    reset,
  } = useSpeechToText(
    (transcript) => {
      setVoiceText(transcript);
      setIsProcessingVoice(false);
      toast({
        title: 'Voice recorded',
        description: 'You can now edit the details before submitting.',
      });
    },
    () => setIsProcessingVoice(false)
  );

  /* ------------------------------------------------------------------ */
  /*                            ERROR SCROLLING                          */
  /* ------------------------------------------------------------------ */
  const ERROR_FIELDS: (keyof ReportFormData)[] = useMemo(
    () => [
      'name',
      'email',
      'birthDate',
      'birthTime',
      'birthLocation',
      'secondPersonName',
      'secondPersonBirthDate',
      'secondPersonBirthTime',
      'secondPersonBirthLocation',
    ],
    []
  );

  const scrollToFirstError = useCallback(() => {
    if (typeof window === 'undefined') return;
    for (const field of ERROR_FIELDS) {
      if (errors[field]) {
        const el = document.querySelector(`#${field}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }
      }
    }
  }, [ERROR_FIELDS, errors]);

  const handleReviewAndPay = useCallback(() => {
    setHasTriedSubmit(true);
    if (canProceed) return onNext();
    setTimeout(scrollToFirstError, 100); // allow error states to paint first
  }, [canProceed, onNext, scrollToFirstError]);

  /* ------------------------------------------------------------------ */
  /*                               RENDER                               */
  /* ------------------------------------------------------------------ */
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 w-full"
      >
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onPrev} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Your Info</h2>
            <p className="text-gray-600">
              {isCompatibilityReport
                ? "We need both people's details for your compatibility report"
                : 'We need these to create your personalised report'}
            </p>
          </div>
        </div>

        {/* Person‑1 */}
        <PersonCard
          personNumber={1}
          title={isCompatibilityReport ? 'Your Details' : 'Your Details'}
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
          hasTriedToSubmit={hasTriedSubmit}
        />

        {/* Add partner */}
        {isCompatibilityReport && !showSecondPerson && isFirstPersonComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => setShowSecondPerson(true)}
              variant="outline"
              className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Partner's Details
            </Button>
          </motion.div>
        )}

        {/* Person‑2 */}
        <AnimatePresence>
          {isCompatibilityReport && showSecondPerson && (
            <motion.div
              key="partner"
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
                hasTriedToSubmit={hasTriedSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spacer for sticky FAB */}
        <div className="h-28" />

        {/* Review & Pay */}
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
          >
            Review & Pay
          </Button>
        </motion.div>
      </motion.div>

      {/* -------------------------------------------------------------- */}
      {/*  Sticky Mic Floating‑Action Button – always visible on Step‑2 */}
      {/* -------------------------------------------------------------- */}
      <button
        type="button"
        onClick={toggleRecording}
        disabled={isSTTProcessing || isProcessingVoice}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        title={isRecording ? 'Stop recording' : 'Record your details by voice'}
        className={clsx(
          'fixed z-50 left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center rounded-full border-2 shadow-lg transition-transform duration-200',
          isRecording
            ? 'bg-red-500 text-white animate-pulse shadow-red-300 border-red-400'
            : 'bg-primary text-white hover:bg-primary/90 border-primary/20',
          (isSTTProcessing || isProcessingVoice) && 'opacity-50 cursor-not-allowed'
        )}
        style={{ width: 64, height: 64 }}
      >
        <Mic className="w-6 h-6" />
      </button>

      {/* Transcript overlay (appears when voiceText exists) */}
      <AnimatePresence>
        {voiceText && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed z-40 bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 space-y-2 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" /> Recorded Details
            </h3>
            <Textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  setVoiceText('');
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  /* Ideally map transcript to inputs via AI/NLP */
                  toast({
                    title: 'Coming soon',
                    description: 'Auto‑populate from transcript is under development.',
                  });
                }}
              >
                Auto‑fill (BETA)
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing overlay */}
      {(isSTTProcessing || isProcessingVoice) && (
        <ProcessingIndicator
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50"
          message="Processing speech..."
        />
      )}
    </div>
  );
});

export default Step2BirthDetails;
