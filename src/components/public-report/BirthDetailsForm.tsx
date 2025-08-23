
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PerformanceBasedPlaceAutocomplete } from '@/components/shared/forms/place-input/PerformanceBasedPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';

interface BirthDetailsFormProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
}

const BirthDetailsForm = ({ register, setValue, watch, errors }: BirthDetailsFormProps) => {
  const [hasInteracted, setHasInteracted] = useState({
    birthDate: false,
    birthTime: false,
    birthLocation: false,
  });

  const birthLocation = watch('birthLocation') || '';

  const handlePlaceSelect = (placeData: PlaceData) => {
    setValue('birthLocation', placeData.name);
    setHasInteracted(prev => ({ ...prev, birthLocation: true }));
    
    if (placeData.latitude && placeData.longitude) {
      setValue('birthLatitude', placeData.latitude);
      setValue('birthLongitude', placeData.longitude);
    }
    
    if (placeData.placeId) {
      setValue('birthPlaceId', placeData.placeId);
    }
  };

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (fieldName: keyof typeof hasInteracted, error: any) => {
    return hasInteracted[fieldName] && error;
  };

  return (
    <FormStep stepNumber={3} title="Your Birth Details" className="bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Birth Date *</Label>
            <Input
              id="birthDate"
              type="date"
              {...register('birthDate')}
              className="h-12"
              onFocus={() => handleFieldInteraction('birthDate')}
              onBlur={() => handleFieldInteraction('birthDate')}
            />
            {shouldShowError('birthDate', errors.birthDate) && (
              <p className="text-sm text-destructive">{errors.birthDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthTime">Birth Time *</Label>
            <Input
              id="birthTime"
              type="time"
              {...register('birthTime')}
              step="60"
              className="h-12"
              onFocus={() => handleFieldInteraction('birthTime')}
              onBlur={() => handleFieldInteraction('birthTime')}
            />
            {shouldShowError('birthTime', errors.birthTime) && (
              <p className="text-sm text-destructive">{errors.birthTime.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <PerformanceBasedPlaceAutocomplete
            label="Birth Location *"
            value={birthLocation}
            onChange={(value) => {
              setValue('birthLocation', value);
              if (!hasInteracted.birthLocation && value) {
                handleFieldInteraction('birthLocation');
              }
            }}
            onPlaceSelect={handlePlaceSelect}
            onNameEntry={(name) => {
              // This will trigger performance test on name entry
              console.log('[BirthDetailsForm] Name entered:', name);
            }}
            placeholder="Enter birth city, state, country"
            id="birthLocation"
            error={shouldShowError('birthLocation', errors.birthLocation) ? errors.birthLocation?.message : undefined}
          />
        </div>
      </div>
    </FormStep>
  );
};

export default BirthDetailsForm;
