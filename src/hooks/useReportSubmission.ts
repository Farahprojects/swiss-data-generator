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
  setCreatedGuestReportId?: (id: string) => void
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

      // Encode data for URL parameters to preserve user gesture
      const reportDataParam = encodeURIComponent(JSON.stringify(reportData));
      const trustedPricingParam = encodeURIComponent(JSON.stringify(trustedPricing));
      
      // Direct navigation to edge function for immediate redirect (mobile-safe)
      const functionUrl = `https://wrvqqvqvwqmfdqvqmaar.supabase.co/functions/v1/initiate-and-checkout?reportData=${reportDataParam}&trustedPricing=${trustedPricingParam}`;
      
      console.log("🔄 [REPORT-SUBMISSION] Redirecting to edge function for immediate checkout...");
      window.location.href = functionUrl;
      
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
