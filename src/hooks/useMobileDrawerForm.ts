
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';

export type DrawerStep = 1 | 2 | 3;

export interface DrawerFormData {
  reportCategory: 'professional' | 'relational' | 'personal';
  reportType: string;
  relationshipType?: string;
  essenceType?: string;
  name: string;
  email: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthPlaceId?: string;
  promoCode?: string;
  notes?: string;
}

export const useMobileDrawerForm = () => {
  const [currentStep, setCurrentStep] = useState<DrawerStep>(1);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<DrawerFormData>({
    resolver: zodResolver(reportSchema),
    mode: 'onBlur',
    defaultValues: {
      reportCategory: undefined,
      reportType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      promoCode: '',
      notes: '',
    },
  });

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as DrawerStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
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

  const mapCategoryToReportType = (category: string) => {
    switch (category) {
      case 'professional':
        return 'essence';
      case 'relational':
        return 'sync';
      case 'personal':
        return 'essence';
      default:
        return 'essence';
    }
  };

  const mapCategoryToSubType = (category: string) => {
    switch (category) {
      case 'professional':
        return { essenceType: 'professional' };
      case 'relational':
        return { relationshipType: 'personal' };
      case 'personal':
        return { essenceType: 'personal' };
      default:
        return { essenceType: 'personal' };
    }
  };

  return {
    form,
    currentStep,
    isOpen,
    nextStep,
    prevStep,
    openDrawer,
    closeDrawer,
    mapCategoryToReportType,
    mapCategoryToSubType,
  };
};
