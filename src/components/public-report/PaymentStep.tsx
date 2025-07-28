import React, { useState, useEffect } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Tag, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useToast } from '@/hooks/use-toast';
import FormStep from './FormStep';

interface PaymentStepProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  onSubmit: () => void;
  onSubmitWithPrice?: (price: number) => void;
  isProcessing: boolean;
  inlinePromoError?: string;
  clearInlinePromoError?: () => void;
}

const PaymentStep = ({ 
  register, 
  watch, 
  errors, 
  setValue,
  onSubmit,
  onSubmitWithPrice,
  isProcessing,
  inlinePromoError = '',
  clearInlinePromoError = () => {}
}: PaymentStepProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  const { getReportPrice, getReportTitle, isLoading: isPricingLoading, error: pricingError } = usePriceFetch();
  const { toast } = useToast();
  
  // Add timeout mechanism to prevent stuck processing state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isProcessing) {
      setHasTimedOut(false);
      timeoutId = setTimeout(() => {
        console.warn('Processing timeout - this may indicate a server issue');
        setHasTimedOut(true);
        toast({
          title: "Request Timeout",
          description: "The request took too long. Please try again.",
          variant: "destructive",
        });
      }, 15000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isProcessing, toast]);
  
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const requestField = watch('request');
  const request = watch('request');
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  // Get price and title using context with global fallback
  let basePrice: number | null = null;
  let reportTitle = 'Personal Report';

  try {
    if (reportType || request) {
      const formData = {
        reportType,
        essenceType,
        relationshipType,
        reportCategory,
        reportSubCategory,
        request: requestField
      };
      
      basePrice = getReportPrice(formData);
      reportTitle = getReportTitle(formData);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Pricing error (silenced for clean UI):', error);
    }
  }

  // Simple pricing calculation without complex promo validation
  const finalPrice = basePrice || 0;

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setHasTimedOut(false);
    
    // Use the new onSubmitWithPrice if available, otherwise fallback to onSubmit
    if (onSubmitWithPrice) {
      onSubmitWithPrice(finalPrice);
    } else {
      onSubmit();
    }
  };

  const content = isPricingLoading ? (
    <div className="max-w-4xl mx-auto flex items-center justify-center py-8">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading pricing information...</span>
      </div>
    </div>
  ) : (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap lg:flex-nowrap gap-8 w-full">
        {/* Left side - Order Summary */}
        <div className="flex-1 min-w-[280px]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-900 tracking-tight">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-light">{reportTitle}</span>
                  <span className="font-normal text-gray-900">${finalPrice.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-light text-xl text-gray-900">
                    <span>Total</span>
                    <span>${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* What You'll Receive Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-light text-gray-900 tracking-tight">What You'll Receive:</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-light">Instant email delivery</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-light">Downloadable PDF for your records</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-light">Professional astrology insights</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-light">Personalized recommendations</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Payment Form */}
        <div className="flex-1 min-w-[280px] flex flex-col gap-4 justify-start">
          <Collapsible open={showPromoCode} onOpenChange={setShowPromoCode}>
            <CollapsibleTrigger asChild>
              <button
                className="w-full bg-gray-100 text-gray-700 px-8 py-4 rounded-xl text-lg font-light hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                type="button"
                style={{ 
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitAppearance: 'none'
                }}
              >
                <Tag className="h-5 w-5 mr-3" />
                Have a promo code?
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="promoCode" className="text-lg font-light text-gray-700">
                      Promo Code
                    </Label>
                    {inlinePromoError && (
                      <p className="text-sm text-red-500 font-light">{inlinePromoError}</p>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="promoCode"
                      {...register('promoCode', {
                        onChange: () => {
                          if (inlinePromoError) {
                            clearInlinePromoError();
                          }
                        }
                      })}
                      placeholder="Enter promo code"
                      className="h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400"
                      style={{ 
                        WebkitAppearance: 'none',
                        touchAction: 'manipulation'
                      }}
                    />
                  </div>
                  {errors.promoCode && (
                    <p className="text-sm text-red-500 font-light">{errors.promoCode.message}</p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            onClick={handleButtonClick}
            disabled={isProcessing}
            className="w-full h-14 text-lg font-light bg-gray-900 hover:bg-gray-800 text-white transition-colors"
            type="button"
          >
            {isProcessing 
              ? 'Processing...' 
              : hasTimedOut
                ? 'Try Again'
                : 'Submit and View'}
          </Button>

          {/* Satisfaction Guarantee */}
          <div className="bg-muted/30 rounded-lg p-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-light text-gray-900 tracking-tight">100% Satisfaction Guarantee</h3>
            </div>
            <p className="text-sm text-gray-600 font-light leading-relaxed">
              You're covered by our 100% Satisfaction Guarantee. Not happy with your report? We'll refund you within 7 days — no questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* Security Info - Centered below the section */}
      <div className="text-center space-y-2 text-sm text-gray-500 font-light mt-8">
        <p>Your payment is secure and encrypted.</p>
        <p>Secure checkout powered by Stripe</p>
        <p>Your report will be delivered to your email within minutes</p>
      </div>
    </div>
  );

  return (
    <FormStep stepNumber={3} title="Payment" className="bg-background">
      {content}
    </FormStep>
  );
};

export default PaymentStep;
