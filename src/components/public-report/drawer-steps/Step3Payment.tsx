
import React from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ReportFormData } from '@/types/public-report';

interface Step3PaymentProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onPrev: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

const Step3Payment = ({ register, watch, errors, onPrev, onSubmit, isProcessing }: Step3PaymentProps) => {
  const name = watch('name');

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
          <h2 className="text-2xl font-bold text-gray-900">Almost Ready!</h2>
          <p className="text-gray-600">
            Hi {name}! Add any special notes and get your personalized report.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Promo Code */}
        <div className="space-y-2">
          <Label htmlFor="promoCode">Promo Code (Optional)</Label>
          <Input
            id="promoCode"
            {...register('promoCode')}
            placeholder="Enter promo code"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Special Notes (Optional)</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Any specific questions or areas you'd like us to focus on?"
            rows={4}
          />
        </div>

        {/* Get My Insights Button */}
        <Button
          onClick={onSubmit}
          disabled={isProcessing}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Get My Insights'
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default Step3Payment;
