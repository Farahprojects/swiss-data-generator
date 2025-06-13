
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from './types';

interface BirthDetailsStepProps {
  form: UseFormReturn<ReportFormData>;
  onPlaceSelect: (placeData: PlaceData, fieldPrefix?: string) => void;
}

const BirthDetailsStep = ({ form, onPlaceSelect }: BirthDetailsStepProps) => {
  const { register, watch, formState: { errors } } = form;

  return (
    <div className="border-t pt-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">3</div>
          <h2 className="text-2xl font-semibold">Your Birth Details</h2>
        </div>
        
        <div className="pl-1 md:pl-8 space-y-6 birth-details-container" data-testid="birth-details">
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date *</Label>
              <Input
                id="birthDate"
                type="date"
                {...register('birthDate')}
                className="h-12"
              />
              {errors.birthDate && (
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
              />
              {errors.birthTime && (
                <p className="text-sm text-destructive">{errors.birthTime.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <PlaceAutocomplete
              label="Birth Location *"
              value={watch('birthLocation') || ''}
              onChange={(value) => form.setValue('birthLocation', value)}
              onPlaceSelect={(placeData) => onPlaceSelect(placeData)}
              placeholder="Enter birth city, state, country"
              id="birthLocation"
              error={errors.birthLocation?.message}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BirthDetailsStep;
