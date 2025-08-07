import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';
interface TrustedPricingObject {
  valid: boolean;
  discount_usd: number;
  trusted_base_price_usd: number;
  final_price_usd: number;
  report_type: string;
  reason?: string;
}
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import { SuccessScreen } from '@/components/public-report/SuccessScreen';
import { useReportModal } from '@/contexts/ReportModalContext';
import { useSessionManager } from '@/hooks/useSessionManager';

interface ReportFormProps {
  coachSlug?: string;
  themeColor?: string;
  fontFamily?: string;
  onFormStateChange?: (isValid: boolean, hasSelectedType: boolean) => void;
  onReportCreated?: (guestReportId: string, name: string, email: string) => void;
}

export const ReportForm: React.FC<ReportFormProps> = ({ 
  coachSlug,
  themeColor = '#6366F1',
  fontFamily = 'Inter',
  onFormStateChange,
  onReportCreated
}) => {
  // Core form setup
  const form = useForm<ReportFormData>({
    mode: 'onBlur',
    defaultValues: {
      reportType: '',
      reportSubCategory: '',
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
      request: '',
    },
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid } } = form;
  
  // Local processing state - this component is not being simplified yet
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Placeholder for report submission
  const submitReport = async (data: ReportFormData, pricing: TrustedPricingObject) => {
    // This component still needs to be updated separately
    console.warn('ReportForm still needs to be updated to use direct edge function calls');
    return { success: false, guestReportId: '' };
  };

  // Refs for scrolling
  const successScreenRef = useRef<HTMLDivElement>(null);
  const secondPersonRef = useRef<HTMLDivElement>(null);
  const paymentStepRef = useRef<HTMLDivElement>(null);

  // Watch form values for step progression
  const formValues = form.watch();
  const selectedReportType = watch('reportType');
  const selectedRequest = watch('request');
  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');
  const userName = watch('name');
  const userEmail = watch('email');
  
  // Determine if second person is required
  const requiresSecondPerson = reportCategory === 'compatibility' || 
                               reportType?.startsWith('sync_') || 
                               request === 'sync';

  // Step progression logic
  const step1Done = Boolean(formValues.reportType || formValues.request);

  const step2Done =
    step1Done &&
    Boolean(
      formValues.name &&
        formValues.email &&
        formValues.birthDate &&
        formValues.birthTime &&
        formValues.birthLocation,
    ) &&
    (!requiresSecondPerson || (
      formValues.secondPersonName &&
      formValues.secondPersonBirthDate &&
      formValues.secondPersonBirthTime &&
      formValues.secondPersonBirthLocation
    ));

  const shouldUnlockForm = !!(selectedReportType || selectedRequest);

  // Form state change effect
  useEffect(() => {
    onFormStateChange?.(isValid, shouldUnlockForm);
  }, [isValid, shouldUnlockForm, onFormStateChange]);

  const handleFirstPersonPlaceSelected = () => {
    const isDesktop = window.innerWidth >= 640;
    if (!isDesktop) return;
    
    setTimeout(() => {
      if (requiresSecondPerson) {
        secondPersonRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      } else {
        paymentStepRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 300);
  };

  const handleSecondPersonPlaceSelected = () => {
    const isDesktop = window.innerWidth >= 640;
    if (!isDesktop) return;
    
    setTimeout(() => {
      paymentStepRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 300);
  };

  // Form submission handlers
  const onSubmit = async (data: ReportFormData) => {
    const submissionData = coachSlug ? { ...data, coachSlug } : data;
    // This will be called by PaymentStep with the final price and promo code
  };

  const handleButtonClick = async () => {
    const formData = form.getValues();
    await onSubmit(formData);
  };

  const handleSubmitWithTrustedPricing = async (trustedPricing: TrustedPricingObject) => {
    const formData = form.getValues();
    const submissionData = coachSlug ? { ...formData, coachSlug } : formData;
    
    try {
      const result = await submitReport(submissionData, trustedPricing);
      if (result.success && result.guestReportId && userName && userEmail) {
        // Notify parent component about successful report creation
        onReportCreated?.(result.guestReportId, userName, userEmail);
      }
    } catch (error) {
      console.error('Report submission failed:', error);
    }
  };

  // Reset form utility
  const resetForm = useCallback(() => {
    form.reset();
  }, [form]);



  return (
    <div className="space-y-0" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          <ReportTypeSelector
            control={control}
            errors={errors}
            selectedReportType={selectedReportType}
            showReportGuide={false}
            setShowReportGuide={() => {}}
            setValue={setValue}
          />

          {step1Done && (
            <>
              <CombinedPersonalDetailsForm
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                onPlaceSelected={handleFirstPersonPlaceSelected}
              />

              {requiresSecondPerson && (
                <div ref={secondPersonRef}>
                  <SecondPersonForm
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                    onPlaceSelected={handleSecondPersonPlaceSelected}
                  />
                </div>
              )}
            </>
          )}

          {step2Done && (
            <div ref={paymentStepRef}>
              <PaymentStep
                register={register}
                watch={watch}
                errors={errors}
                setValue={setValue}
                onSubmit={handleButtonClick}
                onSubmitWithTrustedPricing={handleSubmitWithTrustedPricing}
                isProcessing={isProcessing}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};