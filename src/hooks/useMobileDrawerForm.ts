
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';

export type DrawerStep = 1 | 2 | 3 | 4;

export interface DrawerFormData {
  reportCategory: 'the-self' | 'compatibility' | 'snapshot';
  reportSubCategory: string;
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
  secondPersonName?: string;
  secondPersonBirthDate?: string;
  secondPersonBirthTime?: string;
  secondPersonBirthLocation?: string;
  secondPersonLatitude?: number;
  secondPersonLongitude?: number;
  secondPersonPlaceId?: string;
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
      reportSubCategory: '',
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

  const mapCategoryToReportType = (category: string, subCategory: string) => {
    switch (category) {
      case 'the-self':
        return 'essence';
      case 'compatibility':
        return 'sync';
      case 'snapshot':
        switch (subCategory) {
          case 'focus':
            return 'focus';
          case 'monthly':
            return 'monthly';
          case 'mindset':
            return 'mindset';
          default:
            return 'focus';
        }
      default:
        return 'essence';
    }
  };

  const mapCategoryToSubType = (category: string, subCategory: string) => {
    switch (category) {
      case 'the-self':
        return { essenceType: subCategory };
      case 'compatibility':
        return { relationshipType: subCategory };
      case 'snapshot':
        return {}; // Snapshot reports don't need sub-types
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
