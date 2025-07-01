
import React, { useState, useEffect } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';

interface BirthDetailsStepProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onNext: () => void;
}

const BirthDetailsStep = ({ register, setValue, watch, errors, onNext }: BirthDetailsStepProps) => {
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    email: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false,
    secondPersonName: false,
    secondPersonBirthDate: false,
    secondPersonBirthTime: false,
    secondPersonBirthLocation: false,
  });

  const reportType = watch('reportType');
  const reportCategory = watch('reportCategory');
  const name = watch('name');
  const email = watch('email');
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');
  const birthLocation = watch('birthLocation');
  const secondPersonName = watch('secondPersonName');
  const secondPersonBirthDate = watch('secondPersonBirthDate');
  const secondPersonBirthTime = watch('secondPersonBirthTime');
  const secondPersonBirthLocation = watch('secondPersonBirthLocation');

  const showSecondPersonFields = reportType === 'sync' || reportCategory === 'compatibility';

  const isFirstPersonComplete = name && email && birthDate && birthTime && birthLocation;
  const isSecondPersonComplete = !showSecondPersonFields || (secondPersonName && secondPersonBirthDate && secondPersonBirthTime && secondPersonBirthLocation);
  const canProceed = isFirstPersonComplete && isSecondPersonComplete;

  // Auto-advance to next step when form is complete
  useEffect(() => {
    if (canProceed) {
      console.log('🎯 Birth details complete, auto-advancing to payment step');
      setTimeout(() => {
        onNext();
      }, 500);
    }
  }, [canProceed, onNext]);

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

  const handleSecondPersonPlaceSelect = (placeData: PlaceData) => {
    setValue('secondPersonBirthLocation', placeData.name);
    setHasInteracted(prev => ({ ...prev, secondPersonBirthLocation: true }));
    
    if (placeData.latitude && placeData.longitude) {
      setValue('secondPersonLatitude', placeData.latitude);
      setValue('secondPersonLongitude', placeData.longitude);
    }
    
    if (placeData.placeId) {
      setValue('secondPersonPlaceId', placeData.placeId);
    }
  };

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (fieldName: keyof typeof hasInteracted, error: any) => {
    return hasInteracted[fieldName] && error;
  };

  return (
    <FormStep stepNumber={2} title="Your Details" className="bg-muted/20" data-step="2">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Birth Details */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Your Birth Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
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
            <PlaceAutocomplete
              label="Birth Location *"
              value={birthLocation || ''}
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

        {/* Second Person Details - Show for compatibility reports */}
        {showSecondPersonFields && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Partner's Birth Details</h3>
            <div className="space-y-2 mb-4">
              <Label htmlFor="secondPersonName">Partner's Name *</Label>
              <Input
                id="secondPersonName"
                {...register('secondPersonName')}
                placeholder="Enter partner's name"
                className="h-12"
                onFocus={() => handleFieldInteraction('secondPersonName')}
                onBlur={() => handleFieldInteraction('secondPersonName')}
              />
              {shouldShowError('secondPersonName', errors.secondPersonName) && (
                <p className="text-sm text-destructive">{errors.secondPersonName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="secondPersonBirthDate">Birth Date *</Label>
                <Input
                  id="secondPersonBirthDate"
                  type="date"
                  {...register('secondPersonBirthDate')}
                  className="h-12"
                  onFocus={() => handleFieldInteraction('secondPersonBirthDate')}
                  onBlur={() => handleFieldInteraction('secondPersonBirthDate')}
                />
                {shouldShowError('secondPersonBirthDate', errors.secondPersonBirthDate) && (
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
                  onFocus={() => handleFieldInteraction('secondPersonBirthTime')}
                  onBlur={() => handleFieldInteraction('secondPersonBirthTime')}
                />
                {shouldShowError('secondPersonBirthTime', errors.secondPersonBirthTime) && (
                  <p className="text-sm text-destructive">{errors.secondPersonBirthTime.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <PlaceAutocomplete
                label="Birth Location *"
                value={secondPersonBirthLocation || ''}
                onChange={(value) => {
                  setValue('secondPersonBirthLocation', value);
                  if (!hasInteracted.secondPersonBirthLocation && value) {
                    handleFieldInteraction('secondPersonBirthLocation');
                  }
                }}
                onPlaceSelect={handleSecondPersonPlaceSelect}
                placeholder="Enter birth city, state, country"
                id="secondPersonBirthLocation"
                error={shouldShowError('secondPersonBirthLocation', errors.secondPersonBirthLocation) ? errors.secondPersonBirthLocation?.message : undefined}
              />
            </div>
          </div>
        )}

        {/* Manual Continue Button (backup in case auto-advance doesn't work) */}
        {canProceed && (
          <div className="text-center">
            <Button onClick={onNext} size="lg" className="px-8">
              Continue to Payment
            </Button>
          </div>
        )}
      </div>
    </FormStep>
  );
};

export default BirthDetailsStep;
