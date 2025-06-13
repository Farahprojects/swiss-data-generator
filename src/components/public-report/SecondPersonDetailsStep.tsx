
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from './types';

interface SecondPersonDetailsStepProps {
  form: UseFormReturn<ReportFormData>;
  onPlaceSelect: (placeData: PlaceData, fieldPrefix?: string) => void;
}

const SecondPersonDetailsStep = ({ form, onPlaceSelect }: SecondPersonDetailsStepProps) => {
  const { register, watch, formState: { errors } } = form;

  return (
    <div className="border-t pt-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">4</div>
          <h2 className="text-2xl font-semibold">Second Person Details</h2>
        </div>
        
        <div className="pl-1 md:pl-8 space-y-6">
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
          <div className="grid grid-cols-2 gap-2 md:gap-4">
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
              onChange={(value) => form.setValue('secondPersonBirthLocation', value)}
              onPlaceSelect={(placeData) => onPlaceSelect(placeData, 'secondPerson')}
              placeholder="Enter birth city, state, country"
              id="secondPersonBirthLocation"
              error={errors.secondPersonBirthLocation?.message}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondPersonDetailsStep;
