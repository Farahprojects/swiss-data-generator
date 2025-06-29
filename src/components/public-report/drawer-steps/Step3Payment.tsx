
import React, { useState } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';

interface Step3PaymentProps {
  register: UseFormRegister<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
  onPrev: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

const Step3Payment = ({ register, watch, errors, onPrev, onSubmit, isProcessing }: Step3PaymentProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  
  const reportCategory = watch('reportCategory');
  const name = watch('name');

  const getReportTitle = (category: string) => {
    switch (category) {
      case 'professional':
        return 'Professional Essence Report';
      case 'relational':
        return 'Relationship Compatibility Report';
      case 'personal':
        return 'Personal Essence Report';
      default:
        return 'Personal Report';
    }
  };

  const getReportPrice = () => '$10.00'; // This would integrate with your pricing logic

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
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{getReportTitle(reportCategory)}</span>
          <span className="font-semibold">{getReportPrice()}</span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between items-center font-semibold">
          <span>Total</span>
          <span>{getReportPrice()}</span>
        </div>
      </div>

      {/* Promo Code Section */}
      <Collapsible open={showPromoCode} onOpenChange={setShowPromoCode}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 justify-start"
            type="button"
          >
            <Tag className="h-4 w-4 mr-2" />
            Have a promo code?
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="space-y-2">
            <Label htmlFor="promoCode">Promo Code</Label>
            <Input
              id="promoCode"
              {...register('promoCode')}
              placeholder="Enter promo code"
              className="h-12"
            />
            {errors.promoCode && (
              <p className="text-sm text-red-500">{errors.promoCode.message}</p>
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
          onClick={onSubmit}
          disabled={isProcessing}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {isProcessing ? 'Processing...' : `Get My Report - ${getReportPrice()}`}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          Your report will be delivered to your email within minutes. 
          Secure payment processed by Stripe.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default Step3Payment;
