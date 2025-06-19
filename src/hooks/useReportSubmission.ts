
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { guestCheckoutWithAmount } from '@/utils/guest-checkout';
import { createFreeReport, validatePromoCode } from '@/utils/promoCodeValidation';
import { getReportPriceAndDescription, buildCompleteReportType } from '@/services/report-pricing';
import { ReportFormData } from '@/types/public-report';
import { PromoValidationState } from '@/pages/PublicReport';

export const useReportSubmission = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const { toast } = useToast();

  const submitReport = async (
    data: ReportFormData, 
    promoValidation: PromoValidationState,
    setPromoValidation: (validation: PromoValidationState) => void
  ) => {
    console.log('🚀 Form submission started');
    console.log('📝 Form data:', data);
    
    setIsProcessing(true);
    setIsPricingLoading(true);
    
    try {
      const completeReportType = buildCompleteReportType(
        data.reportType, 
        data.essenceType, 
        data.relationshipType
      );

      // Validate promo code if provided
      if (data.promoCode && data.promoCode.trim() !== '') {
        console.log('🎫 Validating promo code:', data.promoCode);
        
        const validation = await validatePromoCode(data.promoCode);
        
        if (validation.isValid) {
          const newPromoValidation: PromoValidationState = {
            status: validation.isFree ? 'valid-free' : 'valid-discount',
            message: validation.message,
            discountPercent: validation.discountPercent
          };
          setPromoValidation(newPromoValidation);

          // If it's a free promo code, process as free report
          if (validation.isFree) {
            console.log('Processing free report with promo code:', data.promoCode);
            
            const reportData = {
              reportType: completeReportType,
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

            await createFreeReport(data.promoCode, reportData);
            
            setReportCreated(true);
            toast({
              title: "Free Report Created!",
              description: "Your report has been generated and will be sent to your email shortly.",
            });
            
            setIsPricingLoading(false);
            return;
          }
        } else {
          // Invalid promo code
          setPromoValidation({
            status: 'invalid',
            message: validation.message,
            discountPercent: 0
          });
        }
      }
      
      // Regular paid flow (with or without discount)
      const { amount, description } = await getReportPriceAndDescription(
        data.reportType, 
        data.relationshipType, 
        data.essenceType
      );
      
      setIsPricingLoading(false);

      // Apply promo code discount if valid (but not free)
      let finalAmount = amount;
      if (data.promoCode && promoValidation.status === 'valid-discount') {
        finalAmount = amount * (1 - promoValidation.discountPercent / 100);
      }

      const reportData = {
        reportType: completeReportType,
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
        promoCode: data.promoCode,
      };
      
      console.log('Report data being sent to checkout:', reportData);
      
      const result = await guestCheckoutWithAmount(data.email, finalAmount, description, reportData);
      
      if (!result.success) {
        toast({
          title: "Payment Error",
          description: result.error || "Failed to initiate checkout",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing report:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Form submission completed');
      setIsProcessing(false);
      setIsPricingLoading(false);
    }
  };

  return {
    isProcessing,
    isPricingLoading,
    reportCreated,
    submitReport
  };
};
