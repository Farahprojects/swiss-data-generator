// test 
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { initiateGuestCheckout } from '@/utils/guest-checkout';
import { createFreeReport, validatePromoCode } from '@/utils/promoCodeValidation';
import { buildCompleteReportType } from '@/services/report-pricing';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { ReportFormData } from '@/types/public-report';
import { logToAdmin } from '@/utils/adminLogger';

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
    
    setIsProcessing(true);
    
    try {
      // Validate promo code if present and not skipping validation
      let validatedPromo = null;
      if (data.promoCode && data.promoCode.trim() !== '' && !skipPromoValidation) {
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

          // FIXED: Get pricing with both reportType AND request field
          const formDataForPricing = {
            reportType: data.reportType,
            essenceType: data.essenceType,
            relationshipType: data.relationshipType,
            reportCategory: data.reportCategory,
            reportSubCategory: data.reportSubCategory,
            request: data.request
          };
          
          
          
          const amount = getReportPrice(formDataForPricing);
          const description = getReportTitle(formDataForPricing);

          // Store submission data and show confirmation dialog
          setPendingSubmissionData({ data, basePrice: amount, description });
          setShowPromoConfirmation(true);
          setIsProcessing(false);
          return; // Don't continue with submission
        }
      }

      const completeReportType = buildCompleteReportType(
        data.reportType, 
        data.essenceType, 
        data.relationshipType
      );

      // Handle free report with promo code
      if (data.promoCode && validatedPromo?.isFree && validatedPromo.isValid) {
        console.log('Processing free report with promo code:', data.promoCode);
        
        // FIXED: Use request field for astro data detection
        const isAstroData = data.request && data.request.trim() !== '';
        
        await logToAdmin('useReportSubmission', 'free_report', 'Processing free report', {
          isAstroData: isAstroData,
          request: data.request
        });
        
        
        const reportData = {
          reportType: isAstroData ? data.request : completeReportType,
          request: isAstroData ? data.request : '',
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

        const result = await createFreeReport(data.promoCode, reportData);
        
        setReportCreated(true);
        // Store the guest report ID for polling
        localStorage.setItem('currentGuestReportId', result.reportId);
        toast({
          title: "Free Report Created!",
          description: "Your report has been generated and will be sent to your email shortly.",
        });
        
        return;
      }
      
      // Regular paid flow - FIXED: Get pricing with both reportType AND request field
      const formDataForPricing = {
        reportType: data.reportType,
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        reportCategory: data.reportCategory,
        reportSubCategory: data.reportSubCategory,
        request: data.request
      };
      
      
      
      const amount = getReportPrice(formDataForPricing);
      const description = getReportTitle(formDataForPricing);

      // Apply promo code discount if valid (but not free)
      let finalAmount = amount;
      if (data.promoCode && validatedPromo?.isValid && !validatedPromo.isFree) {
        finalAmount = amount * (1 - validatedPromo.discountPercent / 100);
      }

      // FIXED: Use request field for astro data detection
      const isAstroData = data.request && data.request.trim() !== '';
      
      await logToAdmin('useReportSubmission', 'paid_flow', 'Processing paid report', {
        isAstroData: isAstroData,
        request: data.request,
        amount: finalAmount
      });
      
      
      const reportData = {
        reportType: isAstroData ? data.request : completeReportType,
        request: isAstroData ? data.request : '',
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
      
      
      
      await logToAdmin('useReportSubmission', 'checkout', 'Calling checkout', {
        amount: finalAmount,
        email: data.email
      });
      
      const result = await initiateGuestCheckout({
        amount: finalAmount,
        email: data.email,
        description,
        reportData,
      });
      
      await logToAdmin('useReportSubmission', 'checkout_result', 'Checkout complete', {
        success: result.success
      });
      
      if (!result.success) {
        toast({
          title: "Payment Error",
          description: result.error || "Failed to initiate checkout",
          variant: "destructive",
        });
      }
    } catch (error) {
      await logToAdmin('useReportSubmission', 'error', 'Submit error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
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
