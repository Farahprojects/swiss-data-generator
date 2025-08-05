import React from 'react';
import { Drawer } from 'vaul';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
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
  const {
    form,
    currentStep,
    nextStep,
    prevStep,
    resetForm,
  } = useMobileDrawerForm();

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isValid } } = form;
  
  const {
    submitReport,
    isProcessing,
    reportCreated
  } = useReportSubmission();

  const { getReportPrice } = usePriceFetch();

  // Watch form values for step validation
  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const name = watch('name');
  const email = watch('email');
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');
  const birthLocation = watch('birthLocation');
  const secondPersonName = watch('secondPersonName');
  const secondPersonBirthDate = watch('secondPersonBirthDate');
  const secondPersonBirthTime = watch('secondPersonBirthTime');
  const secondPersonBirthLocation = watch('secondPersonBirthLocation');
  const reportType = watch('reportType');
  const request = watch('request');

  // Step validation logic
  const step1Valid = !!reportCategory;
  
  const step1_5Valid = !!reportSubCategory;
  
  const requiresSecondPerson = reportType === 'compatibility' || request === 'sync';
  const step2Valid = !!(name && email && birthDate && birthTime && birthLocation) &&
    (!requiresSecondPerson || !!(secondPersonName && secondPersonBirthDate && secondPersonBirthTime && secondPersonBirthLocation));
  
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

  // Handle form submission
  const onSubmit = async (data: any) => {
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
      
      const result = await submitReport(data, trustedPricing);
      if (result && onReportCreated) {
        onReportCreated(result);
      }
    } catch (error) {
      console.error('Report submission failed:', error);
    }
  };

  // Close drawer handler
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Show success screen if report was created
  if (reportCreated) {
    const guestReportId = localStorage.getItem('currentGuestReportId');
    return (
      <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 h-[96%] bg-white rounded-t-2xl z-[100] overflow-hidden">
            <div className="h-full overflow-y-auto">
              <SuccessScreen 
                name={name || ''}
                email={email || ''}
                guestReportId={guestReportId || undefined}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 h-[96%] bg-white rounded-t-2xl z-[100] flex flex-col">
          
          {/* Header */}
          <MobileDrawerHeader
            currentStep={currentStep}
            totalSteps={4}
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
                    selectedSubCategory={reportSubCategory}
                    onNext={nextStep}
                  />
                ) : (
                  <Step1_5SubCategory
                    control={control}
                    setValue={setValue}
                    selectedCategory={reportCategory}
                    selectedSubCategory={reportSubCategory}
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
            totalSteps={4}
            onPrevious={prevStep}
            onNext={nextStep}
            onSubmit={handleSubmit(onSubmit)}
            canGoNext={canGoNext()}
            isProcessing={isProcessing}
            isLastStep={currentStep === 4}
          />

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default MobileReportDrawer;