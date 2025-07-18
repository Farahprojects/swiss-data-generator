
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { initiateGuestCheckout } from '@/utils/guest-checkout';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';

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

  // Reset reportCreated state on mount to prevent stale success screens
  useEffect(() => {
    setReportCreated(false);
  }, []);

  const { toast } = useToast();
  const { getReportPrice, getReportTitle, isLoading: isPricingLoading } = typeof window !== 'undefined' ? usePriceFetch() : { getReportPrice: () => 0, getReportTitle: () => 'Report', isLoading: false };

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
      }, 10000); // 10 second timeout
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
      // Prepare report data for the server
      const reportData = {
        reportType: data.request || data.reportType || 'standard',
        request: data.request || '',
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

      // Call the new consolidated server-side function
      const { data: result, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          promoCode: data.promoCode || undefined
        }
      });

      if (error) {
        // Handle server-side validation errors
        const errorMessage = error.message || 'Failed to process request';
        
        // Check if this is a promo code validation error
        if (error.message?.includes('promo code') || 
            error.message?.includes('Invalid promo') || 
            error.message?.includes('expired promo code') ||
            error.message?.includes('usage limit') ||
            error.status === 400) {
          
          // Always show "Invalid Promo Code" for any promo-related error
          setInlinePromoError('Invalid Promo Code');
          setPromoValidation({
            status: 'invalid',
            message: 'Invalid Promo Code',
            discountPercent: 0,
            errorType: 'invalid'
          });
          // Reset processing state for promo code errors so user can retry
          setIsProcessing(false);
          return; // Exit early to prevent further processing
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      // Handle success response
      if (result.isFreeReport) {
        // Free report path
        setReportCreated(true);
        storeGuestReportId(result.reportId);
        toast({
          title: "Free Report Created!",
          description: "Your report has been generated and will be sent to your email shortly.",
        });
      } else {
        // Paid report path - redirect to Stripe
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

        const checkoutResult = await initiateGuestCheckout({
          amount,
          email: data.email,
          description,
          reportData,
        });
        
        if (!checkoutResult.success) {
          toast({
            title: "Payment Error",
            description: checkoutResult.error || "Failed to initiate checkout",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error in submitReport:', error);
      
      // Check if this is a network or server error related to promo codes
      if (error instanceof Error && error.message.includes('400')) {
        setInlinePromoError('Invalid Promo Code');
        setPromoValidation({
          status: 'invalid',
          message: 'Invalid Promo Code',
          discountPercent: 0,
          errorType: 'invalid'
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to process your request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      // Only reset processing state if we haven't already done so for promo errors
      if (isProcessing) {
        setIsProcessing(false);
      }
    }
  };

  const clearInlinePromoError = () => {
    setInlinePromoError('');
  };

  const clearPromoValidation = () => {
    setInlinePromoError('');
    // This function can be passed to components to reset promo validation state
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
    clearPromoValidation,
    resetReportState
  };
};
