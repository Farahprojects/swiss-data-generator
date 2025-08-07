import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';
import MobileDrawerHeader from './drawer-components/MobileDrawerHeader';
import MobileDrawerFooter from './drawer-components/MobileDrawerFooter';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import { SuccessScreen } from '@/components/public-report/SuccessScreen';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { supabase } from '@/integrations/supabase/client';
import { usePricing } from '@/contexts/PricingContext';

import { MobileDrawerProvider } from '@/contexts/MobileDrawerContext';
import { setFormMemory } from '@/utils/formMemoryCache';

interface TrustedPricingObject {
  valid: boolean;
  discount_usd: number;
  trusted_base_price_usd: number;
  final_price_usd: number;
  report_type: string;
  reason?: string;
}

interface MobileReportDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReportCreated?: (reportData: any) => void;
}

const MobileReportDrawer: React.FC<MobileReportDrawerProps> = ({
  isOpen,
  onOpenChange,
  onReportCreated
}) => {
  // Use the same form logic as desktop
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
  
  // Local processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{name: string; email: string; guestReportId: string; isLoading?: boolean} | null>(null);
  const { getReportPrice } = usePriceFetch();
  const { getPriceById } = usePricing();

  // Validate promo code (same as desktop)
  const validatePromoCode = async (promoCode: string): Promise<TrustedPricingObject> => {
    const priceIdentifier = getPriceIdentifier();
    if (!priceIdentifier) {
      return {
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: 0,
        final_price_usd: 0,
        report_type: '',
        reason: 'Invalid report type'
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: {
          promoCode: promoCode,
          basePrice: getBasePrice(),
          reportType: priceIdentifier,
          email: form.getValues('email'),
          request: form.getValues('request')
        }
      });

      if (error) {
        console.error('Promo validation error:', error);
        return {
          valid: false,
          discount_usd: 0,
          trusted_base_price_usd: getBasePrice(),
          final_price_usd: getBasePrice(),
          report_type: priceIdentifier,
          reason: 'Failed to validate promo code'
        };
      }

      return data;
    } catch (error) {
      console.error('Promo validation failed:', error);
      return {
        valid: false,
        discount_usd: 0,
        trusted_base_price_usd: getBasePrice(),
        final_price_usd: getBasePrice(),
        report_type: priceIdentifier,
        reason: 'Network error'
      };
    }
  };

  // Get base price from cached data (same as desktop)
  const getBasePrice = () => {
    const priceIdentifier = getPriceIdentifier();
    if (!priceIdentifier) return 0;
    
    const priceData = getPriceById(priceIdentifier);
    return priceData ? Number(priceData.unit_price_usd) : 0;
  };

  // Get price identifier from form data (same as desktop)
  const getPriceIdentifier = () => {
    const formData = form.getValues();
    
    // Prioritize direct reportType for unified mobile/desktop behavior
    if (formData.reportType) {
      return formData.reportType;
    }
    
    // Fallback to request field
    if (formData.request) {
      return formData.request;
    }
    
    // Legacy fallback for sub-categories
    if (formData.reportSubCategory) {
      return formData.reportSubCategory;
    }
    
    return null;
  };

  // Step management for mobile drawer
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Watch form values (same as desktop)
  const formValues = form.watch();
  const selectedReportType = watch('reportType');
  const selectedRequest = watch('request');
  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');
  const userName = watch('name');
  const userEmail = watch('email');
  
  // Determine if second person is required (same as desktop)
  const requiresSecondPerson = reportCategory === 'compatibility' || 
                               reportType?.startsWith('sync_') || 
                               request === 'sync';

  // Step progression logic (same as desktop)
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

  // Step validation for mobile drawer
  const step1Valid = !!reportCategory;
  const step1_5Valid = reportCategory === 'astro-data' 
    ? !!formValues.request 
    : !!formValues.reportSubCategory;
  const step2Valid = step2Done;
  const step3Valid = isValid;

  // Determine if we can go to next step
  const canGoNext = () => {
    switch (currentStep) {
      case 1: return step1Valid;
      case 2: return step1_5Valid;
      case 3: return step2Valid;
      case 4: return step3Valid;
      default: return false;
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset form utility
  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
  };

  // Direct submission to initiate-report-flow
  const handleDirectSubmission = async (formData: ReportFormData, trustedPricing: TrustedPricingObject) => {
    setIsProcessing(true);
    
    // Transform form data to match translator edge function field names
    const transformedReportData = {
      // Keep original form fields for compatibility
      ...formData,
      
      // Add translator field names for birth data
      birth_date: formData.birthDate,
      birth_time: formData.birthTime,
      location: formData.birthLocation,
      latitude: formData.birthLatitude,
      longitude: formData.birthLongitude,
      
      // Second person fields with translator names
      second_person_birth_date: formData.secondPersonBirthDate,
      second_person_birth_time: formData.secondPersonBirthTime,
      second_person_location: formData.secondPersonBirthLocation,
      second_person_latitude: formData.secondPersonLatitude,
      second_person_longitude: formData.secondPersonLongitude,
      
      // Ensure request field is set
      request: formData.request || 'essence',
      
      // Guest flags
      is_guest: true
    };
    
    // Debug logging for mobile
    console.log('🔵 [MOBILE] Original form data:', formData);
    console.log('🔵 [MOBILE] Transformed report data:', transformedReportData);
    console.log('🔵 [MOBILE] Trusted pricing:', trustedPricing);
    console.log('🔵 [MOBILE] Email field:', transformedReportData.email);
    
    // Store name/email in memory cache
    setFormMemory(formData.name, formData.email);
    
    // Close drawer and immediately show success screen with loading state
    onOpenChange(false);
    setSuccessData({
      name: formData.name,
      email: formData.email,
      guestReportId: '', // Will be updated when API completes
      isLoading: true
    });
    setShowSuccess(true);
    
    try {
      const submissionData = {
        reportData: transformedReportData,
        trustedPricing,
        is_guest: true
      };
      
      console.log('🔵 [MOBILE] Final submission data:', submissionData);
      
      const { data, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: submissionData
      });
      
      if (error) {
        console.error('❌ [MOBILE] Report submission failed:', error);
        return;
      }
      
      console.log('✅ [MOBILE] Report submission response:', data);
      
      // Handle response
      if (data?.checkoutUrl) {
        // Paid report - redirect to Stripe
        window.location.href = data.checkoutUrl;
      } else if (data?.success || data?.guestReportId) {
        // Free report success - update success data with final guestReportId
        setSuccessData({
          name: formData.name,
          email: formData.email,
          guestReportId: data.guestReportId,
          isLoading: false
        });
        onReportCreated?.(data);
      }
      
    } catch (error) {
      console.error('❌ [MOBILE] Report submission failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle button click with promo validation
  const handleButtonClick = async () => {
    try {
      const formData = form.getValues();
      const currentPromoCode = formData.promoCode?.trim() || '';
      
      let pricingResult: TrustedPricingObject;
      
      // Only validate promo code if one is provided
      if (currentPromoCode) {
        pricingResult = await validatePromoCode(currentPromoCode);
        
        if (!pricingResult.valid) {
          form.setError('promoCode', { 
            type: 'manual', 
            message: pricingResult.reason || 'Invalid Promo Code' 
          });
          return;
        }
      } else {
        // No promo code provided - use base pricing
        const priceIdentifier = getPriceIdentifier();
        if (!priceIdentifier) {
          form.setError('promoCode', { 
            type: 'manual', 
            message: 'Invalid report type' 
          });
          return;
        }
        
        pricingResult = {
          valid: true,
          discount_usd: 0,
          trusted_base_price_usd: getBasePrice(),
          final_price_usd: getBasePrice(),
          report_type: priceIdentifier,
          reason: undefined
        };
      }

      // Clear any promo errors
      form.clearErrors('promoCode');

      // Submit directly to initiate-report-flow
      await handleDirectSubmission(formData, pricingResult);

    } catch (error) {
      console.error('❌ Pricing validation failed:', error);
      form.setError('promoCode', { 
        type: 'manual', 
        message: 'Failed to validate pricing. Please try again.' 
      });
    }
  };



  // Close drawer handler
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // If success screen should be shown, render it instead of the drawer
  if (showSuccess && successData) {
    return (
      <SuccessScreen
        name={successData.name}
        email={successData.email}
        guestReportId={successData.guestReportId}
        isLoading={successData.isLoading}
      />
    );
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-white z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 h-[96%] bg-white rounded-2xl z-[100] flex flex-col">
          
          {/* Header */}
          <MobileDrawerHeader
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={handleClose}
          />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {currentStep === 1 && (
              <Step1ReportType
                control={control}
                setValue={setValue}
                selectedCategory={reportCategory}
                onNext={nextStep}
              />
            )}

            {currentStep === 2 && (
              <>
                {reportCategory === 'astro-data' ? (
                  <Step1_5AstroData
                    control={control}
                    setValue={setValue}
                    selectedSubCategory={formValues.reportSubCategory}
                    onNext={nextStep}
                  />
                ) : (
                  <Step1_5SubCategory
                    control={control}
                    setValue={setValue}
                    selectedCategory={reportCategory}
                    selectedSubCategory={formValues.reportSubCategory}
                    onNext={nextStep}
                  />
                )}
              </>
            )}

            {currentStep === 3 && (
              <Step2BirthDetails
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                onNext={nextStep}
              />
            )}

            {currentStep === 4 && (
              <Step3Payment
                register={register}
                watch={watch}
                errors={errors}
                isProcessing={isProcessing}
                onTimeoutChange={() => {}}
              />
            )}
          </div>

          {/* Footer */}
          <MobileDrawerFooter
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrevious={prevStep}
            onNext={nextStep}
            onSubmit={handleButtonClick}
            canGoNext={canGoNext() as boolean}
            isProcessing={isProcessing}
            isLastStep={currentStep === 4}
          />

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default MobileReportDrawer;