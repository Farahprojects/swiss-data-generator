
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { initiateGuestCheckout } from '@/utils/guest-checkout';
import { createFreeReport, validatePromoCode } from '@/utils/promoCodeValidation';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
  errorType?: string;
}

export const useReportSubmission = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const [inlinePromoError, setInlinePromoError] = useState<string>('');
  const { toast } = useToast();
  const { getReportPrice, getReportTitle, isLoading: isPricingLoading } = typeof window !== 'undefined' ? usePriceFetch() : { getReportPrice: () => 0, getReportTitle: () => 'Report', isLoading: false };

  // Reset reportCreated state on mount to prevent stale success screens
  useEffect(() => {
    setReportCreated(false);
  }, []);

  // Add timeout mechanism to prevent stuck processing state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isProcessing) {
      timeoutId = setTimeout(() => {
        console.warn('Report submission timeout - resetting processing state');
        setIsProcessing(false);
        toast({
          title: "Request Timeout",
          description: "The request took too long. Please try again.",
          variant: "destructive",
        });
      }, 10000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isProcessing, toast]);

  const submitReport = async (
    data: ReportFormData, 
    promoValidation: PromoValidationState,
    setPromoValidation: (state: PromoValidationState) => void,
    skipPromoValidation: boolean = false
  ) => {
    setIsProcessing(true);
    
    try {
      let validatedPromo = null;
      
      // Only validate promo if there's a code and it hasn't been validated yet
      if (data.promoCode && data.promoCode.trim() !== '' && !skipPromoValidation) {
        if (promoValidation.status === 'none' || promoValidation.status === 'invalid') {
          setPromoValidation({
            status: 'validating',
            message: 'Validating promo code...',
            discountPercent: 0
          });

          validatedPromo = await validatePromoCode(data.promoCode);
          
          if (validatedPromo.isValid) {
            setPromoValidation({
              status: validatedPromo.isFree ? 'valid-free' : 'valid-discount',
              message: validatedPromo.message,
              discountPercent: validatedPromo.discountPercent
            });
          } else {
            setInlinePromoError(validatedPromo.message);
            setPromoValidation({
              status: 'invalid',
              message: validatedPromo.message,
              discountPercent: 0,
              errorType: validatedPromo.errorType
            });
            setIsProcessing(false);
            return;
          }
        } else {
          // Use cached validation result
          validatedPromo = {
            isValid: promoValidation.status === 'valid-free' || promoValidation.status === 'valid-discount',
            isFree: promoValidation.status === 'valid-free',
            discountPercent: promoValidation.discountPercent,
            message: promoValidation.message
          };
        }
      }

      const reportTypeToUse = data.request || data.reportType || 'standard';

      // Handle free report with promo code
      if (data.promoCode && validatedPromo?.isFree && validatedPromo.isValid) {
        const isAstroData = data.request && data.request.trim() !== '';
        
        const reportData = {
          reportType: reportTypeToUse,
          request: isAstroData ? data.request : '',
          relationshipType: data.relationshipType,
          essenceType: data.essenceType,
          name: data.name,
          email: data.email,
          birthDate: data.birthDate,
          birthTime: data.birthTime,
          birthLocation: data.birthLocation,
          birthLatitude: data.birthLatitude,
          birthLongitude: data.birthLongitude,
          birthPlaceId: data.birthPlaceId,
          secondPersonName: data.secondPersonName,
          secondPersonBirthDate: data.secondPersonBirthDate,
          secondPersonBirthTime: data.secondPersonBirthTime,
          secondPersonBirthLocation: data.secondPersonBirthLocation,
          secondPersonLatitude: data.secondPersonLatitude,
          secondPersonLongitude: data.secondPersonLongitude,
          secondPersonPlaceId: data.secondPersonPlaceId,
          returnYear: data.returnYear,
          notes: data.notes,
        };

        const result = await createFreeReport(data.promoCode, reportData);
        
        setReportCreated(true);
        storeGuestReportId(result.reportId);
        toast({
          title: "Free Report Created!",
          description: "Your report has been generated and will be sent to your email shortly.",
        });
        
        return;
      }
      
      // Regular paid flow
      const formDataForPricing = {
        reportType: data.reportType,
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        reportCategory: data.reportCategory,
        reportSubCategory: data.reportSubCategory,
        request: data.request
      };
      
      const amount = getReportPrice(formDataForPricing);
      const description = getReportTitle(formDataForPricing);

      let finalAmount = amount;
      if (data.promoCode && validatedPromo?.isValid && !validatedPromo.isFree) {
        finalAmount = amount * (1 - validatedPromo.discountPercent / 100);
      }

      const isAstroData = data.request && data.request.trim() !== '';
      
      const reportData = {
        reportType: reportTypeToUse,
        request: isAstroData ? data.request : '',
        relationshipType: data.relationshipType,
        essenceType: data.essenceType,
        name: data.name,
        email: data.email,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthLocation: data.birthLocation,
        birthLatitude: data.birthLatitude,
        birthLongitude: data.birthLongitude,
        birthPlaceId: data.birthPlaceId,
        secondPersonName: data.secondPersonName,
        secondPersonBirthDate: data.secondPersonBirthDate,
        secondPersonBirthTime: data.secondPersonBirthTime,
        secondPersonBirthLocation: data.secondPersonBirthLocation,
        secondPersonLatitude: data.secondPersonLatitude,
        secondPersonLongitude: data.secondPersonLongitude,
        secondPersonPlaceId: data.secondPersonPlaceId,
        returnYear: data.returnYear,
        notes: data.notes,
        promoCode: data.promoCode,
      };
      
      const result = await initiateGuestCheckout({
        amount: finalAmount,
        email: data.email,
        description,
        reportData,
      });
      
      if (!result.success) {
        toast({
          title: "Payment Error",
          description: result.error || "Failed to initiate checkout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in submitReport:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearInlinePromoError = () => {
    setInlinePromoError('');
  };

  const resetReportState = () => {
    setReportCreated(false);
  };

  return {
    isProcessing,
    isPricingLoading,
    reportCreated,
    submitReport,
    inlinePromoError,
    clearInlinePromoError,
    resetReportState
  };
};
