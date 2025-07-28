
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
      console.log('🚀 Starting streamlined report submission');

      // Prepare clean report data structure (no duplicated legacy fields)
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
        person_a,
        person_b,
      };

      console.log('📦 Clean report data prepared:', {
        request: reportData.request,
        email: reportData.email,
        hasPersonB: !!reportData.person_b,
        promoCode: data.promoCode || null
      });

      // Single call to initiate-report-flow (backend handles pricing and promo validation)
      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          promoCode: data.promoCode || null // Let backend handle all validation and pricing
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

      // Handle the simplified professional e-commerce response
      if (flowResponse.success || flowResponse.guestReportId) {
        // FREE FLOW: Report was authorized and created as free (processed by promo)
        const guestReportId = flowResponse.guestReportId;
        
        if (!guestReportId) {
          toast({
            title: "Error", 
            description: "Failed to create report record",
            variant: "destructive",
          });
          setIsProcessing(false);
          return { success: false };
        }
        
        toast({
          title: "Report Created!",
          description: "Your report is being generated and will be sent to your email shortly.",
        });
        
        storeGuestReportId(guestReportId);
        
        // Set both states in the same React tick to eliminate micro-race
        if (setCreatedGuestReportId) {
          setCreatedGuestReportId(guestReportId);
        }
        setReportCreated(true);
        setIsProcessing(false);
        
        // Return the guest report ID so parent can use it
        return { success: true, guestReportId };
        
      } else if (flowResponse.stripeUrl) {
        // PAID FLOW: Server calculated secure price and created Stripe checkout
        console.log('Redirecting to secure Stripe checkout');

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
    reportCreated,
    submitReport,
    inlinePromoError,
    clearInlinePromoError,
    resetReportState
  };
};
