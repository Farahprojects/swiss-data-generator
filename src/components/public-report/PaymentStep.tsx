

import React, { useState } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Tag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFormData } from '@/types/public-report';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { getReportTitle, usePricing } from '@/services/pricing';
import FormStep from './FormStep';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

interface PaymentStepProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onSubmit: () => void;
  isProcessing: boolean;
  promoValidation: PromoValidationState;
  isValidatingPromo: boolean;
}

const PaymentStep = ({ 
  register, 
  watch, 
  errors, 
  onSubmit,
  isProcessing,
  promoValidation,
  isValidatingPromo
}: PaymentStepProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const { validatePromoManually } = usePromoValidation();
  const { calculatePricing } = usePricing();
  
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  // Fetch price from database
  const { price: basePrice, isLoading: isPriceLoading, error: priceError } = usePriceFetch({
    reportType,
    essenceType,
    relationshipType,
    reportCategory,
    reportSubCategory
  });

  const reportTitle = getReportTitle({
    reportType,
    essenceType,
    relationshipType,
    reportCategory,
    reportSubCategory
  });

  const pricing = calculatePricing(basePrice || 15.00, promoValidation);

  const getPromoValidationIcon = () => {
    if (isValidatingPromo) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
    if (promoValidation.status === 'valid-free' || promoValidation.status === 'valid-discount') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (promoCode && promoValidation.status === 'invalid') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getPromoValidationMessage = () => {
    if (isValidatingPromo) {
      return 'Validating promo code...';
    }
    return promoValidation.message || '';
  };

  const handleButtonClick = async (e: React.MouseEvent) => {
    console.log('🖱️ Generate My Report button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    
    console.log('💰 Starting validation and payment flow');
    
    // First validate promo code if present
    if (promoCode && promoCode.trim() !== '') {
      console.log('🎫 Validating promo code:', promoCode);
      const validation = await validatePromoManually(promoCode);
      console.log('✅ Promo validation result:', validation);
      
      // Give user time to see the validation result
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Then proceed with form submission via parent
    onSubmit();
  };

  // Show loading state while fetching price
  if (isPriceLoading) {
    return (
      <FormStep stepNumber={3} title="Payment" className="bg-background">
        <div className="max-w-4xl mx-auto flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading pricing information...</span>
          </div>
        </div>
      </FormStep>
    );
  }

  // Show error state if price fetch failed
  if (priceError) {
    console.error('Price fetch error:', priceError);
  }

  return (
    <FormStep stepNumber={3} title="Payment" className="bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Main Layout - Order Summary and Payment Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Order Summary & Benefits */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{reportTitle}</span>
                  <span className="font-medium">
                    {isPriceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `$${pricing.basePrice.toFixed(2)}`
                    )}
                  </span>
                </div>
                
                {pricing.discount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>Discount ({pricing.discountPercent}%)</span>
                    <span>-${pricing.discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>Total</span>
                    <span className={pricing.isFree ? 'text-green-600' : 'text-primary'}>
                      {pricing.isFree ? 'FREE' : `$${pricing.finalPrice.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* What You Get - Now naturally placed after pricing */}
              <div className="space-y-3 border-t pt-6">
                <h4 className="font-medium text-gray-900">What You'll Receive:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Instant email delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Downloadable PDF for your records</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Professional astrology insights</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>Personalized recommendations</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Payment Actions (Fixed Position) */}
          <div className="max-w-sm w-full">
            <div className="bg-muted/30 rounded-2xl p-6 shadow-sm border border-muted space-y-4">
              <Button
                onClick={handleButtonClick}
                disabled={isProcessing || isValidatingPromo || isPriceLoading}
                className="w-full h-14 text-base py-3 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white"
                type="button"
              >
                {isProcessing 
                  ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  )
                  : isValidatingPromo
                  ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Validating...
                    </div>
                  )
                  : isPriceLoading
                  ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </div>
                  )
                  : 'Generate My Report'
                }
              </Button>

              {/* Guarantee */}
              <div className="pt-4 border-t border-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <h4 className="font-medium text-sm">100% Satisfaction Guarantee</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  You're covered by our 100% Satisfaction Guarantee. Not happy with your report? We'll refund you within 7 days — no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Independent Promo Code Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Collapsible open={showPromoCode} onOpenChange={setShowPromoCode}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-center border-2 border-primary text-primary bg-transparent hover:bg-primary/5"
                  type="button"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Have a promo code?
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="promoCode" className="font-medium">Promo Code</Label>
                    <div className="relative">
                      <Input
                        id="promoCode"
                        {...register('promoCode')}
                        placeholder="Enter promo code"
                        className="h-12 pr-10"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getPromoValidationIcon()}
                      </div>
                    </div>
                    {errors.promoCode && (
                      <p className="text-sm text-red-500">{errors.promoCode.message}</p>
                    )}
                  </div>
                  
                  {/* Promo validation feedback */}
                  {promoValidation.message && (
                    <div className={`text-sm p-3 rounded-lg ${
                      isValidatingPromo 
                        ? 'bg-gray-50 text-gray-600'
                        : (promoValidation.status === 'valid-free' || promoValidation.status === 'valid-discount')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {getPromoValidationMessage()}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Trust & Security Messages - Fixed at bottom */}
        <div className="text-center text-sm text-muted-foreground space-y-1 pt-6 border-t border-muted/50">
          <p>Your payment is secure and encrypted.</p>
          <p>Secure checkout powered by Stripe</p>
          <p>Your report will be delivered to your email within minutes</p>
        </div>
      </div>
    </FormStep>
  );
};

export default PaymentStep;

