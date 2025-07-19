
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';
import { isAstroOnlyReport } from '@/utils/reportTypeUtils';
import { supabase } from '@/integrations/supabase/client';

export const useReportSubmission = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const [inlinePromoError, setInlinePromoError] = useState<string>('');
  const [lastSubmittedReportId, setLastSubmittedReportId] = useState<string | null>(null);

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
    
    const isAstroOnly = isAstroOnlyReport(data.reportCategory, data.request, data.reportType);
    
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

      console.log(isAstroOnly ? '🚀 Submitting astro-only report' : '🤖 Submitting AI-enhanced report');

      // Single call to initiate-report-flow - it handles everything server-side
      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          promoCode: data.promoCode || undefined
        }
      });

      if (error) {
        console.log('Flow error:', error);
        
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

      // Handle the simplified response from the new "no-hop" architecture
      if (flowResponse.status === 'success') {
        // FREE FLOW: Report is free and being generated
        setReportCreated(true);
        setLastSubmittedReportId(flowResponse.reportId);
        storeGuestReportId(flowResponse.reportId);
        
        if (isAstroOnly) {
          toast({
            title: "Astro Data Generating!",
            description: "Your astro data is being prepared - it will be ready in just a few seconds.",
          });
        } else {
          toast({
            title: "Free Report Created!",
            description: "Your report has been generated and will be sent to your email shortly.",
          });
        }
        setIsProcessing(false);
        
      } else if (flowResponse.status === 'payment_required') {
        // PAID FLOW: Server calculated secure price and created Stripe checkout
        console.log('Redirecting to secure Stripe checkout:', {
          stripeUrl: flowResponse.stripeUrl ? 'URL_PROVIDED' : 'NO_URL',
          finalAmount: flowResponse.finalAmount
        });

        if (!flowResponse.stripeUrl) {
          toast({
            title: "Payment Error",
            description: "Failed to create secure checkout session",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        // Redirect to Stripe checkout (created with secure server-side pricing)
        try {
          window.open(flowResponse.stripeUrl, '_self');
        } catch (redirectError) {
          console.warn("Failed to redirect with window.open, falling back to location.href");
          window.location.href = flowResponse.stripeUrl;
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
    setLastSubmittedReportId(null);
  };

  return {
    isProcessing,
    isPricingLoading,
    reportCreated,
    lastSubmittedReportId,
    submitReport,
    inlinePromoError,
    clearInlinePromoError,
    resetReportState
  };
};
