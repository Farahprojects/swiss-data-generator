
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { initiateGuestCheckout } from '@/utils/guest-checkout';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';

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
      }, 15000); // 15 second timeout for potential Stripe redirect
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isProcessing, toast]);

  const submitReport = async (data: ReportFormData) => {
    setIsProcessing(true);
    setInlinePromoError(''); // Clear any previous errors
    
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

      // Step 1: Call the enhanced initiate-report-flow for validation and pricing
      const { data: validationResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          promoCode: data.promoCode || undefined
        }
      });

      if (error) {
        console.log('Validation error:', error);
        
        // Extract error message from response
        let errorMessage = '';
        
        try {
          if (error.context && typeof error.context.text === 'function') {
            const responseText = await error.context.text();
            try {
              const parsedResponse = JSON.parse(responseText);
              errorMessage = parsedResponse.error || responseText;
            } catch (parseError) {
              errorMessage = responseText;
            }
          } else if (error.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
        } catch (responseError) {
          errorMessage = error.message || 'Failed to process request';
        }

        // Check if this is a promo code validation error
        const isPromoError = errorMessage.toLowerCase().includes('promo') || 
                           errorMessage.toLowerCase().includes('invalid or expired') ||
                           errorMessage.toLowerCase().includes('usage limit') ||
                           error.status === 400;
        
        if (isPromoError) {
          setInlinePromoError('Invalid Promo Code');
          setIsProcessing(false);
          return;
        } else {
          toast({
            title: "Error",
            description: errorMessage || 'Failed to process request',
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }

      // Step 2: Handle the response based on status
      if (validationResponse.status === 'success') {
        // FREE FLOW: Report is free and being generated
        setReportCreated(true);
        storeGuestReportId(validationResponse.reportId);
        toast({
          title: "Free Report Created!",
          description: "Your report has been generated and will be sent to your email shortly.",
        });
        setIsProcessing(false);
        
      } else if (validationResponse.status === 'payment_required') {
        // PAID FLOW: Use existing guest checkout with server-calculated price
        
        // Prepare enhanced report data with validation results
        const checkoutReportData = {
          ...reportData,
          validatedPromoId: validationResponse.validatedPromoId,
          productId: validationResponse.productId,
          originalPrice: validationResponse.originalPrice,
          discountPercent: validationResponse.discountPercent
        };

        console.log('Initiating paid checkout:', {
          amount: validationResponse.finalAmount,
          description: validationResponse.description,
          hasPromo: !!validationResponse.validatedPromoId
        });

        // Call existing guest checkout function with server-calculated pricing
        const checkoutResult = await initiateGuestCheckout({
          amount: validationResponse.finalAmount,
          email: reportData.email,
          description: validationResponse.description,
          reportData: checkoutReportData,
        });
        
        if (!checkoutResult.success) {
          toast({
            title: "Payment Error",
            description: checkoutResult.error || "Failed to initiate checkout",
            variant: "destructive",
          });
          setIsProcessing(false);
        }
        // Note: isProcessing stays true during Stripe redirect
        
      } else {
        // Unexpected response
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
      }

    } catch (error) {
      console.error('Error in submitReport:', error);
      
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'Failed to process your request. Please try again.';
      }

      if (errorMessage.toLowerCase().includes('promo') || errorMessage.includes('400')) {
        setInlinePromoError('Invalid Promo Code');
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
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
