
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { clearAllSessionData } from '@/utils/urlHelpers';

export type DrawerStep = 1 | 2 | 3 | 4;
export const useMobileDrawerForm = () => {
  const [currentStep, setCurrentStep] = useState<DrawerStep>(1);
  const [isOpen, setIsOpen] = useState(false);

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

  const nextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as DrawerStep);
    }
  }, [currentStep]);

  const autoAdvanceAfterPlaceSelection = useCallback((isSecondPerson = false) => {
    const reportCategory = form.watch('reportCategory');
    const request = form.watch('request');
    const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';
    
    // Always advance to payment step after place selection
    // For compatibility reports, this will advance after second person's place is selected
    // For single person reports, this will advance after first person's place is selected
    setTimeout(() => {
      setCurrentStep(4);
    }, 100);
  }, [form]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      // Clear any potential error states when navigating backwards
      form.clearErrors();
      setCurrentStep((prev) => (prev - 1) as DrawerStep);
    }
  }, [currentStep, form]);

  const resetForm = useCallback(() => {
    form.reset();
    setCurrentStep(1);
    // Clear all session data when resetting
    clearAllSessionData();
  }, [form]);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    setCurrentStep(1);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    resetForm();
  }, [resetForm]);

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
  };
};
