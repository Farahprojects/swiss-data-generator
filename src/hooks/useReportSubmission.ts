
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
      }, 10000); // 10 second timeout
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

      // Call the server-side function that handles everything
      const { data: result, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          promoCode: data.promoCode || undefined
        }
      });

      if (error) {
        console.log('Full error object:', error);
        console.log('Error message:', error.message);
        console.log('Error context:', error.context);
        
        // Extract the actual error message from the Response object
        let errorMessage = '';
        
        try {
          // If error.context is a Response object, read its body
          if (error.context && typeof error.context.text === 'function') {
            const responseText = await error.context.text();
            console.log('Response text:', responseText);
            
            try {
              const parsedResponse = JSON.parse(responseText);
              errorMessage = parsedResponse.error || responseText;
            } catch (parseError) {
              errorMessage = responseText;
            }
          } else if (error.context && error.context.json && error.context.json.error) {
            errorMessage = error.context.json.error;
          } else if (error.context && error.context.body && typeof error.context.body === 'string') {
            try {
              const parsedBody = JSON.parse(error.context.body);
              errorMessage = parsedBody.error || error.context.body;
            } catch (e) {
              errorMessage = error.context.body;
            }
          } else if (error.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
        } catch (responseError) {
          console.log('Error reading response:', responseError);
          errorMessage = error.message || 'Failed to process request';
        }

        console.log('Extracted error message:', errorMessage);

        // Check if this is a promo code validation error
        const isPromoError = errorMessage.toLowerCase().includes('promo') || 
                           errorMessage.toLowerCase().includes('invalid or expired') ||
                           errorMessage.toLowerCase().includes('usage limit') ||
                           error.status === 400;
        
        if (isPromoError) {
          console.log('Setting inline promo error');
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
      console.log('Catch block error object:', error);
      
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
    } finally {
      if (isProcessing) {
        setIsProcessing(false);
      }
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
