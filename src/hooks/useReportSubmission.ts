
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
      // 1. VALIDATE PROMO CODE FIRST (if provided)
      let validatedPromo: any = null;
      
      if (data.promoCode && data.promoCode.trim()) {
        console.log('🎯 [useReportSubmission] Validating promo code:', data.promoCode);
        
        const { data: promoResponse, error: promoError } = await supabase.functions.invoke('validate-promo-code', {
          body: {
            promo_code: data.promoCode,
            email: data.email
          }
        });

        if (promoError) {
          console.error('Promo validation failed:', promoError);
          setInlinePromoError('Promo validation error');
          setIsProcessing(false);
          return { success: false };
        }

        if (!promoResponse.valid) {
          console.log('Invalid promo code:', promoResponse.reason);
          setInlinePromoError('Invalid Promo Code');
          setIsProcessing(false);
          return { success: false };
        }

        validatedPromo = promoResponse;
        console.log('✅ Promo code validated:', validatedPromo);
      }

      // 2. CALCULATE PRICING with validated promo
      let basePrice = getReportPrice(data);
      let finalPrice = basePrice;
      let discountPercent = 0;

      if (validatedPromo) {
        discountPercent = validatedPromo.discount_value || 0;
        const discountAmount = basePrice * (discountPercent / 100);
        finalPrice = Math.max(basePrice - discountAmount, 0);
      }

      // 3. PREPARE REPORT DATA
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
        request: data.request || data.reportType || 'essence',
        reportType: data.request || data.reportType || 'standard',
        relationshipType: data.relationshipType,
        essenceType: data.essenceType,
        email: data.email,
        returnYear: data.returnYear,
        notes: data.notes,
        product_id: data.request || data.reportType || 'essence',
        
        // Nested person structure for translator-edge
        person_a,
        person_b,
        
        // Legacy flat fields for backward compatibility (if needed by other systems)
        name: data.name,
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
      };

      console.log('🔄 [useReportSubmission] Structured report data:', {
        request: reportData.request,
        person_a: reportData.person_a,
        person_b: reportData.person_b,
        basePrice,
        finalPrice,
        validatedPromo: validatedPromo ? { discount_type: validatedPromo.discount_type, discount_value: validatedPromo.discount_value } : null
      });

      // 4. CALL INITIATE-REPORT-FLOW with pre-validated data
      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          basePrice: finalPrice, // Pass final calculated price
          validatedPromo // Pass validated promo data instead of raw promo code
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
