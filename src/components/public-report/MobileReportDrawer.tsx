import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';
import MobileDrawerHeader from './drawer-components/MobileDrawerHeader';
import MobileDrawerFooter from './drawer-components/MobileDrawerFooter';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2PersonA from './drawer-steps/Step2PersonA';
import Step2PersonB from './drawer-steps/Step2PersonB';
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
  const { getReportPrice } = usePriceFetch();
  const { getPriceById } = usePricing();

  // Instrumented onOpenChange handler
  const handleOpenChange = (open: boolean) => {
    if (!open && isOpen) {
      // T3 - onCloseBegin
      const T3 = Date.now();
      console.log('🔍 [DIAGNOSTIC] T3 - onCloseBegin:', { label: 'T3', ts: T3, status: 'drawer_closing' });
      
      // Use setTimeout to simulate onCloseComplete (T4)
      setTimeout(() => {
        const T4 = Date.now();
        console.log('🔍 [DIAGNOSTIC] T4 - onCloseComplete:', { label: 'T4', ts: T4, status: 'drawer_closed' });
      }, 300); // Assume 300ms animation duration
    }
    
    onOpenChange(open);
  };

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
  const totalSteps = 5;

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

  // Step progression logic for new 5-step structure
  const step1Done = Boolean(formValues.reportType || formValues.request);
  const step2Done = step1Done && Boolean(
    formValues.name &&
    formValues.email &&
    formValues.birthDate &&
    formValues.birthTime &&
    formValues.birthLocation
  );
  const step3Done = step2Done && (!requiresSecondPerson || (
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
  const step3Valid = step3Done;
  const step4Valid = isValid;

  // Determine if we can go to next step
  const canGoNext = () => {
    switch (currentStep) {
      case 1: return step1Valid;
      case 2: return step1_5Valid;
      case 3: return step2Valid;
      case 4: 
        if (requiresSecondPerson) {
          return step3Valid; // Person B validation
        } else {
          return step4Valid; // Payment validation (skipped Person B)
        }
      case 5: 
        if (requiresSecondPerson) {
          return step4Valid; // Payment validation
        } else {
          return false; // Should not reach here for non-compatibility reports
        }
      default: return false;
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps && canGoNext()) {
      // Skip Person B step for non-compatibility reports
      if (currentStep === 3 && !requiresSecondPerson) {
        setCurrentStep(5); // Skip to payment step
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Handle going back from payment step for non-compatibility reports
      if (currentStep === 5 && !requiresSecondPerson) {
        setCurrentStep(3); // Go back to Person A step
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  // Reset form utility
  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
  };

  // Direct submission to initiate-report-flow
  const handleDirectSubmission = async (formData: ReportFormData, trustedPricing: TrustedPricingObject) => {
    const T0 = Date.now(); // T0 before making the fetch
    console.log('🔍 [DIAGNOSTIC] T0 - Before fetch:', { label: 'T0', ts: T0, status: 'starting' });
    
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
    
    // T2 - Call closeDrawer()
    const T2 = Date.now();
    console.log('🔍 [DIAGNOSTIC] T2 - Call closeDrawer:', { label: 'T2', ts: T2, durationFromT0: T2 - T0 });
    onOpenChange(false);
    
    try {
      const submissionData = {
        reportData: transformedReportData,
        trustedPricing,
        is_guest: true
      };
      
      console.log('🔵 [MOBILE] Final submission data:', submissionData);
      
      // Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      let retryCount = 0;
      const maxRetries = 1;
      let lastError;
      
      while (retryCount <= maxRetries) {
        try {
          const { data, error } = await supabase.functions.invoke('initiate-report-flow', {
            body: submissionData
          });
          
          clearTimeout(timeoutId);
          
          // T1 - Immediately after fetch() returns HTTP status
          const T1 = Date.now();
          console.log('🔍 [DIAGNOSTIC] T1 - HTTP response:', { 
            label: 'T1', 
            ts: T1, 
            status: error ? 'error' : 'success',
            httpStatus: error ? error.status : 200,
            durationFromT0: T1 - T0,
            retryCount
          });
          
          if (error) {
            console.error('❌ [MOBILE] Report submission failed:', error);
            lastError = error;
            
            if (retryCount < maxRetries) {
              retryCount++;
              const backoffDelay = retryCount === 1 ? 300 : 900; // 300ms then 900ms
              console.log(`🔄 [MOBILE] Retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue;
            }
            return;
          }
          
          console.log('✅ [MOBILE] Report submission response:', data);
          
          // Handle response
          if (data?.checkoutUrl) {
            // Paid report - redirect to Stripe
            window.location.href = data.checkoutUrl;
          } else if (data?.success || data?.guestReportId) {
            // Free report success 
            onReportCreated?.(data);
          }
          
          break; // Success, exit retry loop
          
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          lastError = fetchError;
          
          if (fetchError.name === 'AbortError') {
            console.error('❌ [MOBILE] Request timeout after 10s');
            break;
          }
          
          if (retryCount < maxRetries) {
            retryCount++;
            const backoffDelay = retryCount === 1 ? 300 : 900;
            console.log(`🔄 [MOBILE] Retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
          
          console.error('❌ [MOBILE] Report submission failed after retries:', fetchError);
          break;
        }
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


  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
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
              <Step2PersonA
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                onNext={nextStep}
              />
            )}

            {currentStep === 4 && (
              <>
                {requiresSecondPerson ? (
                  <Step2PersonB
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                    onNext={nextStep}
                  />
                ) : (
                  <Step3Payment
                    register={register}
                    watch={watch}
                    errors={errors}
                    isProcessing={isProcessing}
                    onTimeoutChange={() => {}}
                  />
                )}
              </>
            )}

            {currentStep === 5 && (
              <>
                {requiresSecondPerson ? (
                  <Step3Payment
                    register={register}
                    watch={watch}
                    errors={errors}
                    isProcessing={isProcessing}
                    onTimeoutChange={() => {}}
                  />
                ) : null}
              </>
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
            isLastStep={requiresSecondPerson ? currentStep === 5 : currentStep === 4}
          />

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default MobileReportDrawer;