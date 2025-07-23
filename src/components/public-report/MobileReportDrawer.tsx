// ✅ CLEANED & PATCHED VERSION: MobileReportDrawer.tsx
// - Scroll interference fixed
// - Bloat removed
// - Google Autocomplete bug resolved
// - Guest ID now received as prop (no internal discovery)

import React, { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { useIsMobile } from '@/hooks/use-mobile';
import { clearAllSessionData } from '@/utils/urlHelpers';
import { supabase } from '@/integrations/supabase/client';

import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import { ReportViewer } from './ReportViewer';
import { ReportFormData } from '@/types/public-report';
import { ReportData } from '@/utils/reportContentExtraction';
import MobileDrawerHeader from './drawer-components/MobileDrawerHeader';
import MobileDrawerFooter from './drawer-components/MobileDrawerFooter';
import MobileFormProtector from './MobileFormProtector';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guestId?: string | null;
}

const MobileReportDrawer = ({ isOpen, onClose, guestId = null }: MobileReportDrawerProps) => {
  const isMobile = useIsMobile();

  const [currentView, setCurrentView] = useState<'form' | 'report'>('form');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [viewingReport, setViewingReport] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { form, currentStep, nextStep, prevStep, resetForm } = useMobileDrawerForm();
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;

  // Reset drawer state when closing
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);
  
  // Get form data for success screen
  const formName = watch('name') || '';
  const formEmail = watch('email') || '';

  const { 
    isProcessing, 
    submitReport, 
    reportCreated,
    inlinePromoError,
    clearInlinePromoError
  } = useReportSubmission();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const request = watch('request');

  const onSubmit = async (data: ReportFormData) => {
    await submitReport(data);
  };

  // Handle report ready from orchestrator
  const handleViewReport = (reportData: ReportData) => {
    console.log('📋 Report data received from orchestrator:', reportData);
    setReportData(reportData);
    setViewingReport(true);
    setCurrentView('report');
  };

  const canGoNext = () => {
    const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';
    
    switch (currentStep) {
      case 1:
        return !!reportCategory;
      case 2:
        return reportCategory === 'astro-data' ? !!request : !!reportSubCategory;
      case 3:
        const requiredFields = ['name', 'email', 'birthDate', 'birthTime', 'birthLocation'];
        const firstPersonValid = requiredFields.every(field => !!watch(field as keyof ReportFormData));
        
        if (!isCompatibilityReport) {
          return firstPersonValid;
        }
        
        const secondPersonRequiredFields = ['secondPersonName', 'secondPersonBirthDate', 'secondPersonBirthTime', 'secondPersonBirthLocation'];
        const secondPersonValid = secondPersonRequiredFields.every(field => !!watch(field as keyof ReportFormData));
        
        return firstPersonValid && secondPersonValid;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      nextStep();
    }
  };

  const handleSubmitForm = () => {
    handleSubmit(onSubmit)();
  };

  const resetDrawer = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    clearAllSessionData();
  };

  if (!isMobile) return null;

  return (
    <>
      <Drawer open={isOpen && currentView !== 'report'} onOpenChange={resetDrawer} dismissible={false}>
        <DrawerContent className="flex flex-col rounded-none" style={{ height: '100vh' }}>
          {currentView === 'form' && !reportCreated && (
              <div className="flex flex-col h-full">
                <MobileDrawerHeader 
                  currentStep={currentStep}
                  totalSteps={4}
                  onClose={resetDrawer}
                />
                <div className="flex-1 flex flex-col min-h-0">
                  <div
                    ref={scrollContainerRef}
                    className="flex-1 px-6 overflow-y-auto scrollbar-hide"
                  >
                    <MobileFormProtector isOpen={isOpen}>
                      {(() => {
                        switch (currentStep) {
                          case 1:
                            return <Step1ReportType control={control} setValue={setValue} selectedCategory={reportCategory} onNext={handleNext} />;
                          case 2:
                            return reportCategory === 'astro-data'
                              ? <Step1_5AstroData control={control} setValue={setValue} selectedSubCategory={request} onNext={handleNext} />
                              : <Step1_5SubCategory control={control} setValue={setValue} selectedCategory={reportCategory} selectedSubCategory={reportSubCategory} onNext={handleNext} />;
                           case 3:
                            return <Step2BirthDetails register={register} setValue={setValue} watch={watch} errors={errors} onNext={handleNext} />;
                           case 4:
                               return <Step3Payment 
                                 register={register} 
                                 watch={watch} 
                                 errors={errors} 
                                 isProcessing={isProcessing} 
                                 inlinePromoError={inlinePromoError}
                                 clearInlinePromoError={clearInlinePromoError}
                               />;
                          default:
                            return null;
                        }
                      })()}
                    </MobileFormProtector>
                  </div>
                  <div className="flex-shrink-0">
                    <MobileDrawerFooter
                      currentStep={currentStep}
                      totalSteps={4}
                      onPrevious={prevStep}
                      onNext={handleNext}
                      onSubmit={handleSubmitForm}
                      canGoNext={canGoNext()}
                      isProcessing={isProcessing}
                      isLastStep={currentStep === 4}
                    />
                  </div>
                </div>
              </div>
          )}

          {reportCreated && (
            <div className="flex flex-col h-full">
              <MobileFormProtector isOpen={isOpen}>
                <SuccessScreen
                  name={formName}
                  email={formEmail}
                  onViewReport={handleViewReport}
                  guestReportId={guestId || undefined}
                />
              </MobileFormProtector>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {currentView === 'report' && viewingReport && reportData && (
        <ReportViewer
          reportData={reportData}
          onBack={() => {
            setViewingReport(false);
            setTimeout(() => resetDrawer(), 50);
          }}
          isMobile={true}
          onResetMobileState={resetDrawer}
        />
      )}
    </>
  );
};

export default MobileReportDrawer;
