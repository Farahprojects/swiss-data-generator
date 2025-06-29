
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import { ReportFormData } from '@/types/public-report';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  const {
    form,
    currentStep,
    nextStep,
    prevStep,
    mapCategoryToReportType,
    mapCategoryToSubType,
  } = useMobileDrawerForm();

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  const { isProcessing, submitReport } = useReportSubmission();

  const reportCategory = watch('reportCategory');

  const handleClose = () => {
    onClose();
    form.reset();
  };

  const onSubmit = async (data: any) => {
    // Map drawer form data to the expected ReportFormData format
    const mappedData: ReportFormData = {
      reportType: mapCategoryToReportType(data.reportCategory),
      ...mapCategoryToSubType(data.reportCategory),
      name: data.name,
      email: data.email,
      birthDate: data.birthDate,
      birthTime: data.birthTime,
      birthLocation: data.birthLocation,
      birthLatitude: data.birthLatitude,
      birthLongitude: data.birthLongitude,
      birthPlaceId: data.birthPlaceId,
      promoCode: data.promoCode,
      notes: data.notes,
    };

    await submitReport(mappedData, { status: 'none', message: '', discountPercent: 0 }, () => {});
    handleClose();
  };

  const handleFormSubmit = () => {
    handleSubmit(onSubmit)();
  };

  // Progress dots
  const ProgressDots = () => (
    <div className="flex justify-center space-x-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            step === currentStep
              ? 'bg-primary'
              : step < currentStep
              ? 'bg-primary/60'
              : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="h-[90vh] flex flex-col">
        <DrawerHeader className="flex-shrink-0">
          <ProgressDots />
          <DrawerTitle className="sr-only">Report Request Flow</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <Step1ReportType
                key="step1"
                control={control}
                onNext={nextStep}
                selectedCategory={reportCategory}
              />
            )}
            
            {currentStep === 2 && (
              <Step2BirthDetails
                key="step2"
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            
            {currentStep === 3 && (
              <Step3Payment
                key="step3"
                register={register}
                watch={watch}
                errors={errors}
                onPrev={prevStep}
                onSubmit={handleFormSubmit}
                isProcessing={isProcessing}
              />
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;
