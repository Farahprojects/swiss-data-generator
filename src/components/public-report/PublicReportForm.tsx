
import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import useIsDesktop from '@/hooks/useIsDesktop';
import CustomDateInput from './custom-inputs/CustomDateInput';
import CustomTimeInput from './custom-inputs/CustomTimeInput';

interface PublicReportFormProps {
  form: UseFormReturn<any>;
  reportType: string;
}

const PublicReportForm = ({ form, reportType }: PublicReportFormProps) => {
  const { register, setValue, formState: { errors }, watch, control } = form;
  const isDesktop = useIsDesktop();
  
  const request = watch('request');
  const isCompatibilityReport = reportType === 'compatibility' || reportType === 'sync' || request === 'sync';

  const handlePlaceSelect = (placeData: PlaceData, fieldPrefix = '') => {
    const locationField = fieldPrefix ? `${fieldPrefix}Location` : 'birthLocation';
    setValue(locationField, placeData.name);
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message as string}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="your@email.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message as string}</p>
          )}
        </div>
      </div>

      {/* Primary Person Birth Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isCompatibilityReport ? 'Your Birth Details' : 'Birth Details'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date *</Label>
              {isDesktop ? (
                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field }) => <CustomDateInput {...field} />}
                />
              ) : (
                <Input
                  id="birthDate"
                  type="date"
                  {...register('birthDate')}
                />
              )}
              {errors.birthDate && (
                <p className="text-sm text-destructive">{errors.birthDate.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthTime">Birth Time *</Label>
              {isDesktop ? (
                <Controller
                  name="birthTime"
                  control={control}
                  render={({ field }) => <CustomTimeInput {...field} />}
                />
              ) : (
                <Input
                  id="birthTime"
                  type="time"
                  {...register('birthTime')}
                  step="60"
                />
              )}
              {errors.birthTime && (
                <p className="text-sm text-destructive">{errors.birthTime.message as string}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <CleanPlaceAutocomplete
              label="Birth Location *"
              value={watch('birthLocation') || ''}
              onChange={(value) => setValue('birthLocation', value)}
              onPlaceSelect={(placeData) => handlePlaceSelect(placeData)}
              placeholder="Enter birth city, state, country"
              id="birthLocation"
              error={errors.birthLocation?.message as string}
            />
          </div>
        </CardContent>
      </Card>

      {/* Second Person Birth Details (for compatibility reports) */}
      {isCompatibilityReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Partner's Birth Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name2">Partner's Full Name *</Label>
              <Input
                id="name2"
                {...register('name2')}
                placeholder="Enter partner's full name"
              />
              {errors.name2 && (
                <p className="text-sm text-destructive">{errors.name2.message as string}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate2">Partner's Birth Date *</Label>
                <Input
                  id="birthDate2"
                  type="date"
                  {...register('birthDate2')}
                />
                {errors.birthDate2 && (
                  <p className="text-sm text-destructive">{errors.birthDate2.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthTime2">Partner's Birth Time *</Label>
                <Input
                  id="birthTime2"
                  type="time"
                  {...register('birthTime2')}
                  step="60"
                />
                {errors.birthTime2 && (
                  <p className="text-sm text-destructive">{errors.birthTime2.message as string}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <CleanPlaceAutocomplete
                label="Partner's Birth Location *"
                value={watch('birthLocation2') || ''}
                onChange={(value) => setValue('birthLocation2', value)}
                onPlaceSelect={(placeData) => handlePlaceSelect(placeData, 'birth2')}
                placeholder="Enter partner's birth city, state, country"
                id="birthLocation2"
                error={errors.birthLocation2?.message as string}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PublicReportForm;
