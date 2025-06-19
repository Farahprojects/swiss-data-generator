
import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { ReportFormData } from '@/types/public-report';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

interface PromoCodeSectionProps {
  register: UseFormRegister<ReportFormData>;
  promoValidation: PromoValidationState;
}

const PromoCodeSection = ({ 
  register, 
  promoValidation
}: PromoCodeSectionProps) => {
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="text-center mb-3">
        <span className="text-base font-bold text-muted-foreground">Have a promo code?</span>
      </div>
      
      <div className="space-y-2">
        <div className="relative">
          <Input
            {...register('promoCode')}
            placeholder="Enter here"
            className="text-center px-4 py-3 text-base"
            maxLength={10}
          />
        </div>
        
        {promoValidation.status !== 'none' && (
          <div className={`text-xs text-center p-2 rounded ${
            promoValidation.status === 'valid-free'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : promoValidation.status === 'valid-discount'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : promoValidation.status === 'invalid'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            {promoValidation.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoCodeSection;
