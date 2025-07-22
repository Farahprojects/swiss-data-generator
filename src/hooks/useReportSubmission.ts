import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';

export const useReportSubmission = (setCreatedGuestReportId?: (id: string) => void) => {
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

  const submitReport = async (data: ReportFormData): Promise<{ success: boolean; guestReportId?: string }> => {
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

      // Single call to initiate-report-flow - it handles everything server-side
      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          promoCode: data.promoCode || undefined
        }
      });

      if (error) {
        // Log error details for debugging but don't expose sensitive info
        console.error('Report submission failed:', {
          status: error.status,
          message: error.message,
          hasContext: !!error.context
        });
        
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
          return { success: false };
        } else {
          toast({
            title: "Error",
            description: errorMessage || 'Failed to process request',
            variant: "destructive",
          });
          setIsProcessing(false);
          return { success: false };
        }
      }

      // Handle the simplified response from the new "no-hop" architecture
      if (flowResponse.status === 'success') {
        // FREE FLOW: Report is free and being generated
        // console.log('🎯 FREE FLOW: Storing guest report ID before setting success state:', flowResponse.reportId);
        storeGuestReportId(flowResponse.reportId);
        
        // FIX: Set both states in the same React tick to eliminate micro-race
        if (setCreatedGuestReportId) {
          setCreatedGuestReportId(flowResponse.reportId);
        }
        setReportCreated(true);
        
        toast({
          title: "Free Report Created!",
          description: "Your report has been generated and will be sent to your email shortly.",
        });
        setIsProcessing(false);
        
        // Return the guest report ID so parent can use it
        return { success: true, guestReportId: flowResponse.reportId };
        
      } else if (flowResponse.status === 'payment_required') {
        // PAID FLOW: Server calculated secure price and created Stripe checkout
        console.log('Redirecting to secure Stripe checkout');

        if (!flowResponse.stripeUrl) {
          toast({
            title: "Payment Error",
            description: "Failed to create secure checkout session",
            variant: "destructive",
          });
          setIsProcessing(false);
          return { success: false };
        }

        // Redirect to Stripe checkout (created with secure server-side pricing)
        try {
          window.open(flowResponse.stripeUrl, '_self');
        } catch (redirectError) {
          console.warn("Failed to redirect with window.open, falling back to location.href");
          window.location.href = flowResponse.stripeUrl;
        }
        
        // Note: isProcessing stays true during Stripe redirect
        return { success: true }; // No guestReportId for paid flow here
        
      } else {
        // Unexpected response
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return { success: false };
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
      return { success: false };
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
