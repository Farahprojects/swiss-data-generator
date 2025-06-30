
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { X } from 'lucide-react';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import MobileReportViewer from './MobileReportViewer';
import { ReportFormData } from '@/types/public-report';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrawerView = 'form' | 'success' | 'report-viewer';

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  const [currentView, setCurrentView] = useState<DrawerView>('form');
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);
  const [reportData, setReportData] = useState<{ content: string; pdfData?: string | null } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Enhanced viewport height management with --vh custom property
  useEffect(() => {
    const updateVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    updateVH();
    window.addEventListener('resize', updateVH);
    window.addEventListener('orientationchange', updateVH);
    
    return () => {
      window.removeEventListener('resize', updateVH);
      window.removeEventListener('orientationchange', updateVH);
    };
  }, []);

  const {
    form,
    currentStep,
    nextStep,
    prevStep,
  } = useMobileDrawerForm();

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  const { isProcessing, submitReport, reportCreated } = useReportSubmission();
  const { promoValidation, isValidatingPromo } = usePromoValidation();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');

  // Enhanced keyboard detection and auto-scroll prevention
  useEffect(() => {
    let initialViewportHeight = window.innerHeight;

    const preventBrowserAutoScroll = (event: Event) => {
      // Prevent browser's default auto-scroll behavior on input focus
      event.preventDefault();
      event.stopPropagation();
    };

    const handleViewportChange = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Keyboard is likely visible if viewport shrunk significantly
      setKeyboardVisible(heightDifference > 150);
      
      // Update --vh when viewport changes
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Prevent browser auto-scroll
        preventBrowserAutoScroll(event);
        
        // Custom scroll management
        setTimeout(() => {
          target.scrollIntoView({ 
            block: 'nearest', 
            behavior: 'smooth' 
          });
        }, 100);
      }
    };

    if (isOpen) {
      // Add capture-phase event listeners
      document.addEventListener('focusin', handleFocusIn, { capture: true });
      window.addEventListener('resize', handleViewportChange);
      
      // Store initial height
      initialViewportHeight = window.innerHeight;
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn, { capture: true });
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isOpen]);

  // Check for Stripe return URL parameters
  useEffect(() => {
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const status = urlParams.get('status');
      
      if (sessionId && status === 'success') {
        console.log('🔄 Detected Stripe return with session:', sessionId);
        
        // Extract email from URL or storage if available
        const email = urlParams.get('email') || localStorage.getItem('pending_report_email');
        if (email) {
          setSubmittedData({ name: 'Customer', email });
          setCurrentView('success');
          
          // Clean up URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          localStorage.removeItem('pending_report_email');
        }
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    setSubmittedData(null);
    setReportData(null);
    setKeyboardVisible(false);
  };

  // Convert promo validation to the state format expected by useReportSubmission
  const promoValidationState = {
    status: promoValidation?.isValid 
      ? (promoValidation.isFree ? 'valid-free' : 'valid-discount')
      : (promoValidation ? 'invalid' : 'none') as 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid',
    message: promoValidation?.message || '',
    discountPercent: promoValidation?.discountPercent || 0
  };

  const setPromoValidation = () => {
    // This will be handled by the hook automatically
  };

  const onSubmit = async (data: ReportFormData) => {
    console.log('🚀 Mobile drawer form submission started');
    console.log('📝 Form data:', data);

    // Store submitted data for success screen
    setSubmittedData({
      name: data.name,
      email: data.email
    });

    // Store email for potential Stripe return
    localStorage.setItem('pending_report_email', data.email);

    // Submit the report
    await submitReport(data, promoValidationState, setPromoValidation);
    
    // Show success screen for all submissions (free reports and before Stripe redirect)
    setCurrentView('success');
  };

  const handleFormSubmit = () => {
    console.log('📋 Form submit triggered from Step3Payment');
    handleSubmit(onSubmit)();
  };

  const handleViewReport = (reportContent: string, reportPdfData?: string | null) => {
    console.log('📖 Opening report viewer');
    setReportData({ content: reportContent, pdfData: reportPdfData });
    setCurrentView('report-viewer');
  };

  const handleBackFromReport = () => {
    setCurrentView('success');
  };

  // Progress dots for form steps
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

  return (
    <Drawer open={isOpen} onOpenChange={handleClose} dismissible={false}>
      <DrawerContent 
        className={`flex flex-col rounded-none [&>div:first-child]:hidden ${
          keyboardVisible ? 'keyboard-visible' : ''
        }`}
        style={{
          height: 'calc(var(--vh, 1vh) * 100)',
          maxHeight: 'calc(var(--vh, 1vh) * 100)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          touchAction: 'manipulation',
        }}
      >
        {/* Close button - positioned absolutely in top-right */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          style={{ 
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            WebkitAppearance: 'none'
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {currentView === 'form' && (
          <div className="flex flex-col h-full">
            <DrawerHeader className="flex-shrink-0 pt-12 pb-4 px-4">
              <ProgressDots />
              <DrawerTitle className="sr-only">Report Request Flow</DrawerTitle>
            </DrawerHeader>
            
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <Step1ReportType
                    key="step1"
                    control={control}
                    setValue={setValue}
                    onNext={nextStep}
                    selectedCategory={reportCategory}
                  />
                )}
                
                {currentStep === 2 && (
                  <Step1_5SubCategory
                    key="step1_5"
                    control={control}
                    setValue={setValue}
                    onNext={nextStep}
                    onPrev={prevStep}
                    selectedCategory={reportCategory}
                    selectedSubCategory={reportSubCategory}
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
                    promoValidation={promoValidationState}
                    isValidatingPromo={isValidatingPromo}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {currentView === 'success' && submittedData && (
          <div className="flex flex-col h-full pt-12">
            <SuccessScreen 
              name={submittedData.name} 
              email={submittedData.email}
              onViewReport={handleViewReport}
            />
          </div>
        )}

        {currentView === 'report-viewer' && reportData && submittedData && (
          <div className="flex flex-col h-full">
            <MobileReportViewer
              reportContent={reportData.content}
              reportPdfData={reportData.pdfData}
              customerName={submittedData.name}
              onBack={handleBackFromReport}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;
