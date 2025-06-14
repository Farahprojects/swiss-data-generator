
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Star, Clock, Shield, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import ReportGuideModal from '@/components/public-report/ReportGuideModal';
import { getProductByName } from '@/utils/stripe-products';
import { guestCheckoutWithAmount } from '@/utils/guest-checkout';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type'),
  relationshipType: z.string().optional(),
  essenceType: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  birthDate: z.string().min(1, 'Birth date is required'),
  birthTime: z.string().min(1, 'Birth time is required'),
  birthLocation: z.string().min(1, 'Birth location is required'),
  birthLatitude: z.number().optional(),
  birthLongitude: z.number().optional(),
  birthPlaceId: z.string().optional(),
  // For compatibility/sync reports
  secondPersonName: z.string().optional(),
  secondPersonBirthDate: z.string().optional(),
  secondPersonBirthTime: z.string().optional(),
  secondPersonBirthLocation: z.string().optional(),
  secondPersonLatitude: z.number().optional(),
  secondPersonLongitude: z.number().optional(),
  secondPersonPlaceId: z.string().optional(),
  // For return reports
  returnYear: z.string().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
}).refine((data) => {
  // If reportType is essence, essenceType is required
  if (data.reportType === 'essence' && (!data.essenceType || data.essenceType === '')) {
    return false;
  }
  return true;
}, {
  message: "Please select an essence focus type",
  path: ["essenceType"]
}).refine((data) => {
  // If reportType is sync, relationshipType is required
  if (data.reportType === 'sync' && (!data.relationshipType || data.relationshipType === '')) {
    return false;
  }
  return true;
}, {
  message: "Please select a relationship type",
  path: ["relationshipType"]
}).refine((data) => {
  // If sync report, second person details are required
  if (data.reportType === 'sync') {
    if (!data.secondPersonName || data.secondPersonName.trim() === '') {
      return false;
    }
    if (!data.secondPersonBirthDate || data.secondPersonBirthDate === '') {
      return false;
    }
    if (!data.secondPersonBirthTime || data.secondPersonBirthTime === '') {
      return false;
    }
    if (!data.secondPersonBirthLocation || data.secondPersonBirthLocation.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: "All second person details are required for sync reports",
  path: ["secondPersonName"]
});

type ReportFormData = z.infer<typeof reportSchema>;

const reportTypes = [
  { value: 'sync', label: 'Sync Report' },
  { value: 'essence', label: 'Essence Report' },
  { value: 'flow', label: 'Flow Report' },
  { value: 'mindset', label: 'Mindset Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'focus', label: 'Focus Report' },
];

const relationshipTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
];

const essenceTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
  { value: 'relational', label: 'Relational' },
];

const PublicReport = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [showReportGuide, setShowReportGuide] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: '',
      relationshipType: '',
      essenceType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      birthLatitude: undefined,
      birthLongitude: undefined,
      birthPlaceId: '',
      secondPersonName: '',
      secondPersonBirthDate: '',
      secondPersonBirthTime: '',
      secondPersonBirthLocation: '',
      secondPersonLatitude: undefined,
      secondPersonLongitude: undefined,
      secondPersonPlaceId: '',
      returnYear: '',
      notes: '',
      promoCode: '',
    },
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = form;
  const selectedReportType = watch('reportType');

  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';
  const requiresRelationshipType = requiresSecondPerson;
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';

  const handlePlaceSelect = (placeData: PlaceData, fieldPrefix = '') => {
    const locationField = fieldPrefix ? `${fieldPrefix}Location` : 'birthLocation';
    const latitudeField = fieldPrefix ? `${fieldPrefix}Latitude` : 'birthLatitude';
    const longitudeField = fieldPrefix ? `${fieldPrefix}Longitude` : 'birthLongitude';
    const placeIdField = fieldPrefix ? `${fieldPrefix}PlaceId` : 'birthPlaceId';
    
    setValue(locationField as keyof ReportFormData, placeData.name);
    
    if (placeData.latitude && placeData.longitude) {
      setValue(latitudeField as keyof ReportFormData, placeData.latitude);
      setValue(longitudeField as keyof ReportFormData, placeData.longitude);
      console.log(`📍 Coordinates saved: ${placeData.latitude}, ${placeData.longitude}`);
    }
    
    if (placeData.placeId) {
      setValue(placeIdField as keyof ReportFormData, placeData.placeId);
    }
  };

  // Function to build the complete report type
  const buildCompleteReportType = (data: ReportFormData) => {
    console.log('Building report type with data:', {
      reportType: data.reportType,
      essenceType: data.essenceType,
      relationshipType: data.relationshipType
    });
    
    if (data.reportType === 'essence' && data.essenceType) {
      const completeType = `essence_${data.essenceType}`;
      console.log('Built complete essence type:', completeType);
      return completeType;
    }
    if (data.reportType === 'sync' && data.relationshipType) {
      const completeType = `sync_${data.relationshipType}`;
      console.log('Built complete sync type:', completeType);
      return completeType;
    }
    // For other report types that don't have subtypes
    console.log('Using base report type:', data.reportType);
    return data.reportType;
  };

  // Report pricing configuration - database lookup only
  const getReportPriceAndDescription = async (reportType: string, relationshipType?: string, essenceType?: string) => {
    const baseDescriptions = {
      'sync': 'Sync Compatibility Report',
      'essence': 'Personal Essence Report',
      'flow': 'Life Flow Analysis Report',
      'mindset': 'Mindset Transformation Report',
      'monthly': 'Monthly Astrology Forecast',
      'focus': 'Life Focus Guidance Report',
    };

    let description = baseDescriptions[reportType as keyof typeof baseDescriptions] || 'Astrology Report';
    
    // Add specific details to description
    if (relationshipType) {
      description += ` (${relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1)} Focus)`;
    }
    if (essenceType) {
      description += ` - ${essenceType.charAt(0).toUpperCase() + essenceType.slice(1)} Analysis`;
    }

    // Map report types to product names in the database
    const reportTypeToProductName = {
      'sync': 'Sync',
      'essence': 'Essence',
      'flow': 'Flow',
      'mindset': 'Mindset',
      'monthly': 'Monthly',
      'focus': 'Focus',
    };

    const productName = reportTypeToProductName[reportType as keyof typeof reportTypeToProductName];
    
    if (!productName) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    const product = await getProductByName(productName);
    if (!product) {
      throw new Error(`Product not found in database: ${productName}`);
    }

    return { 
      amount: product.amount_usd, 
      description: product.description || description 
    };
  };

  const onSubmit = async (data: ReportFormData) => {
    setIsProcessing(true);
    setIsPricingLoading(true);
    
    try {
      console.log('Form submission data:', data);
      
      // Build the complete report type
      const completeReportType = buildCompleteReportType(data);
      console.log('Complete report type for submission:', completeReportType);
      
      const { amount, description } = await getReportPriceAndDescription(
        data.reportType, 
        data.relationshipType, 
        data.essenceType
      );
      
      setIsPricingLoading(false);

      // Prepare report data for storage in payment metadata
      const reportData = {
        reportType: completeReportType, // Use the complete report type here
        relationshipType: data.relationshipType,
        essenceType: data.essenceType,
        name: data.name,
        email: data.email,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthLocation: data.birthLocation,
        birthLatitude: data.birthLatitude,
        birthLongitude: data.birthLongitude,
        birthPlaceId: data.birthPlaceId,
        secondPersonName: data.secondPersonName,
        secondPersonBirthDate: data.secondPersonBirthDate,
        secondPersonBirthTime: data.secondPersonBirthTime,
        secondPersonBirthLocation: data.secondPersonBirthLocation,
        secondPersonLatitude: data.secondPersonLatitude,
        secondPersonLongitude: data.secondPersonLongitude,
        secondPersonPlaceId: data.secondPersonPlaceId,
        returnYear: data.returnYear,
        notes: data.notes,
        promoCode: data.promoCode,
      };
      
      console.log('Report data being sent to checkout:', reportData);
      
      const result = await guestCheckoutWithAmount(data.email, amount, description, reportData);
      
      if (!result.success) {
        toast({
          title: "Payment Error",
          description: result.error || "Failed to initiate checkout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing report:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsPricingLoading(false);
    }
  };

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Get Your Professional
            <span className="text-primary"> Astrology Report</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Unlock deep insights about your personality, relationships, and life path with our AI-powered astrology reports. Generated instantly and delivered to your email.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Instant Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>Professional Quality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            {/* Step 1: Report Type Selection */}
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setShowReportGuide(true)}
                className="text-foreground hover:text-primary font-bold underline"
              >
                Not sure which report to choose? Click here.
              </button>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">1</div>
                  <h2 className="text-2xl font-semibold">Choose Your Report Type</h2>
                </div>
                
                <div className="pl-1 md:pl-8 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportType">Report Type *</Label>
                    <Controller
                      control={control}
                      name="reportType"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a report type" />
                          </SelectTrigger>
                          <SelectContent>
                            {reportTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.reportType && (
                      <p className="text-sm text-destructive">{errors.reportType.message}</p>
                    )}
                  </div>

                  {/* Conditional Fields for Report Options */}
                  {requiresEssenceType && (
                    <div className="space-y-2">
                      <Label htmlFor="essenceType">Essence Focus *</Label>
                      <Controller
                        control={control}
                        name="essenceType"
                        render={({ field }) => (
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="justify-start flex-wrap gap-1 md:gap-2"
                          >
                            {essenceTypes.map((type) => (
                              <ToggleGroupItem 
                                key={type.value} 
                                value={type.value}
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 text-xs md:text-sm px-2 md:px-4 py-2"
                              >
                                {type.label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        )}
                      />
                      {errors.essenceType && (
                        <p className="text-sm text-destructive">{errors.essenceType.message}</p>
                      )}
                    </div>
                  )}

                  {requiresReturnYear && (
                    <div className="space-y-2">
                      <Label htmlFor="returnYear">Return Year *</Label>
                      <Input
                        {...register('returnYear')}
                        type="number"
                        placeholder={getCurrentYear().toString()}
                        min="1900"
                        max="2100"
                      />
                    </div>
                  )}

                  {requiresRelationshipType && (
                    <div className="space-y-2">
                      <Label htmlFor="relationshipType">Relationship Type *</Label>
                      <Controller
                        control={control}
                        name="relationshipType"
                        render={({ field }) => (
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={field.onChange}
                            className="justify-start flex-wrap gap-1 md:gap-2"
                          >
                            {relationshipTypes.map((type) => (
                              <ToggleGroupItem 
                                key={type.value} 
                                value={type.value}
                                className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 text-xs md:text-sm px-2 md:px-4 py-2"
                              >
                                {type.label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        )}
                      />
                      {errors.relationshipType && (
                        <p className="text-sm text-destructive">{errors.relationshipType.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Contact Information */}
            {selectedReportType && (
              <>
                <div className="border-t pt-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">2</div>
                      <h2 className="text-2xl font-semibold">Contact Information</h2>
                    </div>
                    
                    <div className="pl-1 md:pl-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            {...register('name')}
                            placeholder="Enter your full name"
                            className="h-12"
                          />
                          {errors.name && (
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
                          />
                          {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Birth Details */}
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
                          onChange={(value) => setValue('birthLocation', value)}
                          onPlaceSelect={(placeData) => handlePlaceSelect(placeData)}
                          placeholder="Enter birth city, state, country"
                          id="birthLocation"
                          error={errors.birthLocation?.message}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Second Person Details (for compatibility/sync reports) */}
            {requiresSecondPerson && (
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
                        onChange={(value) => setValue('secondPersonBirthLocation', value)}
                        onPlaceSelect={(placeData) => handlePlaceSelect(placeData, 'secondPerson')}
                        placeholder="Enter birth city, state, country"
                        id="secondPersonBirthLocation"
                        error={errors.secondPersonBirthLocation?.message}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Report Button and Promo Code Section */}
            {selectedReportType && (
              <div className="border-t pt-8 flex flex-col items-center space-y-4">
                <Button 
                  type="submit"
                  size="lg" 
                  className="px-12 py-6 text-lg"
                  disabled={isProcessing || isPricingLoading}
                >
                  {isProcessing || isPricingLoading ? 'Processing...' : 'Generate My Report'}
                </Button>
                
                {/* Promo Code Section */}
                <div className="w-full max-w-md">
                  <button
                    type="button"
                    onClick={() => setShowPromoCode(!showPromoCode)}
                    className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-base font-bold text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    <span>Have a promo code?</span>
                    <div className="flex items-center gap-1">
                      <span className="underline">Enter it here</span>
                      {showPromoCode ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showPromoCode ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="space-y-2">
                      <Input
                        {...register('promoCode')}
                        placeholder="Enter promo code"
                        className="text-center px-12 py-6 text-lg"
                      />
                      {watch('promoCode') && (
                        <p className="text-xs text-center text-muted-foreground">
                          Promo code will be applied at checkout
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Reports?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Accuracy</h3>
              <p className="text-muted-foreground">Advanced algorithms ensure precise calculations and personalized insights.</p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Instant Delivery</h3>
              <p className="text-muted-foreground">Get your comprehensive report delivered to your email within minutes.</p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Professional Quality</h3>
              <p className="text-muted-foreground">Detailed, professional-grade reports trusted by astrology enthusiasts.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Guide Modal */}
      <ReportGuideModal 
        isOpen={showReportGuide} 
        onClose={() => setShowReportGuide(false)} 
      />
    </div>
  );
};

export default PublicReport;
