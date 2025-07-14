// ✅ CLEANED & PATCHED VERSION: MobileReportDrawer.tsx
// - Scroll interference fixed
// - Bloat removed
// - Google Autocomplete bug resolved

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMobileDrawerForm } from '@/hooks/useMobileDrawerForm';
import { useReportSubmission } from '@/hooks/useReportSubmission';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';
import { getGuestReportId, clearAllSessionData } from '@/utils/urlHelpers';
import { handlePaymentSubmission } from '@/utils/paymentSubmissionHelper';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import { ReportViewer } from './ReportViewer';
import { ReportFormData } from '@/types/public-report';
import { MappedReport } from '@/types/mappedReport';
import { mapReportPayload } from '@/utils/mapReportPayload';

const isBrowser = typeof window !== 'undefined';

const MobileReportDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const isMobile = useIsMobile();
  const topSafePadding = useMobileSafeTopPadding();

  const [currentView, setCurrentView] = useState<'form' | 'success' | 'report'>('form');
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);
  const [mappedReport, setMappedReport] = useState<MappedReport | null>(null);
  const [viewingReport, setViewingReport] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const urlGuestId = getGuestReportId();
  const { data: guestReportData } = useGuestReportData(urlGuestId);

  useEffect(() => {
    if (urlGuestId && guestReportData) {
      const data = guestReportData.guest_report?.report_data;
      if (data) {
        setSubmittedData({ name: data.name || 'Guest', email: data.email || '' });
        setCurrentView('success');
      }
    }
  }, [urlGuestId, guestReportData]);

  const { form, currentStep, nextStep, prevStep } = useMobileDrawerForm();
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;

  const { isProcessing, submitReport } = useReportSubmission();
  const { promoValidation, isValidatingPromo, validatePromoManually, resetValidation } = usePromoValidation();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const request = watch('request');

  const promoValidationState = useMemo(() => ({
    status: (promoValidation?.isValid ? (promoValidation.isFree ? 'valid-free' : 'valid-discount') : promoValidation ? 'invalid' : 'none') as 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid',
    message: promoValidation?.message || '',
    discountPercent: promoValidation?.discountPercent || 0,
  }), [promoValidation]);

  const onSubmit = async (data: ReportFormData) => {
    setSubmittedData({ name: data.name, email: data.email });
    localStorage.setItem('autoOpenModal', 'true');
    await submitReport(data, promoValidationState, resetValidation);
    setCurrentView('success');
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

  const handleViewReport = () => {
    if (guestReportData) {
      const rawPayload = {
        guest_report: guestReportData,
        report_content: guestReportData.report_content,
        swiss_data: guestReportData.swiss_data,
        metadata: guestReportData.metadata
      };
      const mappedReportData = mapReportPayload(rawPayload);
      setMappedReport(mappedReportData);
      setViewingReport(true);
      setCurrentView('report');
    }
  };

  const resetDrawer = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    setSubmittedData(null);
    clearAllSessionData();
  };

  if (!isMobile) return null;

  return (
    <>
      <Drawer open={isOpen && currentView !== 'report'} onOpenChange={resetDrawer} dismissible={false}>
        <DrawerContent className="flex flex-col rounded-none h-screen max-h-screen">
          {currentView === 'form' && (
            <div className="flex flex-col h-full">
              <DrawerHeader className="pb-2 px-4" style={{ paddingTop: `${topSafePadding + 24}px` }}>
                <DrawerTitle className="sr-only">Report Request</DrawerTitle>
              </DrawerHeader>
              <div
                ref={scrollContainerRef}
                className="flex-1 px-6 overflow-y-auto scrollbar-hide pb-[calc(var(--footer-h)+env(safe-area-inset-bottom,0px))]"
              >
                {(() => {
                  switch (currentStep) {
                    case 1:
                      return <Step1ReportType control={control} setValue={setValue} onNext={nextStep} selectedCategory={reportCategory} />;
                    case 2:
                      return reportCategory === 'astro-data'
                        ? <Step1_5AstroData control={control} setValue={setValue} onNext={nextStep} selectedSubCategory={request} />
                        : <Step1_5SubCategory control={control} setValue={setValue} onNext={nextStep} onPrev={prevStep} selectedCategory={reportCategory} selectedSubCategory={reportSubCategory} />;
                    case 3:
                      return <Step2BirthDetails register={register} setValue={setValue} watch={watch} errors={errors} />;
                    case 4:
                      return <Step3Payment register={register} watch={watch} errors={errors} isProcessing={isProcessing} promoValidation={promoValidationState} isValidatingPromo={isValidatingPromo} />;
                    default:
                      return null;
                  }
                })()}
              </div>
            </div>
          )}

          {currentView === 'success' && submittedData && (
            <div className="flex flex-col h-full pt-12">
              <SuccessScreen
                name={submittedData.name}
                email={submittedData.email}
                onViewReport={handleViewReport}
                guestReportId={getGuestReportId() || undefined}
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
