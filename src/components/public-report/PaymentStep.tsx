import React, { useState, useEffect } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Tag, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFormData } from '@/types/public-report';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePricing } from '@/contexts/PricingContext';
import FormStep from './FormStep';
import { PreparingSpaceModal } from '@/components/ui/PreparingSpaceModal';

interface PaymentStepProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  onSubmit: () => void;
  onSubmitWithTrustedPricing?: (trustedPricing: TrustedPricingObject) => void;
  isProcessing: boolean;
}

interface TrustedPricingObject {
  valid: boolean;
  promo_code_id?: string;
  discount_usd: number;
  trusted_base_price_usd: number;
  final_price_usd: number;
  report_type: string;
  reason?: string;
}

const PaymentStep = ({ 
  register, 
  watch, 
  errors, 
  setValue,
  onSubmit,
  onSubmitWithTrustedPricing,
  isProcessing
}: PaymentStepProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [promoError, setPromoError] = useState<string>('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [trustedPricing, setTrustedPricing] = useState<TrustedPricingObject | null>(null);
  const [showPreparingModal, setShowPreparingModal] = useState(false);
  
  const { toast } = useToast();
  const { getPriceById, isLoading: pricesLoading } = usePricing();
  
  // Get base price from cached data
  const getBasePrice = () => {
    const priceIdentifier = getPriceIdentifier();
    if (!priceIdentifier) return 0;
    
    const priceData = getPriceById(priceIdentifier);
    return priceData ? Number(priceData.unit_price_usd) : 0;
  };
  
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

  // Get price identifier from form data
  const getPriceIdentifier = () => {
    // Prioritize direct reportType for unified mobile/desktop behavior
    if (reportType) {
      return reportType;
    }
    
    // Fallback to request field for astro data
    if (requestField) {
      return requestField;
    }
    
    // Legacy fallback for form combinations (desktop compatibility)
    if (essenceType && reportCategory === 'the-self') {
      return `essence_${essenceType}`;
    }
    
    if (relationshipType && reportCategory === 'compatibility') {
      return `sync_${relationshipType}`;
    }
    
    return '';
  };

  // Validate promo code and get trusted pricing using cached data
  const validatePromoCode = async (promoCode: string): Promise<TrustedPricingObject> => {
    setIsValidatingPromo(true);
    setPromoError('');

    try {
      const id = getPriceIdentifier();
      
      if (!id) {
        return { valid: false, discount_usd: 0, trusted_base_price_usd: 0, final_price_usd: 0, report_type: '', reason: 'Invalid report type' };
      }

      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode, basePrice: getBasePrice(), reportType: id }
      });

      if (error) {
        return { valid: false, discount_usd: 0, trusted_base_price_usd: getBasePrice(), final_price_usd: getBasePrice(), report_type: id, reason: 'Failed to validate promo code' };
      }

      // Use the base price from cache, but apply promo discount from validation
      const promoResult = data as TrustedPricingObject;
      
      return {
        ...promoResult,
        trusted_base_price_usd: getBasePrice(), // Use cached price
        final_price_usd: promoResult.valid ? promoResult.final_price_usd : getBasePrice(),
      };

    } catch (error) {
      console.error('❌ Promo validation exception:', error);
      throw new Error('Failed to validate pricing');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show preparing modal immediately
    setShowPreparingModal(true);
    
    setHasTimedOut(false);
    setPromoError('');
    setTrustedPricing(null);
    
    const currentPromoCode = promoCode.trim();
    let pricingResult: TrustedPricingObject;

    try {
      // Only validate promo code if one is provided
      if (currentPromoCode) {
        pricingResult = await validatePromoCode(currentPromoCode);
        
        if (!pricingResult.valid) {
          setPromoError(pricingResult.reason || 'Invalid Promo Code');
          return;
        }
      } else {
        // No promo code provided - use base pricing
        const priceIdentifier = getPriceIdentifier();
        if (!priceIdentifier) {
          setPromoError('Invalid report type');
          return;
        }
        
        pricingResult = {
          valid: true,
          discount_usd: 0,
          trusted_base_price_usd: getBasePrice(),
          final_price_usd: getBasePrice(),
          report_type: priceIdentifier,
          reason: undefined
        };
      }

      setTrustedPricing(pricingResult);

      // Use the new onSubmitWithTrustedPricing if available, otherwise fallback to onSubmit
      if (onSubmitWithTrustedPricing) {
        onSubmitWithTrustedPricing(pricingResult);
      } else {
        onSubmit();
      }

    } catch (error) {
      setPromoError('Failed to validate pricing. Please try again.');
    }
  };

  const content = (
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
                  <span className="text-gray-600 font-light">
                    {reportType || request || 'Personal Report'}
                  </span>
                  <span className="font-normal text-gray-900">
                    ${pricesLoading ? '...' : (trustedPricing?.trusted_base_price_usd || getBasePrice()).toFixed(2)}
                  </span>
                </div>
                {trustedPricing?.discount_usd > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-light">Promo discount</span>
                    <span className="text-green-600 font-light">
                      -${trustedPricing.discount_usd.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center font-light text-xl text-gray-900">
                    <span>Total</span>
                    <span>${pricesLoading ? '...' : (trustedPricing?.final_price_usd || getBasePrice()).toFixed(2)}</span>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Payment Form */}
        <div className="flex-1 min-w-[280px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light text-gray-900 tracking-tight">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Promo Code Section */}
              <div className="space-y-4">
                <Collapsible open={showPromoCode} onOpenChange={setShowPromoCode}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between text-left font-normal"
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Have a promo code?
                      </span>
                      <svg
                        className={`h-4 w-4 transition-transform ${showPromoCode ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="promoCode" className="text-sm font-medium text-gray-700">
                        Promo Code
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="promoCode"
                          {...register('promoCode')}
                          placeholder="Enter promo code"
                          className="flex-1"
                          disabled={isValidatingPromo}
                        />
                        {isValidatingPromo && (
                          <div className="flex items-center justify-center w-10">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </div>
                      {promoError && (
                        <p className="text-sm text-red-600">{promoError}</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleButtonClick}
                disabled={isProcessing || isValidatingPromo}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-light py-3 px-6 rounded-xl"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  "Get Your Report"
                )}
              </Button>

              {hasTimedOut && (
                <div className="text-center">
                  <p className="text-sm text-amber-600">
                    The request is taking longer than expected. You can safely try again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <FormStep stepNumber={3} title="Payment">
        {content}
      </FormStep>
      <PreparingSpaceModal isOpen={showPreparingModal} />
    </>
  );
};

export default PaymentStep;
