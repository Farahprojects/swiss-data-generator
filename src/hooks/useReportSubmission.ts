import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';
import { isAstroReport } from '@/utils/reportHelpers';

export interface TrustedPricingObject {
  valid: boolean;
  promo_code_id?: string;
  discount_usd: number;
  trusted_base_price_usd: number;
  final_price_usd: number;
  report_type: string;
  reason?: string;
}

export const useReportSubmission = (
  setCreatedGuestReportId?: (id: string) => void,
  closeDrawer?: () => void
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const { toast } = useToast();

  // Note: Removed automatic state reset on mount to preserve state on refresh
  // State should only be cleared by explicit user actions

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
      }, 15000);
    }

    return () => clearTimeout(timeoutId);
  }, [isProcessing, toast]);

  const submitReport = async (
    data: ReportFormData,
    trustedPricing: TrustedPricingObject
  ): Promise<{ success: boolean; guestReportId?: string }> => {
    setIsProcessing(true);

    try {
      const person_a = {
        name: data.name,
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        location: data.birthLocation,
        latitude: data.birthLatitude,
        longitude: data.birthLongitude,
        place_id: data.birthPlaceId,
        tz: '',
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
        tz: '',
        house_system: ''
      } : undefined;

      // Debug logging for Person B coordinates
      console.log('[Final Values] Person B coordinates:', {
        secondPersonLatitude: data.secondPersonLatitude,
        secondPersonLongitude: data.secondPersonLongitude,
        secondPersonBirthLocation: data.secondPersonBirthLocation
      });

      const reportType = data.request || data.reportType || 'essence_personal';
      
      const reportData = {
        email: data.email,
        reportType,
        request: data.request || data.reportType?.split('_')[0] || 'essence',
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        returnYear: data.returnYear,
        notes: data.notes,
        person_a,
        person_b,
        isAstroOnly: isAstroReport(reportType)
      };

      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          trustedPricing
        }
      });

      if (error || !flowResponse?.guestReportId) {
        throw new Error('❌ Failed to create report: ' + (error?.message || 'Unknown error'));
      }

      const guestReportId = flowResponse.guestReportId;
      storeGuestReportId(guestReportId);
      setCreatedGuestReportId?.(guestReportId);

      if (flowResponse.isFreeReport) {
        toast({
          title: "Report Created!",
          description: "Your free report is being generated and will be sent to your email shortly.",
        });
        setReportCreated(true);
        setIsProcessing(false);
        return { success: true, guestReportId };
      }

      // For paid reports, redirect to checkout
      if (flowResponse.checkoutUrl) {
        if (closeDrawer) {
          closeDrawer();
          setTimeout(() => {
            window.open(flowResponse.checkoutUrl, '_self');
          }, 100);
        } else {
          window.open(flowResponse.checkoutUrl, '_self');
        }
        return { success: true };
      }

      // Fallback for paid reports without checkout URL
      const { data: checkoutResponse, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          guest_report_id: guestReportId,
          amount: trustedPricing.final_price_usd,
          email: data.email,
          description: "Astrology Report",
          successUrl: `${window.location.origin}/report?guest_id=${guestReportId}`,
          cancelUrl: `${window.location.origin}/checkout/${guestReportId}?status=cancelled`
        }
      });

      if (checkoutError || !checkoutResponse?.url) {
        throw new Error('❌ Failed to create checkout session');
      }

      if (closeDrawer) {
        closeDrawer();
        setTimeout(() => {
          window.open(checkoutResponse.url, '_self');
        }, 100);
      } else {
        window.open(checkoutResponse.url, '_self');
      }
      return { success: true };

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err?.message || 'Something went wrong.',
        variant: "destructive",
      });
      setIsProcessing(false);
      return { success: false };
    }
  };

  return {
    isProcessing,
    reportCreated,
    submitReport,
    resetReportState: () => setReportCreated(false)
  };
};
