import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ReportFormData } from '@/types/public-report';
import { storeGuestReportId } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';

export const useReportSubmission = (
  setCreatedGuestReportId?: (id: string) => void,
  preCalculatedPrice?: number
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const [inlinePromoError, setInlinePromoError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    setReportCreated(false);
  }, []);

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
    data: ReportFormData
  ): Promise<{ success: boolean; guestReportId?: string }> => {
    setIsProcessing(true);
    setInlinePromoError('');

    try {
      if (preCalculatedPrice === undefined || isNaN(preCalculatedPrice)) {
        throw new Error('❌ Missing or invalid preCalculatedPrice in useReportSubmission');
      }

      const finalPrice = preCalculatedPrice;
      console.log('💰 Final price used:', finalPrice);

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

      const { data: flowResponse, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: {
          reportData,
          finalPrice,
          isFreeReport: false,
          promoCode: data.promoCode || null
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

      const { data: checkoutResponse, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: {
          guest_report_id: guestReportId,
          amount: flowResponse.finalPrice || finalPrice,
          email: data.email,
          description: "Astrology Report",
          successUrl: `${window.location.origin}/report?guest_id=${guestReportId}`,
          cancelUrl: `${window.location.origin}/checkout/${guestReportId}?status=cancelled`
        }
      });

      if (checkoutError || !checkoutResponse?.url) {
        throw new Error('❌ Failed to create checkout session');
      }

      window.open(checkoutResponse.url, '_self');
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
    inlinePromoError,
    clearInlinePromoError: () => setInlinePromoError(''),
    resetReportState: () => setReportCreated(false)
  };
};
