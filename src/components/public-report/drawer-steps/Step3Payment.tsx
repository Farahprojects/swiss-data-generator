import React, { useEffect, useState, useRef } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step3PaymentProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  isProcessing: boolean;
  inlinePromoError?: string;
  clearInlinePromoError?: () => void;
  onTimeoutChange?: (hasTimedOut: boolean) => void;
}

const Step3Payment = ({ 
  register, 
  watch, 
  errors, 
  isProcessing,
  inlinePromoError = '',
  clearInlinePromoError = () => {},
  onTimeoutChange = () => {}
}: Step3PaymentProps) => {
  const topSafePadding = useMobileSafeTopPadding();
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const promoCodeRef = useRef<HTMLDivElement>(null);

  const { getReportPrice, getReportTitle } = usePriceFetch();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const requestField = watch('request');
  const request = watch('request');
  const name = watch('name');

  // Add timeout mechanism to prevent stuck processing state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isProcessing) {
      setHasTimedOut(false);
      onTimeoutChange(false);
      timeoutId = setTimeout(() => {
        console.warn('Processing timeout - this may indicate a server issue');
        setHasTimedOut(true);
        onTimeoutChange(true);
      }, 15000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isProcessing, onTimeoutChange]);

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

  // Simple pricing calculation
  const finalPrice = basePrice || 0;

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
          <div className="flex items-center justify-center px-6 py-6">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-3 tracking-tight">
                Review & <em className="italic font-light">Payment</em>
              </h1>
              <p className="text-base text-gray-500 font-light">Almost there, {name}!</p>
            </div>
          </div>

          <div className="px-6 pricing-summary">
            <div className="bg-gray-50/50 rounded-xl p-6 space-y-4">
              <h2 className="text-xl font-light text-gray-900">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-base font-light text-gray-700">
                  <span>{reportTitle}</span>
                  <span>${finalPrice.toFixed(2)}</span>
                </div>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-lg font-light">
                <span>Total</span>
                <span className="text-gray-900">${finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="px-6">
            <Collapsible 
              open={showPromoCode} 
              onOpenChange={(open) => {
                setShowPromoCode(open);
                if (open) {
                  // Auto-scroll to promo code section when it opens
                  setTimeout(() => {
                    promoCodeRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-light hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  <span>Have a promo code?</span>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent ref={promoCodeRef} className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="promoCode" className="text-base font-light text-gray-700">Promo Code</Label>
                    
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
                        className={`h-12 rounded-xl text-base font-light border-gray-200 focus:border-gray-400 transition-all duration-200 ${
                          (errors.promoCode || inlinePromoError) ? 'border-red-400 ring-1 ring-red-400 promo-input-error' : ''
                        }`}
                      />
                      
                      {/* Clean text error message */}
                      {(errors.promoCode || inlinePromoError) && (
                        <p className="mt-2 text-sm text-red-600 font-light leading-relaxed promo-error-message">
                          {errors.promoCode?.message || inlinePromoError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="px-6 pb-4">
            <p className="text-xs text-gray-500 text-center font-light">
              Your report will be delivered to your email within minutes.
              Secure payment processed by Stripe.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Step3Payment;
