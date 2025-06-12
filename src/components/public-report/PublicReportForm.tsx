
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ReportType } from '@/pages/PublicReport';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';

const baseFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  birthDate: z.string().min(1, 'Birth date is required'),
  birthTime: z.string().optional(),
  birthLocation: z.string().min(1, 'Birth location is required'),
});

const compatibilityFormSchema = baseFormSchema.extend({
  partnerName: z.string().min(2, 'Partner name must be at least 2 characters'),
  partnerBirthDate: z.string().min(1, 'Partner birth date is required'),
  partnerBirthTime: z.string().optional(),
  partnerBirthLocation: z.string().min(1, 'Partner birth location is required'),
});

type BaseFormData = z.infer<typeof baseFormSchema>;
type CompatibilityFormData = z.infer<typeof compatibilityFormSchema>;

interface PublicReportFormProps {
  reportType: ReportType;
  onSubmit: (data: any) => void;
}

export const PublicReportForm: React.FC<PublicReportFormProps> = ({
  reportType,
  onSubmit
}) => {
  const [userPlaceData, setUserPlaceData] = useState<PlaceData | null>(null);
  const [partnerPlaceData, setPartnerPlaceData] = useState<PlaceData | null>(null);
  
  const isCompatibility = reportType.tier === 'compatibility';
  const schema = isCompatibility ? compatibilityFormSchema : baseFormSchema;
  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompatibilityFormData>({
    resolver: zodResolver(schema),
  });

  const handleUserPlaceSelect = (placeData: PlaceData) => {
    setUserPlaceData(placeData);
    setValue('birthLocation', placeData.name);
  };

  const handlePartnerPlaceSelect = (placeData: PlaceData) => {
    setPartnerPlaceData(placeData);
    setValue('partnerBirthLocation', placeData.name);
  };

  const onFormSubmit = (data: CompatibilityFormData) => {
    const submitData = {
      ...data,
      latitude: userPlaceData?.latitude,
      longitude: userPlaceData?.longitude,
      partnerLatitude: partnerPlaceData?.latitude,
      partnerLongitude: partnerPlaceData?.longitude,
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Birth Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Birth Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Birth Date *</Label>
            <Input
              id="birthDate"
              type="date"
              {...register('birthDate')}
            />
            {errors.birthDate && (
              <p className="text-sm text-destructive">{errors.birthDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthTime">Birth Time</Label>
            <Input
              id="birthTime"
              type="time"
              {...register('birthTime')}
              step="60"
            />
            <p className="text-xs text-gray-500">
              Optional, but recommended for more accurate readings
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Controller
            name="birthLocation"
            control={control}
            render={({ field }) => (
              <PlaceAutocomplete
                label="Birth Location *"
                value={field.value || ''}
                onChange={field.onChange}
                onPlaceSelect={handleUserPlaceSelect}
                placeholder="Enter birth city, state, country"
                id="birthLocation"
                error={errors.birthLocation?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Partner Information for Compatibility Reports */}
      {isCompatibility && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Partner's Birth Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partnerName">Partner's Name *</Label>
                <Input
                  id="partnerName"
                  {...register('partnerName')}
                  placeholder="Enter partner's name"
                />
                {errors.partnerName && (
                  <p className="text-sm text-destructive">{errors.partnerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="partnerBirthDate">Partner's Birth Date *</Label>
                <Input
                  id="partnerBirthDate"
                  type="date"
                  {...register('partnerBirthDate')}
                />
                {errors.partnerBirthDate && (
                  <p className="text-sm text-destructive">{errors.partnerBirthDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partnerBirthTime">Partner's Birth Time</Label>
                <Input
                  id="partnerBirthTime"
                  type="time"
                  {...register('partnerBirthTime')}
                  step="60"
                />
              </div>

              <div className="space-y-2">
                <Controller
                  name="partnerBirthLocation"
                  control={control}
                  render={({ field }) => (
                    <PlaceAutocomplete
                      label="Partner's Birth Location *"
                      value={field.value || ''}
                      onChange={field.onChange}
                      onPlaceSelect={handlePartnerPlaceSelect}
                      placeholder="Enter partner's birth city"
                      id="partnerBirthLocation"
                      error={errors.partnerBirthLocation?.message}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Submit Button */}
      <div className="pt-4">
        <Button 
          type="submit" 
          size="lg" 
          className="w-full md:w-auto md:min-w-[200px]"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : `Continue to Payment`}
        </Button>
      </div>
    </form>
  );
};
