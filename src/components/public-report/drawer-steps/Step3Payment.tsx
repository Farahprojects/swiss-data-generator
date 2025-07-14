import React, { useEffect, useState } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Tag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { PromoConfirmationDialog } from '@/components/public-report/PromoConfirmationDialog';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';
import { useSmartScroll } from '@/hooks/useSmartScroll';

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
  isProcessing,
  promoValidation,
  isValidatingPromo,
  showPromoConfirmation = false,
  pendingSubmissionData = null,
  onPromoConfirmationTryAgain = () => {},
  onPromoConfirmationContinue = () => {}
}: Step3PaymentProps) => {
  const topSafePadding = useMobileSafeTopPadding();
  const { scrollToElement } = useSmartScroll();
  const [showPromoCode, setShowPromoCode] = useState(false);

  const { getReportPrice, getReportTitle, calculatePricing } = usePriceFetch();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const requestField = watch('request');
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (errors.promoCode) {
      scrollToElement('#promoCode', { block: 'center', delay: 200 });
    }
  }, [errors.promoCode]);

  const formData = { reportType, essenceType, relationshipType, reportCategory, reportSubCategory, request: requestField };
  const basePrice = getReportPrice(formData);
  const reportTitle = getReportTitle(formData);
  const pricing = calculatePricing(basePrice || 0, promoValidation);

  const getPromoValidationIcon = () => {
    if (isValidatingPromo) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    if (promoValidation.status === 'valid-free' || promoValidation.status === 'valid-discount') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (promoCode && promoValidation.status === 'invalid') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getPromoValidationMessage = () => {
    if (isValidatingPromo) return 'Validating promo code...';
    return promoValidation.message || '';
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 pt-6"
      >
        <div className="bg-white">
          <div className="flex items-center justify-center px-6 py-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
                Review & <em className="italic font-light">Payment</em>
              </h1>
              <p className="text-lg text-gray-500 font-light">Almost there, {name}!</p>
            </div>
          </div>

          <div className="px-6 pricing-summary">
            <div className="bg-gray-50/50 rounded-xl p-8 space-y-6">
              <h2 className="text-2xl font-light text-gray-900">Order Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between text-lg font-light text-gray-700">
                  <span>{reportTitle}</span>
                  <span>${pricing?.basePrice?.toFixed(2)}</span>
                </div>
                {pricing?.discount > 0 && (
                  <div className="flex justify-between text-lg font-light text-green-600">
                    <span>Discount ({pricing?.discountPercent}%)</span>
                    <span>-${pricing?.discount?.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-2xl font-light">
                <span>Total</span>
                <span className={pricing?.isFree ? 'text-green-600' : 'text-gray-900'}>
                  {pricing?.isFree ? 'FREE' : `$${pricing?.finalPrice?.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6">
            <Collapsible 
              open={showPromoCode} 
              onOpenChange={(open) => {
                setShowPromoCode(open);
                if (open) scrollToElement('#promoCode', { delay: 300, block: 'center' });
              }}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-base font-light hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  <span>Have a promo code?</span>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="promoCode" className="text-lg font-light text-gray-700">Promo Code</Label>
                    <div className="relative">
                      <Input
                        id="promoCode"
                        {...register('promoCode')}
                        placeholder="Enter promo code"
                        className="h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 pr-12"
                        onFocus={(e) => scrollToElement(e.target, { block: 'center' })}
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            scrollToElement('.pricing-summary', { delay: 300, block: 'center' });
                          }
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
                  {promoValidation.message && (
                    <div className={`text-sm font-light p-4 rounded-xl ${
                      isValidatingPromo ? 'bg-gray-50 text-gray-600' :
                      promoValidation.status.includes('valid') ? 'bg-green-50 text-green-700 border border-green-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {getPromoValidationMessage()}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="px-6 pb-6">
            <p className="text-sm text-gray-500 text-center font-light">
              Your report will be delivered to your email within minutes.
              {!pricing?.isFree && ' Secure payment processed by Stripe.'}
            </p>
          </div>
        </div>
      </motion.div>

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
