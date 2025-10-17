import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLocation, useNavigate } from 'react-router-dom';

// Custom hooks
import { useAstroConversation } from '@/hooks/useAstroConversation';
import { useAstroFormValidation } from '@/hooks/useAstroFormValidation';
import { useAstroReportPayload } from '@/hooks/useAstroReportPayload';

// Step components
import { AstroTypeStep } from './AstroForm/AstroTypeStep';
import { AstroDetailsStep } from './AstroForm/AstroDetailsStep';
import { AstroSecondPersonStep } from './AstroForm/AstroSecondPersonStep';

interface AstroDataFormProps {
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
  preselectedType?: string;
  reportType?: string;
  contextId?: string;
  isProfileFlow?: boolean;
  variant?: 'standalone' | 'insights';
  mode?: 'chat' | 'astro' | 'insight';
}

const DEFAULT_FORM_VALUES: ReportFormData = {
  name: '',
  email: '',
  birthDate: '',
  birthTime: '',
  birthLocation: '',
  birthLatitude: undefined,
  birthLongitude: undefined,
  birthPlaceId: '',
  secondPersonName: '',
  secondPersonBirthDate: '',
  secondPersonBirthTime: '',
  secondPersonBirthLocation: '',
  secondPersonLatitude: undefined,
  secondPersonLongitude: undefined,
  secondPersonPlaceId: '',
  request: '',
  reportType: null,
};

export const AstroDataForm: React.FC<AstroDataFormProps> = ({
  onClose,
  onSubmit,
  preselectedType,
  reportType,
  contextId,
  isProfileFlow = false,
  variant = 'standalone',
  mode: explicitMode,
}) => {
  // State
  const isInsights = variant === 'insights';
  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'secondPerson'>(
    isInsights ? 'details' : preselectedType ? 'details' : 'type'
  );
  const [selectedAstroType, setSelectedAstroType] = useState<string>(preselectedType || '');
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hooks
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode: contextMode } = useMode();
  const { createConversation, cleanupEmptyConversation } = useAstroConversation();
  const { validatePrimaryPerson, validateSecondPerson } = useAstroFormValidation();
  const { buildReportPayload } = useAstroReportPayload();

  const mode = explicitMode || contextMode;
  const isAuthenticated = location.pathname.startsWith('/c/');
  const shouldDisableAnimations = isProfileFlow;

  // Form setup
  const form = useForm<ReportFormData>({
    defaultValues: { ...DEFAULT_FORM_VALUES, request: preselectedType || '', reportType },
  });

  const { register, handleSubmit, setValue, setError, watch, formState: { errors } } = form;
  const formValues = watch();

  // Handlers
  const handleAstroTypeSelect = (type: string) => {
    setSelectedAstroType(type);
    setValue('request', type);
    setValue('reportType', null);
    setCurrentStep('details');
  };

  const handleDetailsFormSubmit = () => {
    if (!validatePrimaryPerson(formValues, setError)) return;

    if (selectedAstroType === 'sync') {
      setCurrentStep('secondPerson');
    } else {
      handleFormSubmission(formValues);
    }
  };

  const handleSecondPersonFormSubmit = () => {
    if (!validateSecondPerson(formValues, setError)) return;
    handleFormSubmission(formValues);
  };

  const handleFormSubmission = async (data: ReportFormData) => {
    if (!user) return;
    if (!mode || (mode !== 'astro' && mode !== 'insight')) {
      toast.error('Please select a mode from the dropdown menu before submitting.');
      return;
    }

    setIsProcessing(true);

    try {
      // Always create new conversation for astro and insight modes
      const payload = buildReportPayload(data, selectedAstroType);
      const title = mode === 'insight' ? `${data.name} - Insight` : data.name;
      const currentChatId = await createConversation(mode as 'astro' | 'insight', 
        title,
        { reportType, ...payload }
      );

      onSubmit({ ...data, chat_id: currentChatId });

      if (!isProfileFlow && variant !== 'insights') {
        onClose();
      }
    } catch (error) {
      console.error('[AstroDataForm] Submission error:', error);
      toast.error('Failed to submit astro data. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    try {
      // Restore scroll state on mobile
      if (isMobile) {
        const html = document.documentElement;
        const scrollY = html.getAttribute('data-scroll-y');
        html.classList.remove('lock-scroll');
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY, 10));
          html.removeAttribute('data-scroll-y');
        }
        document.body.classList.remove('astro-form-open');
      }
    } catch {}
    
    onClose();
  };

  const goBackToType = () => {
    setCurrentStep('type');
    setSelectedAstroType('');
  };

  const goBackToDetails = () => {
    setCurrentStep('details');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <motion.div
          initial={shouldDisableAnimations ? undefined : { opacity: 0 }}
          animate={shouldDisableAnimations ? undefined : { opacity: 1 }}
          exit={shouldDisableAnimations ? undefined : { opacity: 0 }}
          transition={shouldDisableAnimations ? { duration: 0 } : undefined}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleClose}
        />
      )}

      <motion.div
        initial={shouldDisableAnimations ? undefined : { opacity: 0, y: 20 }}
        animate={shouldDisableAnimations ? undefined : { opacity: 1, y: 0 }}
        exit={shouldDisableAnimations ? undefined : { opacity: 0, y: -20 }}
        transition={shouldDisableAnimations ? { duration: 0 } : undefined}
        className={`bg-white overflow-hidden ${
          isMobile
            ? 'fixed inset-0 z-50 rounded-none flex flex-col'
            : 'rounded-full'
        }`}
      >
        {/* Mobile close button */}
        {isMobile && (
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-light text-gray-900">
              {currentStep === 'type'
                ? 'Choose Your Path'
                : currentStep === 'details'
                  ? 'Your Details'
                  : 'Partner Details'}
            </h2>
            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4 pb-safe' : 'p-6'}`}>
          <AnimatePresence mode="wait">
            {currentStep === 'type' && !isInsights ? (
              <AstroTypeStep
                key="type"
                selectedType={selectedAstroType}
                onSelectType={handleAstroTypeSelect}
                shouldDisableAnimations={shouldDisableAnimations}
              />
            ) : currentStep === 'details' ? (
              <AstroDetailsStep
                key="details"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                isMobile={isMobile}
                activeSelector={activeSelector}
                setActiveSelector={setActiveSelector}
                onBack={goBackToType}
                onNext={handleDetailsFormSubmit}
                isProcessing={isProcessing}
                isInsights={isInsights}
                shouldDisableAnimations={shouldDisableAnimations}
              />
            ) : currentStep === 'secondPerson' ? (
              <AstroSecondPersonStep
                key="secondPerson"
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                isMobile={isMobile}
                activeSelector={activeSelector}
                setActiveSelector={setActiveSelector}
                onBack={goBackToDetails}
                onSubmit={handleSecondPersonFormSubmit}
                isProcessing={isProcessing}
                shouldDisableAnimations={shouldDisableAnimations}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};
