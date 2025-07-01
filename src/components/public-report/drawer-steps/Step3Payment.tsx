
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
import { getReportTitle, usePricing } from '@/services/pricing';
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

  // Show loading state
  if (isPriceLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 flex items-center justify-center py-8"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pricing...</span>
        </div>
      </motion.div>
    );
  }

  // Show error state
  if (priceError) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
        style={{ touchAction: 'pan-y' }}
      >
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
      </motion.div>
    );
  }

  // Show error if no pricing available
  if (!pricing) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
        style={{ touchAction: 'pan-y' }}
      >
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
      </motion.div>
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
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            className="p-2"
            type="button"
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Review & Payment</h2>
            <p className="text-gray-600">Almost there, {name}!</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          
          <div className="space-y-2">
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
          </div>
          
          <hr className="border-gray-200" />
          
          <div className="flex justify-between items-center font-semibold text-lg">
            <span>Total</span>
            <span className={pricing.isFree ? 'text-green-600' : 'text-gray-900'}>
              {pricing.isFree ? 'FREE' : `$${pricing.finalPrice.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Promo Code Section */}
        <Collapsible open={showPromoCode} onOpenChange={setShowPromoCode}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 justify-start border-2 border-primary text-primary bg-white hover:bg-accent"
              type="button"
              style={{ 
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none'
              }}
            >
              <Tag className="h-4 w-4 mr-2" />
              Have a promo code?
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo Code</Label>
                <div className="relative">
                  <Input
                    id="promoCode"
                    {...register('promoCode')}
                    placeholder="Enter promo code"
                    className="h-12 pr-10"
                    style={{ 
                      WebkitAppearance: 'none',
                      touchAction: 'manipulation'
                    }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getPromoValidationIcon()}
                  </div>
                </div>
                {errors.promoCode && (
                  <p className="text-sm text-red-500">{errors.promoCode.message}</p>
                )}
              </div>
              
              {/* Promo validation feedback - only show after validation */}
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

        {/* Payment Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Button
            onClick={handleButtonClick}
            disabled={isProcessing || isValidatingPromo || isPriceLoading}
            variant="outline"
            className="w-full h-14 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent disabled:opacity-50"
            size="lg"
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
              : isPriceLoading
              ? 'Loading...'
              : 'Get My Insights'
            }
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Your report will be delivered to your email within minutes. 
            {!pricing.isFree && 'Secure payment processed by Stripe.'}
          </p>
        </motion.div>
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
