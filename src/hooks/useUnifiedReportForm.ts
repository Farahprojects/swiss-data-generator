import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';

export type FormStep = 1 | 2 | 3 | 4;

export const useUnifiedReportForm = () => {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const form = useForm<ReportFormData>({
    defaultValues: {
      reportType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      secondPersonName: '',
      secondPersonBirthDate: '',
      secondPersonBirthTime: '',
      secondPersonBirthLocation: '',
    },
  });

  const { submitReport, isProcessing, reportCreated, resetReportState } = useReportSubmission();

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4) as FormStep);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1) as FormStep);
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    setCurrentStep(1);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setCurrentStep(1);
  }, []);

  const resetForm = useCallback(() => {
    form.reset();
    setCurrentStep(1);
    resetReportState();
    setIsDrawerOpen(false);
  }, [form, resetReportState]);

  // Watch form values for step validation
  const watchedValues = form.watch();
  const reportType = watchedValues.reportType;
  const requiresSecondPerson = reportType === 'sync';

  // Step completion validation
  const step1Done = !!reportType;
  const step2Done = !!watchedValues.name && !!watchedValues.email && !!watchedValues.birthDate && !!watchedValues.birthTime && !!watchedValues.birthLocation;
  const step3Done = !requiresSecondPerson || (!!watchedValues.secondPersonName && !!watchedValues.secondPersonBirthDate && !!watchedValues.secondPersonBirthTime && !!watchedValues.secondPersonBirthLocation);

  const canGoNext = currentStep === 1 ? step1Done :
                   currentStep === 2 ? step2Done :
                   currentStep === 3 ? step3Done : true;

  const isLastStep = requiresSecondPerson ? currentStep === 4 : currentStep === 3;

  return {
    // Form state
    form,
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    canGoNext,
    isLastStep,
    
    // Drawer state
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    
    // Form validation
    step1Done,
    step2Done,
    step3Done,
    requiresSecondPerson,
    
    // Submission
    submitReport,
    isProcessing,
    reportCreated,
    resetForm,
    
    // Watched values
    watchedValues,
    reportType,
  };
};