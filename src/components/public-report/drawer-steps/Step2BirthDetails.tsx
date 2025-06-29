
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';

interface Step2BirthDetailsProps {
  register: UseFormRegister<DrawerFormData>;
  setValue: UseFormSetValue<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const Step2BirthDetails = ({ register, setValue, watch, errors, onNext, onPrev }: Step2BirthDetailsProps) => {
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    email: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false,
  });

  const birthLocation = watch('birthLocation') || '';
  const name = watch('name');
  const email = watch('email');
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');

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

  const isFormValid = name && email && birthDate && birthTime && birthLocation;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Your Birth Details</h2>
          <p className="text-gray-600">We need these to create your personalized report</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
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
              <p className="text-sm text-red-500">{errors.name?.message}</p>
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
              <p className="text-sm text-red-500">{errors.email?.message}</p>
            )}
          </div>
        </div>

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
              <p className="text-sm text-red-500">{errors.birthDate?.message}</p>
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
              <p className="text-sm text-red-500">{errors.birthTime?.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <PlaceAutocomplete
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

      {isFormValid && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={onNext}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            Next: Review & Pay
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step2BirthDetails;
