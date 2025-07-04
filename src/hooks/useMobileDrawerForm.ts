
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';

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

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as DrawerStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Clear any potential error states when navigating backwards
      form.clearErrors();
      setCurrentStep((prev) => (prev - 1) as DrawerStep);
    }
  };

  const openDrawer = () => {
    setIsOpen(true);
    setCurrentStep(1);
  };

  const closeDrawer = () => {
    setIsOpen(false);
    form.reset();
    setCurrentStep(1);
  };

  return {
    form,
    currentStep,
    isOpen,
    nextStep,
    prevStep,
    openDrawer,
    closeDrawer,
  };
};
