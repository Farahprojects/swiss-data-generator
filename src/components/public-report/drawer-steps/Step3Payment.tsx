
import React, { useState } from 'react';
import { UseFormRegister, UseFormWatch, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Tag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';
import { usePromoValidation } from '@/hooks/usePromoValidation';

interface Step3PaymentProps {
  register: UseFormRegister<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
  onPrev: () => void;
  handleSubmit: UseFormHandleSubmit<DrawerFormData>;
  onSubmit: (data: DrawerFormData) => void;
  isProcessing: boolean;
}

const Step3Payment = ({ 
  register, 
  watch, 
  errors, 
  onPrev, 
  handleSubmit,
  onSubmit,
  isProcessing
}: Step3PaymentProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const { promoValidation, isValidatingPromo, validatePromoManually } = usePromoValidation();
  
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  const getReportTitle = (category: string, subCategory: string) => {
    switch (category) {
      case 'the-self':
        switch (subCategory) {
          case 'professional': return 'Professional Essence Report';
          case 'relational': return 'Relational Essence Report';
          case 'personal': return 'Personal Essence Report';
          default: return 'Personal Essence Report';
        }
      case 'compatibility':
        switch (subCategory) {
          case 'professional': return 'Professional Compatibility Report';
          case 'personal': return 'Personal Compatibility Report';
          default: return 'Personal Compatibility Report';
        }
      case 'snapshot':
        switch (subCategory) {
          case 'focus': return 'Focus Snapshot Report';
          case 'monthly': return 'Monthly Energy Report';
          case 'mindset': return 'Mindset Report';
          default: return 'Focus Snapshot Report';
        }
      default:
        return 'Personal Report';
    }
  };

  const getBasePrice = () => {
    return 10.00;
  };

  const calculatePricing = () => {
    const basePrice = getBasePrice();
    
    if (!promoValidation || !promoValidation.isValid) {
      return {
        basePrice,
        discount: 0,
        discountPercent: 0,
        finalPrice: basePrice,
        isFree: false
      };
    }

    const discountPercent = promoValidation.discountPercent;
    const discount = basePrice * (discountPercent / 100);
    const finalPrice = basePrice - discount;
    
    return {
      basePrice,
      discount,
      discountPercent,
      finalPrice: Math.max(0, finalPrice),
      isFree: discountPercent === 100
    };
  };

  const pricing = calculatePricing();
  const reportTitle = getReportTitle(reportCategory, reportSubCategory);

  const getPromoValidationIcon = () => {
    if (isValidatingPromo) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
    if (promoValidation?.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (promoCode && promoValidation && !promoValidation.isValid) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getPromoValidationMessage = () => {
    if (isValidatingPromo) {
      return 'Validating promo code...';
    }
    return promoValidation?.message || '';
  };

  const handleButtonClick = async (e: React.MouseEvent) => {
    console.log('🖱️ Get my Insights button clicked!', e);
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
    
    // Then proceed with form submission
    handleSubmit(
      (data) => {
        console.log('✅ Mobile form validation passed, submitting:', data);
        onSubmit(data);
      },
      (errors) => {
        console.log('❌ Mobile form validation failed:', errors);
      }
    )(e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
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
            <span className="font-medium">${pricing.basePrice.toFixed(2)}</span>
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
            {promoValidation && (
              <div className={`text-sm p-3 rounded-lg ${
                isValidatingPromo 
                  ? 'bg-gray-50 text-gray-600'
                  : promoValidation.isValid
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
          disabled={isProcessing || isValidatingPromo}
          variant="outline"
          className="w-full h-14 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent disabled:opacity-50"
          size="lg"
          type="button"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {isProcessing 
            ? 'Processing...' 
            : isValidatingPromo
            ? 'Validating...'
            : pricing.isFree 
            ? 'Get My Free Insights'
            : `Get My Insights - $${pricing.finalPrice.toFixed(2)}`
          }
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          Your report will be delivered to your email within minutes. 
          {!pricing.isFree && 'Secure payment processed by Stripe.'}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Step3Payment;
