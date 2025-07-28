
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
      // 1. TRUST FRONTEND PRICING - Pass calculated basePrice to backend
      const basePrice = getReportPrice(data);

      // 2. PREPARE MINIMAL REPORT DATA (optimized payload)
      const person_a = {
        name: data.name,
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        location: data.birthLocation,
        latitude: data.birthLatitude,
        longitude: data.birthLongitude,
        place_id: data.birthPlaceId,
        tz: '', // Will be inferred by translator-edge
        house_system: ''
      };

      // Only include person_b if second person data exists
      const person_b = data.secondPersonName ? {
        name: data.secondPersonName,
        birth_date: data.secondPersonBirthDate,
        birth_time: data.secondPersonBirthTime,
        location: data.secondPersonBirthLocation,
        latitude: data.secondPersonLatitude,
        longitude: data.secondPersonLongitude,
        place_id: data.secondPersonPlaceId,
        tz: '', // Will be inferred by translator-edge
        house_system: ''
      } : undefined;

      const reportData = {
        email: data.email,
        reportType: data.request || data.reportType || 'essence_personal',
        request: data.request || data.reportType?.split('_')[0] || 'essence',
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        returnYear: data.returnYear,
        notes: data.notes,
        person_a,
        person_b
      };

      console.log('🚀 [useReportSubmission] Optimized submission:', {
        request: reportData.request,
        basePrice,
        promoCode: data.promoCode || 'none'
      });

      // 3. CALL OPTIMIZED INITIATE-REPORT-FLOW (trust frontend pricing)
      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          basePrice,
          promoCode: data.promoCode || null
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

        toast({
          title: "Error",
          description: errorMessage || 'Failed to process request',
          variant: "destructive",
        });
        setIsProcessing(false);
        return { success: false };
      }

      // 4. FRONTEND ORCHESTRATION - Handle response based on flow type
      if (!flowResponse.guestReportId) {
        toast({
          title: "Error", 
          description: "Failed to create report record",
          variant: "destructive",
        });
        setIsProcessing(false);
        return { success: false };
      }

      const guestReportId = flowResponse.guestReportId;
      
      // Check if it's a free report
      if (flowResponse.isFreeReport) {
        console.log('🎉 [useReportSubmission] Free report - triggering processing');
        
        // Call verify-guest-payment to trigger report generation
        const { error: verifyError } = await supabase.functions.invoke('verify-guest-payment', {
          body: {
            sessionId: guestReportId,
            type: 'promo'
          }
        });

        if (verifyError) {
          console.warn('Failed to trigger report processing:', verifyError);
          // Don't fail - the report record exists and can be processed later
        }
        
        toast({
          title: "Report Created!",
          description: "Your free report is being generated and will be sent to your email shortly.",
        });
        
        storeGuestReportId(guestReportId);
        
        if (setCreatedGuestReportId) {
          setCreatedGuestReportId(guestReportId);
        }
        setReportCreated(true);
        setIsProcessing(false);
        
        return { success: true, guestReportId };
        
      } else {
        console.log('💳 [useReportSubmission] Paid report - creating checkout');
        
        // Calculate final price with applied discount
        const finalPrice = flowResponse.finalPrice || basePrice;
        
        // Call create-checkout
        const { data: checkoutResponse, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
          body: {
            guest_report_id: guestReportId,
            amount: finalPrice,
            email: data.email,
            description: "Astrology Report",
            successUrl: `${window.location.origin}/report?guest_id=${guestReportId}`,
            cancelUrl: `${window.location.origin}/checkout/${guestReportId}?status=cancelled`
          }
        });

        if (checkoutError || !checkoutResponse?.url) {
          toast({
            title: "Error",
            description: "Failed to create checkout session. Please try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return { success: false };
        }

        // Redirect to Stripe checkout
        try {
          window.open(checkoutResponse.url, '_self');
        } catch (redirectError) {
          console.warn("Failed to redirect with window.open, falling back to location.href");
          window.location.href = checkoutResponse.url;
        }
        
        return { success: true };
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

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
