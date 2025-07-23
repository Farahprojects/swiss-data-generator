
import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { clearAllSessionData } from '@/utils/urlHelpers';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { generateRequestId } from '@/utils/requestIdGenerator';
import { log } from '@/utils/logUtils';

export type DrawerStep = 1 | 2 | 3 | 4;

export const useMobileFormWrapper = () => {
  const [currentStep, setCurrentStep] = useState<DrawerStep>(1);
  const [isOpen, setIsOpen] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const formSubmissionStartTimeRef = useRef<number | null>(null);

  // Use the exact same form setup as desktop ReportForm
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: 'onBlur',
    defaultValues: {
      reportType: '',
      reportCategory: undefined,
      reportSubCategory: '',
      relationshipType: undefined,
      essenceType: undefined,
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      secondPersonName: '',
      secondPersonBirthDate: '',
      secondPersonBirthTime: '',
      secondPersonBirthLocation: '',
      promoCode: '',
      notes: '',
    },
  });

  // Use the exact same submission hook as desktop
  const { 
    isProcessing, 
    submitReport, 
    reportCreated,
    inlinePromoError,
    clearInlinePromoError
  } = useReportSubmission();

  const nextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as DrawerStep);
    }
  }, [currentStep]);

  const autoAdvanceAfterPlaceSelection = useCallback((isSecondPerson = false) => {
    // Removed auto-advance - let user control progression manually
  }, []);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      form.clearErrors();
      setCurrentStep((prev) => (prev - 1) as DrawerStep);
    }
  }, [currentStep, form]);

  const resetForm = useCallback(() => {
    form.reset();
    setCurrentStep(1);
    clearAllSessionData();
    requestIdRef.current = null;
    formSubmissionStartTimeRef.current = null;
  }, [form]);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    setCurrentStep(1);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

  // Desktop-compatible submission handler with performance timing
  const handleSubmit = useCallback(async (data: ReportFormData) => {
    try {
      // Generate request ID and start timing (same as desktop)
      const requestId = generateRequestId();
      requestIdRef.current = requestId;
      formSubmissionStartTimeRef.current = Date.now();

      log('info', '[Mobile] Form submission started', { 
        requestId,
        reportType: data.reportType || data.reportCategory,
        startTime: formSubmissionStartTimeRef.current 
      }, 'mobileForm');

      // Call the exact same submission logic as desktop
      await submitReport(data, requestId, formSubmissionStartTimeRef.current);

      log('info', '[Mobile] Form submission completed', { 
        requestId,
        processingTime: Date.now() - formSubmissionStartTimeRef.current!
      }, 'mobileForm');

    } catch (error) {
      log('error', '[Mobile] Form submission failed', { 
        requestId: requestIdRef.current,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'mobileForm');
      throw error;
    }
  }, [submitReport]);

  return {
    form,
    currentStep,
    isOpen,
    nextStep,
    prevStep,
    openDrawer,
    closeDrawer,
    resetForm,
    autoAdvanceAfterPlaceSelection,
    // Desktop submission logic wrapped for mobile
    handleSubmit,
    isProcessing,
    reportCreated,
    inlinePromoError,
    clearInlinePromoError,
    requestId: requestIdRef.current,
    formSubmissionStartTime: formSubmissionStartTimeRef.current,
  };
};
