
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';

interface CombinedPersonalDetailsFormProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onPlaceSelected?: () => void;
}

const CombinedPersonalDetailsForm = ({ register, setValue, watch, errors, onPlaceSelected }: CombinedPersonalDetailsFormProps) => {
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    email: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false
  });

  // Watch all form values for smart validation
  const name = watch('name') || '';
  const email = watch('email') || '';
  const birthDate = watch('birthDate') || '';
  const birthTime = watch('birthTime') || '';
  const birthLocation = watch('birthLocation') || '';


  const handlePlaceSelect = (placeData: PlaceData) => {
    // Use the full formatted address (which is now in placeData.name) or fallback to address field
    const fullLocation = placeData.address || placeData.name;
    
    setValue('birthLocation', fullLocation);
    setHasInteracted(prev => ({ ...prev, birthLocation: true }));
    
    if (placeData.latitude && placeData.longitude) {
      setValue('birthLatitude', placeData.latitude);
      setValue('birthLongitude', placeData.longitude);
    }
    
    if (placeData.placeId) {
      setValue('birthPlaceId', placeData.placeId);
    }
    
    // Call the auto-scroll callback for desktop only
    if (onPlaceSelected) {
      onPlaceSelected();
    }
  };

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (fieldName: keyof typeof hasInteracted, error: any) => {
    return hasInteracted[fieldName] && error;
  };


  return (
    <FormStep stepNumber={2} title="Personal & Birth Details" className="bg-muted/20" data-step="2">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Contact Information Section */}
        <div className="space-y-4">
                          <h3 className="text-xl font-light text-gray-900">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter your full name"
                className="h-12"
                onFocus={() => handleFieldInteraction('name')}
                onBlur={() => handleFieldInteraction('name')}
              />
              {shouldShowError('name', errors.name) && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                className="h-12"
                onFocus={() => handleFieldInteraction('email')}
                onBlur={() => handleFieldInteraction('email')}
              />
              {shouldShowError('email', errors.email) && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Birth Details Section */}
        <div className="space-y-4">
                          <h3 className="text-xl font-light text-gray-900">Birth Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date *</Label>
              <Input
                id="birthDate"
                type="date"
                {...register('birthDate')}
                className="h-12"
                min="1900-01-01"
                max="2024-12-31"
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
              <CleanPlaceAutocomplete
                label="Birth Location *"
                value={birthLocation}
                onChange={(value) => {
                  setValue('birthLocation', value);
                  if (!hasInteracted.birthLocation && value) {
                    handleFieldInteraction('birthLocation');
                  }
                }}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Enter birth city, state, country"
                id="birthLocation"
                error={shouldShowError('birthLocation', errors.birthLocation) ? errors.birthLocation?.message : undefined}
              />
          </div>
        </div>
      </div>
    </FormStep>
  );
};

export default CombinedPersonalDetailsForm;
