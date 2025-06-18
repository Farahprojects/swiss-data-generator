
import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReportFormData } from '@/types/public-report';
import { PromoCodeValidation } from '@/utils/promoCodeValidation';

interface PromoCodeSectionProps {
  register: UseFormRegister<ReportFormData>;
  showPromoCode: boolean;
  setShowPromoCode: (show: boolean) => void;
  promoValidation: PromoCodeValidation | null;
  isValidatingPromo: boolean;
  onPromoCodeChange: (value: string) => void;
}

const PromoCodeSection = ({ 
  register, 
  showPromoCode, 
  setShowPromoCode, 
  promoValidation, 
  isValidatingPromo,
  onPromoCodeChange 
}: PromoCodeSectionProps) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <button
        type="button"
        onClick={() => setShowPromoCode(!showPromoCode)}
        className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-base font-bold text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <span>Have a promo code?</span>
        <div className="flex items-center gap-1">
          <span className="underline">Enter it here</span>
          {showPromoCode ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        showPromoCode ? 'max-h-32 opacity-100 mt-3' : 'max-h-0 opacity-0'
      }`}>
        <div className="space-y-2">
          <div className="relative">
            <Input
              {...register('promoCode')}
              placeholder="Enter promo code"
              className="text-center px-12 py-6 text-lg"
              onChange={(e) => {
                register('promoCode').onChange(e);
                onPromoCodeChange(e.target.value);
              }}
            />
            {isValidatingPromo && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          {promoValidation && (
            <div className={`text-xs text-center p-2 rounded ${
              promoValidation.isValid 
                ? promoValidation.isFree 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {promoValidation.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoCodeSection;
