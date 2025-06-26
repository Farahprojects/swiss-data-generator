
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { useToast } from '@/hooks/use-toast';
import { initiateGuestCheckout } from '@/utils/guest-checkout';
import { createFreeReport, validatePromoCode } from '@/utils/promoCodeValidation';
import { getReportPriceAndDescription, buildCompleteReportType } from '@/services/report-pricing';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import ContactForm from '@/components/public-report/ContactForm';
import BirthDetailsForm from '@/components/public-report/BirthDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import SubmissionSection from '@/components/public-report/SubmissionSection';
import SuccessScreen from '@/components/public-report/SuccessScreen';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

interface CoachReportFormProps {
  coachSlug: string;
  coachName: string;
  customizationData: any;
}

export const CoachReportForm: React.FC<CoachReportFormProps> = ({ 
  coachSlug, 
  coachName, 
  customizationData 
}) => {
  const [showReportGuide, setShowReportGuide] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [reportCreated, setReportCreated] = useState(false);
  const [promoValidation, setPromoValidation] = useState<PromoValidationState>({
    status: 'none',
    message: '',
    discountPercent: 0
  });
  const { toast } = useToast();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: 'onBlur',
    defaultValues: {
      reportType: '',
      relationshipType: '',
      essenceType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
      birthLatitude: undefined,
      birthLongitude: undefined,
      birthPlaceId: '',
      secondPersonName: '',
      secondPersonBirthDate: '',
      secondPersonBirthTime: '',
      secondPersonBirthLocation: '',
      secondPersonLatitude: undefined,
      secondPersonLongitude: undefined,
      secondPersonPlaceId: '',
      returnYear: '',
      notes: '',
      promoCode: '',
    },
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid } } = form;
  const selectedReportType = watch('reportType');
  const userName = watch('name');
  const userEmail = watch('email');
  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const submitReport = async (data: ReportFormData) => {
    console.log('🚀 Coach report form submission started');
    console.log('📝 Form data:', data);
    
    setIsProcessing(true);
    setIsPricingLoading(true);
    
    try {
      // Validate promo code if present
      let validatedPromo = null;
      if (data.promoCode && data.promoCode.trim() !== '') {
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
            discountPercent: 0
          });
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
      
      // Regular paid flow
      const { amount, description } = await getReportPriceAndDescription(
        data.reportType, 
        data.relationshipType, 
        data.essenceType
      );
      
      setIsPricingLoading(false);

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
        coachSlug: coachSlug, // Add coach attribution
        coachName: coachName,
      };
      
      console.log('Coach report data being sent to checkout:', reportData);
      
      const result = await initiateGuestCheckout({
        amount: finalAmount,
        email: data.email,
        description: `${description} - ${coachName}`,
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
      console.error('Error processing coach report:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Coach report form submission completed');
      setIsProcessing(false);
      setIsPricingLoading(false);
    }
  };

  const onSubmit = async (data: ReportFormData) => {
    console.log('✅ Coach report form submission successful, data:', data);
    await submitReport(data);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    console.log('🖱️ Coach report button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📝 Triggering coach report form submission...');
    console.log('🔍 Current form errors:', errors);
    console.log('🔍 Form is valid:', isValid);
    
    handleSubmit(
      (data) => {
        console.log('✅ Coach report form validation passed, submitting:', data);
        onSubmit(data);
      },
      (errors) => {
        console.log('❌ Coach report form validation failed:', errors);
      }
    )(e);
  };

  if (reportCreated && userName && userEmail) {
    return <SuccessScreen name={userName} email={userEmail} />;
  }

  // Apply coach's theme colors
  const themeColor = customizationData?.themeColor || '#6366F1';
  const fontFamily = customizationData?.fontFamily || 'Inter';

  return (
    <div style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      <form onSubmit={handleSubmit(onSubmit)} className="min-h-screen">
        <ReportTypeSelector
          control={control}
          errors={errors}
          selectedReportType={selectedReportType}
          showReportGuide={showReportGuide}
          setShowReportGuide={setShowReportGuide}
        />

        {selectedReportType && (
          <ContactForm
            register={register}
            errors={errors}
          />
        )}

        {selectedReportType && (
          <BirthDetailsForm
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
          />
        )}

        {requiresSecondPerson && (
          <SecondPersonForm
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
          />
        )}

        {selectedReportType && (
          <SubmissionSection
            register={register}
            errors={errors}
            isProcessing={isProcessing}
            isPricingLoading={isPricingLoading}
            promoValidation={promoValidation}
            onButtonClick={handleButtonClick}
          />
        )}
      </form>
    </div>
  );
};
