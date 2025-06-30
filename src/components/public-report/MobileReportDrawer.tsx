
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { reportSchema } from '@/schemas/report-form-schema';
import { ReportFormData } from '@/types/public-report';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);
  
  // Use the same promo validation as desktop
  const { promoValidation: rawPromoValidation } = usePromoValidation();
  
  // Convert to the state format expected by useReportSubmission
  const [promoValidation, setPromoValidation] = useState<PromoValidationState>({
    status: 'none',
    message: '',
    discountPercent: 0
  });

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

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  const { isProcessing, submitReport, reportCreated } = useReportSubmission();

  const reportType = watch('reportType');

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setShowSuccess(false);
    setSubmittedData(null);
    setCurrentStep(1);
  };

  const onSubmit = async (data: ReportFormData) => {
    console.log('🚀 Mobile drawer form submission started');
    console.log('📝 Form data:', data);

    // Store submitted data for success screen
    setSubmittedData({
      name: data.name,
      email: data.email
    });

    // Use the same submission logic as desktop
    await submitReport(data, promoValidation, setPromoValidation);
    
    // Show success screen for free reports, paid reports will redirect to Stripe
    if (reportCreated) {
      setShowSuccess(true);
    }
  };

  const handleFormSubmit = () => {
    console.log('📋 Form submit triggered from Step3Payment');
    handleSubmit(onSubmit)();
  };

  // Progress dots
  const ProgressDots = () => (
    <div className="flex justify-center space-x-2 mb-6">
      {[1, 2, 3, 4].map((step) => (
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

  // Show success screen if report was created successfully
  if (showSuccess && submittedData) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <SuccessScreen 
              name={submittedData.name} 
              email={submittedData.email} 
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

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
                selectedReportType={reportType}
              />
            )}
            
            {currentStep === 2 && (
              <Step1_5SubCategory
                key="step1_5"
                control={control}
                onNext={nextStep}
                onPrev={prevStep}
                selectedReportType={reportType}
              />
            )}
            
            {currentStep === 3 && (
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
            
            {currentStep === 4 && (
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
