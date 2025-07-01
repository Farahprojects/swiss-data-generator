
import React, { useState } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Tag, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFormData } from '@/types/public-report';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { PromoConfirmationDialog } from '@/components/public-report/PromoConfirmationDialog';
import FormStep from './FormStep';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
  errorType?: string;
}

interface PaymentStepProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onSubmit: () => void;
  isProcessing: boolean;
  promoValidation: PromoValidationState;
  isValidatingPromo: boolean;
  showPromoConfirmation?: boolean;
  pendingSubmissionData?: { basePrice: number } | null;
  onPromoConfirmationTryAgain?: () => void;
  onPromoConfirmationContinue?: () => void;
}

const PaymentStep = ({ 
  register, 
  watch, 
  errors, 
  onSubmit,
  isProcessing,
  promoValidation,
  isValidatingPromo,
  showPromoConfirmation = false,
  pendingSubmissionData = null,
  onPromoConfirmationTryAgain = () => {},
  onPromoConfirmationContinue = () => {}
}: PaymentStepProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const { validatePromoManually } = usePromoValidation();
  const { getReportPrice, getReportTitle, calculatePricing, isLoading: isPricingLoading, error: pricingError } = usePriceFetch();
  
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  // Get price and title using context
  let basePrice: number | null = null;
  let reportTitle = 'Personal Report';
  let priceError: string | null = null;

  try {
    if (reportType) {
      basePrice = getReportPrice({
        reportType,
        essenceType,
        relationshipType,
        reportCategory,
        reportSubCategory
      });
      
      reportTitle = getReportTitle({
        reportType,
        essenceType,
        relationshipType,
        reportCategory,
        reportSubCategory
      });
    }
  } catch (error) {
    priceError = error instanceof Error ? error.message : 'Failed to get price';
    console.error('Price fetch error:', error);
  }

  // Only calculate pricing if we have a valid base price
  const pricing = basePrice !== null ? calculatePricing(basePrice, promoValidation) : null;

  

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
    e.preventDefault();
    e.stopPropagation();
    
    // First validate promo code if present
    if (promoCode && promoCode.trim() !== '') {
      const validation = await validatePromoManually(promoCode);
      
      // Give user time to see the validation result
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Then proceed with form submission via parent
    onSubmit();
  };

  // Show loading state while fetching price
  if (isPricingLoading) {
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
    console.error('💥 Price fetch error:', priceError);
    return (
      <FormStep stepNumber={3} title="Payment" className="bg-background">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Pricing Error
              </h3>
              <p className="text-red-600 mb-4">
                Unable to load pricing information for this report type.
              </p>
              <p className="text-sm text-red-500">
                Error: {priceError}
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </FormStep>
    );
  }

  // Show error if no pricing data available
  if (!pricing) {
    return (
      <FormStep stepNumber={3} title="Payment" className="bg-background">
        <div className="max-w-4xl mx-auto">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                No Pricing Available
              </h3>
              <p className="text-yellow-600">
                Pricing information is not available for this report configuration.
              </p>
            </CardContent>
          </Card>
        </div>
      </FormStep>
    );
  }

  return (
    <>
      <FormStep stepNumber={3} title="Payment" className="bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      ${pricing.basePrice.toFixed(2)}
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

            {/* Right Column - Actions */}
            <div className="max-w-sm w-full space-y-6">
              {/* Promo Code Section - Fixed Height Container */}
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full h-12 justify-center border-2 border-primary text-primary bg-transparent hover:bg-primary/5"
                  type="button"
                  onClick={() => setShowPromoCode(!showPromoCode)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Have a promo code?
                </Button>
                
                {/* Fixed height container to prevent layout shifts */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showPromoCode ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}>
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
                </div>
              </div>

              {/* Payment Section - Fixed Position */}
              <div className="bg-muted/30 rounded-2xl p-6 shadow-sm border border-muted space-y-4">
                <Button
                  onClick={handleButtonClick}
                  disabled={isProcessing || isValidatingPromo}
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
                    Not happy with your report? We'll refund you within 7 days — no questions asked.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust & Security Messages - Centered at bottom - Fixed Position */}
          <div className="text-center text-sm text-muted-foreground space-y-1 mt-8 pt-6 border-t border-muted/50">
            <p>Your payment is secure and encrypted.</p>
            <p>Secure checkout powered by Stripe</p>
            <p>Your report will be delivered to your email within minutes</p>
          </div>
        </div>
      </FormStep>

      {/* Promo Confirmation Dialog */}
      <PromoConfirmationDialog
        isOpen={showPromoConfirmation}
        onClose={onPromoConfirmationTryAgain}
        onTryAgain={onPromoConfirmationTryAgain}
        onContinueWithFullPayment={onPromoConfirmationContinue}
        errorMessage={promoValidation.message}
        errorType={promoValidation.errorType || 'invalid'}
        fullPrice={pendingSubmissionData?.basePrice || basePrice || 0}
      />
    </>
  );
};

export default PaymentStep;
