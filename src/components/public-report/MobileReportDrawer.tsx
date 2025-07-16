// ✅ CLEANED & PATCHED VERSION: MobileReportDrawer.tsx
// - Scroll interference fixed
// - Bloat removed
// - Google Autocomplete bug resolved

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';
import { getGuestReportId, clearAllSessionData } from '@/utils/urlHelpers';
import { handlePaymentSubmission } from '@/utils/paymentSubmissionHelper';
import { supabase } from '@/integrations/supabase/client';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import { ReportViewer } from './ReportViewer';
import { ReportFormData } from '@/types/public-report';
import { MappedReport } from '@/types/mappedReport';
import { useSwissDataRetry } from '@/hooks/useSwissDataRetry';
import { mapReportPayload } from '@/utils/mapReportPayload';
import { saveEnrichedSwissDataToEdge } from '@/utils/saveEnrichedSwissData';
import MobileDrawerHeader from './drawer-components/MobileDrawerHeader';
import MobileDrawerFooter from './drawer-components/MobileDrawerFooter';

const isBrowser = typeof window !== 'undefined';

const MobileReportDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const isMobile = useIsMobile();
  const topSafePadding = useMobileSafeTopPadding();

  const [currentView, setCurrentView] = useState<'form' | 'report'>('form');
  const [mappedReport, setMappedReport] = useState<MappedReport | null>(null);
  const [viewingReport, setViewingReport] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const urlGuestId = getGuestReportId();
  const [guestReportData, setGuestReportData] = useState<any>(null);

  useEffect(() => {
    const fetchGuestData = async () => {
      if (urlGuestId) {
        try {
          const { data, error } = await supabase
            .from('guest_reports')
            .select('*')
            .eq('id', urlGuestId)
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
  }, [urlGuestId]);

  const { form, currentStep, nextStep, prevStep } = useMobileDrawerForm();
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  
  // Get form data for success screen
  const formName = watch('name') || '';
  const formEmail = watch('email') || '';

  const { isProcessing, submitReport, reportCreated } = useReportSubmission();
  const { promoValidation, isValidatingPromo, validatePromoManually, resetValidation } = usePromoValidation();
  
  // Add Swiss data retry mechanism
  const { retryStatus, isRetrying } = useSwissDataRetry({
    guestReportId: urlGuestId,
    enabled: isOpen && !!urlGuestId
  });

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const request = watch('request');

  const promoValidationState = useMemo(() => ({
    status: (promoValidation?.isValid ? (promoValidation.isFree ? 'valid-free' : 'valid-discount') : promoValidation ? 'invalid' : 'none') as 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid',
    message: promoValidation?.message || '',
    discountPercent: promoValidation?.discountPercent || 0,
  }), [promoValidation]);

  const onSubmit = async (data: ReportFormData) => {
    await submitReport(data, promoValidationState, resetValidation);
  };

  const handleMobilePaymentSubmission = async () => {
    const formData = form.getValues();
    const promoCode = watch('promoCode') || '';
    await handlePaymentSubmission({
      promoCode,
      validatePromoManually,
      onSubmit: () => handleSubmit(onSubmit)(),
    });
  };

  // Validation logic for each step
  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!reportCategory;
      case 2:
        return reportCategory === 'astro-data' ? !!request : !!reportSubCategory;
      case 3:
        const requiredFields = ['name', 'email', 'birthDate', 'birthTime', 'birthLocation'];
        return requiredFields.every(field => !!watch(field as keyof ReportFormData));
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
    if (!urlGuestId) return;
    
    try {
      const { data, error } = await supabase
        .from('guest_reports')
        .select(`
          *,
          report_logs!guest_reports_report_log_id_fkey(report_text),
          translator_logs!guest_reports_translator_log_id_fkey(swiss_data)
        `)
        .eq('id', urlGuestId)
        .single();

      if (error || !data) {
        throw new Error('Report not found');
      }

      const reportData = {
        guest_report: data,
        report_content: data.report_logs?.report_text || null,
        swiss_data: data.translator_logs?.swiss_data || null,
        metadata: { source: 'mobile_fetch' }
      };

      const mappedReportData = mapReportPayload(reportData);
      
      // Save enriched Swiss data to temp_report_data with retry logic
      console.log('🔍 Checking Swiss data save conditions:', {
        hasSwissData: !!mappedReportData.swissData,
        urlGuestId,
        swissDataKeys: mappedReportData.swissData ? Object.keys(mappedReportData.swissData) : []
      });
      
      if (mappedReportData.swissData && urlGuestId) {
        console.log('✅ Conditions met, fetching temp_report_data row...');
        const { data: tempRow, error: tempError } = await supabase
          .from("temp_report_data")
          .select("id, swiss_data_saved, swiss_data_save_pending, swiss_data_save_attempts")
          .eq("guest_report_id", urlGuestId)
          .single();

        console.log('🔍 Temp row query result:', { tempRow, tempError });

        if (tempRow) {
          // Only save if not already saved and not currently pending
          if (!tempRow.swiss_data_saved && !tempRow.swiss_data_save_pending) {
            console.log('📡 Calling save-swiss-data edge function...');
            try {
              const result = await saveEnrichedSwissDataToEdge({ 
                uuid: tempRow.id,
                swissData: mappedReportData.swissData,
                table: 'temp_report_data',
                field: 'swiss_data'
              });
              console.log('✅ Swiss data saved successfully:', result);
            } catch (error) {
              console.error('❌ Failed to save Swiss data:', error);
            }
          } else if (tempRow.swiss_data_saved) {
            console.log('✅ Swiss data already saved');
          } else if (tempRow.swiss_data_save_pending) {
            console.log('⏳ Swiss data save already in progress');
          }
        } else {
          console.log('❌ No temp_report_data row found for guest_report_id:', urlGuestId);
        }
      } else {
        console.log('❌ Conditions not met for Swiss data save');
      }
      
      setMappedReport(mappedReportData);
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
        <DrawerContent className="flex flex-col rounded-none h-screen max-h-screen">
          {currentView === 'form' && !reportCreated && (
            <div className="flex flex-col h-full">
              <MobileDrawerHeader 
                currentStep={currentStep}
                totalSteps={4}
                onClose={resetDrawer}
              />
              <div
                ref={scrollContainerRef}
                className="flex-1 px-6 overflow-y-auto scrollbar-hide pb-20"
              >
                {(() => {
                  switch (currentStep) {
                    case 1:
                      return <Step1ReportType control={control} setValue={setValue} selectedCategory={reportCategory} onNext={handleNext} />;
                    case 2:
                      return reportCategory === 'astro-data'
                        ? <Step1_5AstroData control={control} setValue={setValue} selectedSubCategory={request} onNext={handleNext} />
                        : <Step1_5SubCategory control={control} setValue={setValue} selectedCategory={reportCategory} selectedSubCategory={reportSubCategory} onNext={handleNext} />;
                    case 3:
                      return <Step2BirthDetails register={register} setValue={setValue} watch={watch} errors={errors} />;
                    case 4:
                      return <Step3Payment register={register} watch={watch} errors={errors} isProcessing={isProcessing} promoValidation={promoValidationState} isValidatingPromo={isValidatingPromo} />;
                    default:
                      return null;
                  }
                })()}
              </div>
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
          )}

          {reportCreated && (
            <div className="flex flex-col h-full">
              <SuccessScreen
                name={formName}
                email={formEmail}
                onViewReport={handleViewReport}
                guestReportId={getGuestReportId() || undefined}
                retryStatus={retryStatus}
                isRetrying={isRetrying}
              />
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {currentView === 'report' && viewingReport && mappedReport && (
        <ReportViewer
          mappedReport={mappedReport}
          onBack={() => {
            setViewingReport(false);
            setTimeout(() => resetDrawer(), 50);
          }}
          isMobile={true}
        />
      )}
    </>
  );
};

export default MobileReportDrawer;
