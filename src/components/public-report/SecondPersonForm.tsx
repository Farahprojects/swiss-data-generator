
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PerformanceBasedPlaceAutocomplete } from '@/components/shared/forms/place-input/PerformanceBasedPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from '@/types/public-report';
import { useFieldFocusHandler } from '@/hooks/useFieldFocusHandler';
import FormStep from './FormStep';

interface SecondPersonFormProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onPlaceSelected?: () => void;
}

const SecondPersonForm = ({ register, setValue, watch, errors, onPlaceSelected }: SecondPersonFormProps) => {
  const { scrollTo } = useFieldFocusHandler();
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false,
  });

  const secondPersonName = watch('secondPersonName') || '';
  const secondPersonBirthDate = watch('secondPersonBirthDate') || '';
  const secondPersonBirthTime = watch('secondPersonBirthTime') || '';
  const secondPersonBirthLocation = watch('secondPersonBirthLocation') || '';

  const handlePlaceSelect = (placeData: PlaceData) => {
    // Use the full formatted address (which is now in placeData.name) or fallback to address field
    const fullLocation = placeData.address || placeData.name;
    
    setValue('secondPersonBirthLocation', fullLocation);
    setHasInteracted(prev => ({ ...prev, birthLocation: true }));
    
    if (placeData.latitude && placeData.longitude) {
      setValue('secondPersonLatitude', placeData.latitude);
      setValue('secondPersonLongitude', placeData.longitude);
    }
    
    if (placeData.placeId) {
      setValue('secondPersonPlaceId', placeData.placeId);
    }
    
    // Trigger auto-scroll callback
    onPlaceSelected?.();
  };

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (fieldName: keyof typeof hasInteracted, error: any) => {
    return hasInteracted[fieldName] && error;
  };


  

  return (
    <FormStep stepNumber={4} title="Second Person Details" className="bg-muted/20">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <Label htmlFor="secondPersonName">Name *</Label>
          <Input
            id="secondPersonName"
            {...register('secondPersonName')}
            placeholder="Enter second person's name"
            className="h-12"
            // Removed auto-scroll behavior
            // onFocus={(e) => scrollTo(e.target)}
            onBlur={(e) => {
              handleFieldInteraction('name');
            }}
          />
          {shouldShowError('name', errors.secondPersonName) && (
            <p className="text-sm text-destructive">{errors.secondPersonName.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="secondPersonBirthDate">Birth Date *</Label>
            <Input
              id="secondPersonBirthDate"
              type="date"
              {...register('secondPersonBirthDate')}
              className="h-12"
              min="1900-01-01"
              max="2024-12-31"
              onFocus={() => handleFieldInteraction('birthDate')}
              onBlur={() => handleFieldInteraction('birthDate')}
            />
            {shouldShowError('birthDate', errors.secondPersonBirthDate) && (
              <p className="text-sm text-destructive">{errors.secondPersonBirthDate.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secondPersonBirthTime">Birth Time *</Label>
            <Input
              id="secondPersonBirthTime"
              type="time"
              {...register('secondPersonBirthTime')}
              step="60"
              className="h-12"
              onFocus={() => handleFieldInteraction('birthTime')}
              onBlur={() => handleFieldInteraction('birthTime')}
            />
            {shouldShowError('birthTime', errors.secondPersonBirthTime) && (
              <p className="text-sm text-destructive">{errors.secondPersonBirthTime.message}</p>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <PerformanceBasedPlaceAutocomplete
            label="Birth Location *"
            value={secondPersonBirthLocation}
            onChange={(value) => {
              setValue('secondPersonBirthLocation', value);
              if (!hasInteracted.birthLocation && value) {
                handleFieldInteraction('birthLocation');
              }
            }}
            onPlaceSelect={handlePlaceSelect}
            onNameEntry={(name) => {
              // This will trigger performance test on name entry
              console.log('[SecondPersonForm] Name entered:', name);
            }}
            placeholder="Enter birth city, state, country"
            id="secondPersonBirthLocation"
            error={shouldShowError('birthLocation', errors.secondPersonBirthLocation) ? errors.secondPersonBirthLocation?.message : undefined}
          />
        </div>
      </div>
    </FormStep>
  );
};

export default SecondPersonForm;
