
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, Users } from 'lucide-react';
import { ReportType } from '@/pages/PublicReport';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  birthDate: z.string().min(1, 'Birth date is required'),
  birthTime: z.string().optional(),
  birthLocation: z.string().min(1, 'Birth location is required'),
  reportType: z.enum(['natal', 'compatibility']),
  partnerName: z.string().optional(),
  partnerBirthDate: z.string().optional(),
  partnerBirthTime: z.string().optional(),
  partnerBirthLocation: z.string().optional(),
}).refine((data) => {
  if (data.reportType === 'compatibility') {
    return data.partnerName && data.partnerBirthDate && data.partnerBirthLocation;
  }
  return true;
}, {
  message: "Partner details are required for compatibility reports",
});

type FormData = z.infer<typeof formSchema>;

interface PublicReportFormProps {
  reportTypes: ReportType[];
  onSubmit: (data: any) => void;
}

export const PublicReportForm: React.FC<PublicReportFormProps> = ({
  reportTypes,
  onSubmit
}) => {
  const [userPlaceData, setUserPlaceData] = useState<PlaceData | null>(null);
  const [partnerPlaceData, setPartnerPlaceData] = useState<PlaceData | null>(null);
  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportType: 'natal',
    },
  });

  const selectedReportType = watch('reportType');
  const isCompatibility = selectedReportType === 'compatibility';

  const handleUserPlaceSelect = (placeData: PlaceData) => {
    setUserPlaceData(placeData);
    setValue('birthLocation', placeData.name);
  };

  const handlePartnerPlaceSelect = (placeData: PlaceData) => {
    setPartnerPlaceData(placeData);
    setValue('partnerBirthLocation', placeData.name);
  };

  const onFormSubmit = (data: FormData) => {
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
      {/* Report Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your Report Type</h3>
        
        <Controller
          name="reportType"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="natal" id="natal" className="peer sr-only" />
                <Label
                  htmlFor="natal"
                  className="flex flex-col items-center space-y-2 border-2 border-gray-200 rounded-lg p-4 cursor-pointer transition-all peer-checked:border-primary peer-checked:bg-primary/5"
                >
                  <Star className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Personal Natal Report</span>
                  <span className="text-sm text-gray-600 text-center">
                    Birth chart analysis with planetary positions and life insights
                  </span>
                </Label>
              </div>
              
              <div className="relative">
                <RadioGroupItem value="compatibility" id="compatibility" className="peer sr-only" />
                <Label
                  htmlFor="compatibility"
                  className="flex flex-col items-center space-y-2 border-2 border-gray-200 rounded-lg p-4 cursor-pointer transition-all peer-checked:border-primary peer-checked:bg-primary/5"
                >
                  <Users className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Compatibility Report</span>
                  <span className="text-sm text-gray-600 text-center">
                    Relationship analysis for you and your partner
                  </span>
                </Label>
              </div>
            </RadioGroup>
          )}
        />
      </div>

      <Separator />

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

      {/* Order Summary & Payment */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">
              {isCompatibility ? 'Compatibility Report' : 'Personal Natal Report'}
            </span>
            <span className="font-semibold">$29.00</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Processing Fee:</span>
            <span>$0.00</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-semibold text-lg">
            <span>Total:</span>
            <span className="text-primary">$29.00</span>
          </div>
          
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Delivered in 5-10 minutes</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Star className="w-4 h-4 text-green-600" />
              <span>Professional quality report</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="pt-4">
        <Button 
          type="submit" 
          size="lg" 
          className="w-full text-lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Pay $29 & Get My Report'}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Secure payment processing • Your report will be emailed to you
        </p>
      </div>
    </form>
  );
};
