
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { clearAllSessionData } from '@/utils/urlHelpers';
import { useFormCompletionWatcher } from './useFormCompletionWatcher';

export type DrawerStep = 1 | 2 | 3 | 4;
export const useMobileDrawerForm = () => {
  const [currentStep, setCurrentStep] = useState<DrawerStep>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

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

  // Determine if this is a compatibility report
  const reportCategory = form.watch('reportCategory');
  const request = form.watch('request');
  const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';

  // Set up form completion watcher for auto-navigation
  useFormCompletionWatcher({
    watch: form.watch,
    isCompatibilityReport,
    onFirstPersonComplete: () => {
      if (currentStep === 2) {
        console.log('🚀 Auto-advancing to next step due to first person completion');
        nextStep();
      }
    },
    onSecondPersonComplete: () => {
      if (currentStep === 2 && isCompatibilityReport) {
        console.log('🚀 Auto-advancing to payment due to second person completion');
        nextStep();
      }
    }
  });

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as DrawerStep);
      setShowValidationErrors(false); // Reset validation errors when successfully advancing
    }
  };

  const attemptNextStep = () => {
    setShowValidationErrors(true); // Show validation errors when attempting to advance
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Clear any potential error states when navigating backwards
      form.clearErrors();
      setCurrentStep((prev) => (prev - 1) as DrawerStep);
    }
  };

  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
    setShowValidationErrors(false);
    // Clear all session data when resetting
    clearAllSessionData();
  };

  const openDrawer = () => {
    setIsOpen(true);
    setCurrentStep(1);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    resetForm();
  };

  return {
    form,
    currentStep,
    isOpen,
    nextStep,
    prevStep,
    openDrawer,
    closeDrawer,
    resetForm,
    showValidationErrors,
    attemptNextStep,
  };
};
