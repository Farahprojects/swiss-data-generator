
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReportFormData } from './types';

interface PromoCodeSectionProps {
  form: UseFormReturn<ReportFormData>;
  showPromoCode: boolean;
  onTogglePromoCode: () => void;
}

const PromoCodeSection = ({ form, showPromoCode, onTogglePromoCode }: PromoCodeSectionProps) => {
  const { register, watch } = form;

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={onTogglePromoCode}
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
        showPromoCode ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0'
      }`}>
        <div className="space-y-2">
          <Input
            {...register('promoCode')}
            placeholder="Enter promo code"
            className="text-center px-12 py-6 text-lg"
          />
          {watch('promoCode') && (
            <p className="text-xs text-center text-muted-foreground">
              Promo code will be applied at checkout
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoCodeSection;
