
import React from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';

interface SecondPersonFormProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
}

const SecondPersonForm = ({ register, setValue, watch, errors }: SecondPersonFormProps) => {
  const handlePlaceSelect = (placeData: PlaceData) => {
    setValue('secondPersonBirthLocation', placeData.name);
    
    if (placeData.latitude && placeData.longitude) {
      setValue('secondPersonLatitude', placeData.latitude);
      setValue('secondPersonLongitude', placeData.longitude);
      console.log(`📍 Second person coordinates saved: ${placeData.latitude}, ${placeData.longitude}`);
    }
    
    if (placeData.placeId) {
      setValue('secondPersonPlaceId', placeData.placeId);
    }
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
          />
          {errors.secondPersonName && (
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
            />
            {errors.secondPersonBirthDate && (
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
            />
            {errors.secondPersonBirthTime && (
              <p className="text-sm text-destructive">{errors.secondPersonBirthTime.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <PlaceAutocomplete
            label="Birth Location *"
            value={watch('secondPersonBirthLocation') || ''}
            onChange={(value) => setValue('secondPersonBirthLocation', value)}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Enter birth city, state, country"
            id="secondPersonBirthLocation"
            error={errors.secondPersonBirthLocation?.message}
          />
        </div>
      </div>
    </FormStep>
  );
};

export default SecondPersonForm;
