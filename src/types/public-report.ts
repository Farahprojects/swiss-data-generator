
import { z } from 'zod';

export interface PlaceData {
  name: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

export interface PromoCodeValidation {
  isValid: boolean;
  discountPercent: number;
  message: string;
  isFree: boolean;
}

export interface ReportFormData {
  reportType?: string;
  relationshipType?: string;
  essenceType?: string;
  // Mobile-specific fields
  reportCategory?: string;
  reportSubCategory?: string;
  astroDataType?: string;
  astroDataOnly?: boolean;
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
  returnYear?: string;
  notes?: string;
  promoCode?: string;
}

export interface ReportTypeOption {
  value: string;
  label: string;
}

export interface FormStepProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
  className?: string;
  'data-step'?: string;
}
