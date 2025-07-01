
import React, { useState } from 'react';
import { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Tag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ReportFormData } from '@/types/public-report';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import FormStep from './FormStep';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

interface PaymentStepProps {
  register: UseFormRegister<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onSubmit: () => void;
  isProcessing: boolean;
  promoValidation: PromoValidationState;
  isValidatingPromo: boolean;
}

const PaymentStep = ({ 
  register, 
  watch, 
  errors, 
  onSubmit,
  isProcessing,
  promoValidation,
  isValidatingPromo
}: PaymentStepProps) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const { validatePromoManually } = usePromoValidation();
  
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const name = watch('name');
  const promoCode = watch('promoCode') || '';

  const getReportTitle = (category: string, subCategory: string, type: string) => {
    if (type === 'essence') {
      switch (subCategory) {
        case 'professional': return 'Professional Essence Report';
        case 'relational': return 'Relational Essence Report';
        case 'personal': return 'Personal Essence Report';
        default: return 'Personal Essence Report';
      }
    }
    
    if (type === 'sync' || type === 'compatibility') {
      switch (subCategory) {
        case 'professional': return 'Professional Compatibility Report';
        case 'personal': return 'Personal Compatibility Report';
        default: return 'Personal Compatibility Report';
      }
    }
    
    if (category === 'snapshot') {
      switch (subCategory) {
        case 'focus': return 'Focus Snapshot Report';
        case 'monthly': return 'Monthly Energy Report';
        case 'mindset': return 'Mindset Report';
        default: return 'Focus Snapshot Report';
      }
    }
    
    // Fallback based on report type
    const reportTitles: Record<string, string> = {
      natal: 'Natal Report',
      compatibility: 'Compatibility Report',
      essence: 'Essence Report',
      flow: 'Flow Report',
      mindset: 'Mindset Report',
      monthly: 'Monthly Forecast',
      focus: 'Focus Report',
      sync: 'Sync Report'
    };
    
    return reportTitles[type] || 'Personal Report';
  };

  const getBasePrice = () => {
    return 29.00;
  };

  const calculatePricing = () => {
    const basePrice = getBasePrice();
    
    if (promoValidation.status === 'none' || promoValidation.status === 'invalid') {
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
  const reportTitle = getReportTitle(reportCategory, reportSubCategory, reportType);

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
    console.log('🖱️ Generate My Report button clicked!', e);
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
    
    // Then proceed with form submission via parent
    onSubmit();
  };

  return (
    <FormStep stepNumber={3} title="Additional Notes & Payment" className="bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Additional Notes Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes or Questions (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Share any specific areas you'd like us to focus on in your report..."
              className="min-h-[100px] resize-none"
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">Order Summary</h3>
          
          <div className="space-y-3">
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
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span className={pricing.isFree ? 'text-green-600' : 'text-primary'}>
                  {pricing.isFree ? 'FREE' : `$${pricing.finalPrice.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">What You'll Receive:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Comprehensive PDF report (15-25 pages)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Instant email delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Downloadable for your records</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Professional astrology insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code Section */}
        <Collapsible open={showPromoCode} onOpenChange={setShowPromoCode}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-12 justify-center border-2 border-primary text-primary bg-white hover:bg-accent"
              type="button"
            >
              <Tag className="h-4 w-4 mr-2" />
              Have a promo code?
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
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
              
              {/* Promo validation feedback */}
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

        {/* Submit Button */}
        <div className="space-y-4">
          <Button
            onClick={handleButtonClick}
            disabled={isProcessing || isValidatingPromo}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
            size="lg"
            type="button"
          >
            {isProcessing 
              ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              )
              : isValidatingPromo
              ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Validating...
                </div>
              )
              : 'Generate My Report'
            }
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Secure checkout powered by Stripe</p>
            <p className="mt-1">Your report will be delivered to your email within minutes</p>
          </div>
        </div>

        {/* Guarantee */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">100% Satisfaction Guarantee</h4>
          <p className="text-xs text-muted-foreground">
            Not satisfied with your report? Contact us within 7 days for a full refund.
          </p>
        </div>
      </div>
    </FormStep>
  );
};

export default PaymentStep;
