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
import { useReportSubmission, TrustedPricingObject } from '@/hooks/useReportSubmission';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { supabase } from '@/integrations/supabase/client';
import { usePricing } from '@/contexts/PricingContext';
import { MobileDrawerProvider } from '@/contexts/MobileDrawerContext';

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
  
  // Report submission hook (same as desktop)
  const { isProcessing, reportCreated, submitReportAndCloseDrawer } = useReportSubmission(
    undefined, // No setCreatedGuestReportId needed for mobile
    () => onOpenChange(false),  // Pass drawer close callback
    (guestReportId, name, email) => {
      // NEW: Trigger SuccessScreen outside drawer
      onReportCreated?.({ guestReportId, name, email });
    }
  );
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
  const step1_5Valid = !!formValues.reportSubCategory;
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

  // Handle form submission with promo validation (same as desktop)
  const onSubmit = async (data: ReportFormData) => {
    try {
      // Calculate trusted pricing 
      const formData = {
        reportType: data.reportType,
        essenceType: data.essenceType,
        relationshipType: data.relationshipType,
        reportCategory: data.reportCategory,
        reportSubCategory: data.reportSubCategory,
        request: data.request
      };
      
      const price = getReportPrice(formData);
      const trustedPricing: TrustedPricingObject = {
        valid: true,
        discount_usd: 0,
        trusted_base_price_usd: price,
        final_price_usd: price,
        report_type: data.reportType || data.reportSubCategory || data.request || ''
      };
      
      const result = await submitReportAndCloseDrawer(data, trustedPricing);
      if (result && onReportCreated) {
        onReportCreated(result);
      }
    } catch (error) {
      console.error('Report submission failed:', error);
    }
  };

  // Handle button click with promo validation (same as desktop)
  const handleButtonClick = async () => {
    try {
      const formData = form.getValues();
      const currentPromoCode = formData.promoCode?.trim() || '';
      
      // Always validate promo code (even if empty) to get trusted pricing
      const pricingResult = await validatePromoCode(currentPromoCode || '');
      
      if (!pricingResult.valid) {
        // Show error in the form
        form.setError('promoCode', { 
          type: 'manual', 
          message: pricingResult.reason || 'Invalid Promo Code' 
        });
        return;
      }

      // Clear any promo errors
      form.clearErrors('promoCode');

      // Submit with trusted pricing
      const result = await submitReportAndCloseDrawer(formData, pricingResult);
      if (result && onReportCreated) {
        onReportCreated(result);
      }

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