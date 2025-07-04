
import React, { useState } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, Tag, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReportFormData } from '@/types/public-report';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { PromoConfirmationDialog } from '@/components/public-report/PromoConfirmationDialog';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
  errorType?: string;
}

interface Step3PaymentProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onPrev: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
  promoValidation: PromoValidationState;
  isValidatingPromo: boolean;
  showPromoConfirmation?: boolean;
  pendingSubmissionData?: { basePrice: number } | null;
  onPromoConfirmationTryAgain?: () => void;
  onPromoConfirmationContinue?: () => void;
}

const Step3Payment = ({ 
  register, 
  watch, 
  errors, 
  onPrev, 
  onSubmit,
  isProcessing,
  promoValidation,
  isValidatingPromo,
  showPromoConfirmation = false,
  pendingSubmissionData = null,
  onPromoConfirmationTryAgain = () => {},
  onPromoConfirmationContinue = () => {}
}: Step3PaymentProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const { validatePromoManually } = usePromoValidation();
  
  // SSR-safe pricing hook initialization
  const { getReportPrice, getReportTitle, calculatePricing, isLoading: isPricingLoading, error: pricingError } = typeof window !== 'undefined' ? usePriceFetch() : {
    getReportPrice: () => { throw new Error('Pricing not available during SSR'); },
    getReportTitle: () => 'Report',
    calculatePricing: () => ({ basePrice: 0, discount: 0, discountPercent: 0, finalPrice: 0, isFree: false }),
    isLoading: false,
    error: 'Pricing service unavailable during SSR'
  };
  
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const astroDataType = watch('astroDataType');
  const request = watch('request'); // NEW: Watch the request field
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  // Get price and title using context
  let basePrice: number | null = null;
  let reportTitle = 'Personal Report';
  let priceError: string | null = null;

  try {
    // FIXED: Check for both reportType OR request field
    if (reportType || request) {
      const formData = {
        reportType,
        essenceType,
        relationshipType,
        reportCategory,
        reportSubCategory,
        astroDataType,
        request // NEW: Include request field
      };
      
      console.log('💰 Step3Payment - Price calculation with form data:', formData);
      
      basePrice = getReportPrice(formData);
      reportTitle = getReportTitle(formData);
      
      console.log('💰 Step3Payment - Calculated price:', basePrice, 'Title:', reportTitle);
    }
  } catch (error) {
    priceError = error instanceof Error ? error.message : 'Failed to get price';
    console.error('❌ Step3Payment - Price fetch error:', error);
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

    console.log('🟢 Attempting submission...');

    try {
      // First validate promo code if present
      if (promoCode && promoCode.trim() !== '') {
        const validation = await validatePromoManually(promoCode);
        
        // Give user time to see the validation result
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Then proceed with form submission via parent
      await onSubmit();
      console.log('✅ onSubmit completed');
    } catch (err) {
      console.error('❌ onSubmit failed:', err);
      // Optional: send this to your Supabase log table
    }
  };

  // Render content based on state - no early returns that bypass hooks
  let content;

  if (isPricingLoading) {
    content = (
      <div className="space-y-6 flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pricing...</span>
        </div>
      </div>
    );
  } else if (priceError) {
    content = (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            className="p-2"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Pricing Error</h2>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 mb-2">Unable to load pricing information</p>
          <p className="text-sm text-red-600">{priceError}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  } else if (!pricing) {
    content = (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            className="p-2"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Pricing Unavailable</h2>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-yellow-700">No pricing available for this report configuration</p>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen bg-white">
        <div className="space-y-12">
          {/* Header */}
          <div className="flex items-center justify-center relative px-6 py-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              className="absolute left-6 p-2 hover:bg-gray-50"
              type="button"
              style={{ 
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
                Review & <em className="italic font-light">Payment</em>
              </h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed">
                Almost there, {name}!
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="px-6">
            <div className="bg-gray-50/50 rounded-xl p-8 space-y-6">
              <h2 className="text-2xl font-light text-gray-900 tracking-tight">
                Order Summary
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-light text-gray-700">{reportTitle}</span>
                  <span className="text-lg font-light text-gray-900">
                    ${pricing.basePrice.toFixed(2)}
                  </span>
                </div>
                
                {pricing.discount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-lg font-light">Discount ({pricing.discountPercent}%)</span>
                    <span className="text-lg font-light">-${pricing.discount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <hr className="border-gray-200" />
              
              <div className="flex justify-between items-center">
                <span className="text-2xl font-light text-gray-900">Total</span>
                <span className={`text-2xl font-light ${pricing.isFree ? 'text-green-600' : 'text-gray-900'}`}>
                  {pricing.isFree ? 'FREE' : `$${pricing.finalPrice.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Promo Code Section */}
          <div className="px-6">
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
                    <Label htmlFor="promoCode" className="text-lg font-light text-gray-700">
                      Promo Code
                    </Label>
                    <div className="relative">
                      <Input
                        id="promoCode"
                        {...register('promoCode')}
                        placeholder="Enter promo code"
                        className="h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 pr-12"
                        style={{ 
                          WebkitAppearance: 'none',
                          touchAction: 'manipulation'
                        }}
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        {getPromoValidationIcon()}
                      </div>
                    </div>
                    {errors.promoCode && (
                      <p className="text-sm text-red-500 font-light">{errors.promoCode.message}</p>
                    )}
                  </div>
                  
                  {/* Promo validation feedback */}
                  {promoValidation.message && (
                    <div className={`text-sm font-light p-4 rounded-xl ${
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
          </div>

          {/* Payment Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6 pb-12"
          >
            <button
              onClick={handleButtonClick}
              disabled={isProcessing || isValidatingPromo || isPricingLoading}
              className="w-full bg-gray-900 text-white px-12 py-4 rounded-xl text-lg font-light hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none disabled:shadow-lg"
              type="button"
              style={{ 
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none',
                userSelect: 'none'
              }}
            >
              {isProcessing 
                ? 'Processing...' 
                : isValidatingPromo
                ? 'Validating...'
                : isPricingLoading
                ? 'Loading...'
                : 'Get My Insights'
              }
            </button>
            
            <p className="text-sm text-gray-500 text-center mt-4 font-light leading-relaxed">
              Your report will be delivered to your email within minutes. 
              {!pricing.isFree && ' Secure payment processed by Stripe.'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
        style={{ touchAction: 'pan-y' }}
      >
        {content}
      </motion.div>

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

export default Step3Payment;
