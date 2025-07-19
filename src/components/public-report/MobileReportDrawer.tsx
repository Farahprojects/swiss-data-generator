
// ✅ CLEANED & PATCHED VERSION: MobileReportDrawer.tsx
// - Scroll interference fixed
// - Bloat removed
// - Google Autocomplete bug resolved
// - Guest ID now received as prop (no internal discovery)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';

import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';
import { useViewportHeight } from '@/hooks/useViewportHeight';
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

const isBrowser = typeof window !== 'undefined';

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guestId?: string | null;
}

const MobileReportDrawer = ({ isOpen, onClose, guestId = null }: MobileReportDrawerProps) => {
  const isMobile = useIsMobile();
  const topSafePadding = useMobileSafeTopPadding();
  // Disable dynamic viewport height for mobile drawer to prevent footer movement
  // useViewportHeight();

  const [currentView, setCurrentView] = useState<'form' | 'report'>('form');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [viewingReport, setViewingReport] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [guestReportData, setGuestReportData] = useState<any>(null);

  useEffect(() => {
    const fetchGuestData = async () => {
      if (guestId) {
        try {
          const { data, error } = await supabase
            .from('guest_reports')
            .select('*')
            .eq('id', guestId)
            .single();

          if (!error && data?.report_data) {
            setGuestReportData({ guest_report: data });
          } else {
            // Invalid token - clear it and stay on form
            clearAllSessionData();
          }
        } catch (err) {
          console.error('Failed to fetch guest data:', err);
          // Clear invalid token
          clearAllSessionData();
        }
      }
    };

    fetchGuestData();
  }, [guestId]);

  const { form, currentStep, nextStep, prevStep, resetForm, autoAdvanceAfterPlaceSelection } = useMobileDrawerForm();
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;

  // Reset drawer state when closing to ensure clean state on reopen
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

  // Validation logic for each step
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
        
        // For compatibility reports, also validate second person fields (coordinates not required for step advancement)
        const secondPersonRequiredFields = ['secondPersonName', 'secondPersonBirthDate', 'secondPersonBirthTime', 'secondPersonBirthLocation'];
        const secondPersonValid = secondPersonRequiredFields.every(field => !!watch(field as keyof ReportFormData));
        
        return firstPersonValid && secondPersonValid;
      case 4:
        return true; // Payment step - submit button handles validation
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

  const handleViewReport = async () => {
    if (!guestId) return;
    
    try {
      const { data, error } = await supabase
        .from('guest_reports')
        .select(`
          *,
          report_logs!guest_reports_report_log_id_fkey(report_text),
          translator_logs!guest_reports_translator_log_id_fkey(swiss_data)
        `)
        .eq('id', guestId)
        .single();

      if (error || !data) {
        throw new Error('Report not found');
      }

      const fetchedReportData: ReportData = {
        guest_report: data,
        report_content: data.report_logs?.report_text || null,
        swiss_data: data.translator_logs?.swiss_data || null,
        metadata: {
          is_astro_report: !!data.swiss_boolean,
          is_ai_report: !!data.is_ai_report,
          content_type: data.swiss_boolean && data.is_ai_report ? 'both' : 
                       data.swiss_boolean ? 'astro' : 
                       data.is_ai_report ? 'ai' : 'none'
        }
      };

      setReportData(fetchedReportData);
      setViewingReport(true);
      setCurrentView('report');
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
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
                                 onTimeoutChange={setHasTimedOut}
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
                      hasTimedOut={hasTimedOut}
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
