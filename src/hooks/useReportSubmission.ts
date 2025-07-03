
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { initiateGuestCheckout } from '@/utils/guest-checkout';
import { createFreeReport, validatePromoCode } from '@/utils/promoCodeValidation';
import { buildCompleteReportType } from '@/services/report-pricing';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
  errorType?: string;
}

export const useReportSubmission = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const [showPromoConfirmation, setShowPromoConfirmation] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState<{
    data: ReportFormData;
    basePrice: number;
    description: string;
  } | null>(null);
  const { toast } = useToast();
  const { getReportPrice, getReportTitle, isLoading: isPricingLoading } = typeof window !== 'undefined' ? usePriceFetch() : { getReportPrice: () => 0, getReportTitle: () => 'Report', isLoading: false };

  const submitReport = async (
    data: ReportFormData, 
    promoValidation: PromoValidationState,
    setPromoValidation: (state: PromoValidationState) => void,
    skipPromoValidation: boolean = false
  ) => {
    console.log('🚀 Form submission started');
    console.log('📝 Form data:', data);
    
    setIsProcessing(true);
    
    try {
      // Validate promo code if present and not skipping validation
      let validatedPromo = null;
      if (data.promoCode && data.promoCode.trim() !== '' && !skipPromoValidation) {
        console.log('🎫 Validating promo code:', data.promoCode);
        setPromoValidation({
          status: 'validating',
          message: 'Validating promo code...',
          discountPercent: 0
        });

        validatedPromo = await validatePromoCode(data.promoCode);
        
        if (validatedPromo.isValid) {
          setPromoValidation({
            status: validatedPromo.isFree ? 'valid-free' : 'valid-discount',
            message: validatedPromo.message,
            discountPercent: validatedPromo.discountPercent
          });
        } else {
          setPromoValidation({
            status: 'invalid',
            message: validatedPromo.message,
            discountPercent: 0,
            errorType: validatedPromo.errorType
          });

          // Get pricing for confirmation dialog
          const amount = getReportPrice({
            reportType: data.reportType,
            essenceType: data.essenceType,
            relationshipType: data.relationshipType,
            reportCategory: data.reportCategory,
            reportSubCategory: data.reportSubCategory
          });
          
          const description = getReportTitle({
            reportType: data.reportType,
            essenceType: data.essenceType,
            relationshipType: data.relationshipType,
            reportCategory: data.reportCategory,
            reportSubCategory: data.reportSubCategory
          });

          // Store submission data and show confirmation dialog
          setPendingSubmissionData({ data, basePrice: amount, description });
          setShowPromoConfirmation(true);
          setIsProcessing(false);
          return; // Don't continue with submission
        }
      }

      // Use either reportType or request field to build the complete report type
      const effectiveReportType = data.reportType || data.request || '';
      
      const completeReportType = buildCompleteReportType(
        effectiveReportType, 
        data.essenceType, 
        data.relationshipType
      );

      // Handle free report with promo code
      if (data.promoCode && validatedPromo?.isFree && validatedPromo.isValid) {
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
        
        return;
      }
      
      // Regular paid flow
      const amount = getReportPrice({
        reportType: data.reportType,
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        reportCategory: data.reportCategory,
        reportSubCategory: data.reportSubCategory
      });
      
      const description = getReportTitle({
        reportType: data.reportType,
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        reportCategory: data.reportCategory,
        reportSubCategory: data.reportSubCategory
      });

      // Apply promo code discount if valid (but not free)
      let finalAmount = amount;
      if (data.promoCode && validatedPromo?.isValid && !validatedPromo.isFree) {
        finalAmount = amount * (1 - validatedPromo.discountPercent / 100);
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
      
      const result = await initiateGuestCheckout({
        amount: finalAmount,
        email: data.email,
        description,
        reportData,
      });
      
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
    }
  };

  const handlePromoConfirmationTryAgain = () => {
    setShowPromoConfirmation(false);
    setPendingSubmissionData(null);
  };

  const handlePromoConfirmationContinue = async (setPromoValidation: (state: PromoValidationState) => void) => {
    if (!pendingSubmissionData) return;
    
    setShowPromoConfirmation(false);
    
    // Clear the promo code and continue with full payment
    const dataWithoutPromo = { ...pendingSubmissionData.data, promoCode: '' };
    
    // Reset promo validation state
    setPromoValidation({
      status: 'none',
      message: '',
      discountPercent: 0
    });
    
    // Submit without promo validation
    await submitReport(dataWithoutPromo, { status: 'none', message: '', discountPercent: 0 }, setPromoValidation, true);
    
    setPendingSubmissionData(null);
  };

  return {
    isProcessing,
    isPricingLoading,
    reportCreated,
    submitReport,
    showPromoConfirmation,
    pendingSubmissionData,
    handlePromoConfirmationTryAgain,
    handlePromoConfirmationContinue
  };
};
