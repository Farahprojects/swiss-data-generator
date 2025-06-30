
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { usePromoValidation } from '@/hooks/usePromoValidation';

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

// Proper promo validation state interface to match desktop
interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
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

  // Use the updated promo validation hook without arguments
  const { promoValidation, isValidatingPromo } = usePromoValidation();

  // Convert to the state format expected by useReportSubmission
  const promoValidationState: PromoValidationState = {
    status: promoValidation?.isValid 
      ? (promoValidation.isFree ? 'valid-free' : 'valid-discount')
      : (promoValidation ? 'invalid' : 'none'),
    message: promoValidation?.message || '',
    discountPercent: promoValidation?.discountPercent || 0
  };

  const setPromoValidation = (state: PromoValidationState) => {
    // This will be handled by the hook automatically
  };

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
    promoValidation: promoValidationState,
    isValidatingPromo,
    setPromoValidation,
  };
};
