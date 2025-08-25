
import React, { useState } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { InlineDateTimeSelector } from '@/components/ui/mobile-pickers';

interface PublicReportFormProps {
  form: UseFormReturn<any>;
  reportType: string;
}

const PublicReportForm = ({ form, reportType }: PublicReportFormProps) => {
  const { register, setValue, formState: { errors }, watch, control } = form;
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [date2PickerOpen, setDate2PickerOpen] = useState(false);
  const [time2PickerOpen, setTime2PickerOpen] = useState(false);
  
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
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => (
                  <InlineDateTimeSelector
                    type="date"
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Select birth date"
                    hasError={!!errors.birthDate}
                    isOpen={datePickerOpen}
                    onOpen={() => setDatePickerOpen(true)}
                    onConfirm={() => setDatePickerOpen(false)}
                    onCancel={() => setDatePickerOpen(false)}
                  />
                )}
              />
              {errors.birthDate && (
                <p className="text-sm text-destructive">{errors.birthDate.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthTime">Birth Time *</Label>
              <Controller
                name="birthTime"
                control={control}
                render={({ field }) => (
                  <InlineDateTimeSelector
                    type="time"
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Select birth time"
                    hasError={!!errors.birthTime}
                    isOpen={timePickerOpen}
                    onOpen={() => setTimePickerOpen(true)}
                    onConfirm={() => setTimePickerOpen(false)}
                    onCancel={() => setTimePickerOpen(false)}
                  />
                )}
              />
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
                <Controller
                  name="birthDate2"
                  control={control}
                  render={({ field }) => (
                    <InlineDateTimeSelector
                      type="date"
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select partner's birth date"
                      hasError={!!errors.birthDate2}
                      isOpen={date2PickerOpen}
                      onOpen={() => setDate2PickerOpen(true)}
                      onConfirm={() => setDate2PickerOpen(false)}
                      onCancel={() => setDate2PickerOpen(false)}
                    />
                  )}
                />
                {errors.birthDate2 && (
                  <p className="text-sm text-destructive">{errors.birthDate2.message as string}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthTime2">Partner's Birth Time *</Label>
                <Controller
                  name="birthTime2"
                  control={control}
                  render={({ field }) => (
                    <InlineDateTimeSelector
                      type="time"
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Select partner's birth time"
                      hasError={!!errors.birthTime2}
                      isOpen={time2PickerOpen}
                      onOpen={() => setTime2PickerOpen(true)}
                      onConfirm={() => setTime2PickerOpen(false)}
                      onCancel={() => setTime2PickerOpen(false)}
                    />
                  )}
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
