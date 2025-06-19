
import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Loader2, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReportFormData } from '@/types/public-report';
import { PromoCodeValidation } from '@/utils/promoCodeValidation';

interface PromoCodeSectionProps {
  register: UseFormRegister<ReportFormData>;
  promoValidation: PromoCodeValidation | null;
  isValidatingPromo: boolean;
  onPromoCodeChange: (value: string) => void;
}

const PromoCodeSection = ({ 
  register, 
  promoValidation, 
  isValidatingPromo,
  onPromoCodeChange 
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
            className={`text-center px-4 py-3 text-base transition-colors ${
              promoValidation?.isValid 
                ? 'border-green-500 bg-green-50' 
                : promoValidation && !promoValidation.isValid 
                ? 'border-red-500 bg-red-50' 
                : ''
            }`}
            maxLength={10}
            onChange={(e) => {
              register('promoCode').onChange(e);
              onPromoCodeChange(e.target.value);
            }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValidatingPromo && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!isValidatingPromo && promoValidation?.isValid && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
        
        {promoValidation && (
          <div className={`text-xs text-center p-2 rounded transition-all duration-300 ${
            promoValidation.isValid 
              ? promoValidation.isFree 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {promoValidation.message}
          </div>
        )}
        
        {isValidatingPromo && (
          <div className="text-xs text-center p-2 rounded bg-gray-50 text-gray-600 border border-gray-200">
            Validating promo code...
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoCodeSection;
