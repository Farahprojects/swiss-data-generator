import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from 'react';
import { AnimatePresence } from 'framer-motion';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import { clearAllSessionData, getGuestReportId } from '@/utils/urlHelpers';
import { handlePaymentSubmission } from '@/utils/paymentSubmissionHelper';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import { ReportViewer } from './ReportViewer';
import { ReportFormData } from '@/types/public-report';
import { MappedReport } from '@/types/mappedReport';

/**
 * MobileReportDrawer – end‑to‑end drawer flow optimised for mobile browsers.
 *
 * Key production‑readiness tweaks:
 *   • keyboard‑safe 100 vh workaround (footer no longer jumps)
 *   • dynamic scroll‑padding that always matches footer height
 *   • smooth‑scroll polyfill on legacy browsers only
 *   • body‑scroll lock while drawer is open
 */

// ---------- Helpers -------------------------------------------------------
const isBrowser = typeof window !== 'undefined';

// Smooth‑scroll polyfill (legacy Safari / Android 9)
const useSmoothScrollPolyfill = () => {
  useEffect(() => {
    if (!isBrowser) return;
    (async () => {
      try {
        const { polyfill } = await import('smoothscroll-polyfill');
        polyfill();
      } catch {
        /* silent fail */
      }
    })();
  }, []);
};

// Prevent background scroll when drawer is open
const useBodyScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!isBrowser) return;
    document.body.classList.toggle('drawer-scroll-lock', active);
    return () => document.body.classList.remove('drawer-scroll-lock');
  }, [active]);
};

// -------------------------------------------------------------------------
interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrawerView = 'form' | 'success' | 'report';

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  // ------------------------------ State ----------------------------------
  const [currentView, setCurrentView] = useState<DrawerView>('form');
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [modalTriggered, setModalTriggered] = useState(false); // Prevent multiple modal opens like desktop
  
  // Mobile Report Viewer State (matches desktop)
  const [viewingReport, setViewingReport] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportPdf, setReportPdf] = useState<string | null>(null);
  const [swissData, setSwissData] = useState<any>(null);
  const [hasReport, setHasReport] = useState<boolean>(false);
  const [swissBoolean, setSwissBoolean] = useState<boolean>(false);
  const [reportType, setReportType] = useState<string>('');

  const footerRef = useRef<HTMLDivElement>(null);

  // ----------------------------- Hooks -----------------------------------
  useSmoothScrollPolyfill();
  useBodyScrollLock(isOpen);
  const isMobile = useIsMobile();

  // Auto-open drawer and switch to success when guest report data is available (deep linking)
  const urlGuestId = getGuestReportId();
  const { data: guestReportData, isLoading: isLoadingGuestData } = useGuestReportData(urlGuestId);
  
  useEffect(() => {
    if (urlGuestId && guestReportData && !isLoadingGuestData) {
      // Extract real user data from the guest report
      const reportData = guestReportData.guest_report?.report_data;
      const realName = reportData?.name || 'Guest';
      const realEmail = reportData?.email || 'guest@example.com';
      
      setCurrentView('success');
      setSubmittedData({ name: realName, email: realEmail });
    }
  }, [urlGuestId, guestReportData, isLoadingGuestData]);

  const { form, currentStep, nextStep, prevStep } = useMobileDrawerForm();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = form;

  const { isProcessing, submitReport } = useReportSubmission();
  const { promoValidation, isValidatingPromo, validatePromoManually, resetValidation } = usePromoValidation();
  const [isLocalProcessing, setIsLocalProcessing] = useState(false);

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const request = watch('request');

  // --------------- Modern viewport height with minimal JS -----------------
  useEffect(() => {
    if (!isBrowser || !window.visualViewport) return;

    // Only set fallback for older browsers that don't support modern viewport units
    const setVH = (h: number) =>
      document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);

    // Initial setup for fallback
    setVH(window.innerHeight);

    // Only handle orientation changes for fallback browsers
    const handleOrientationChange = () => setVH(window.innerHeight);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // ----------------------------- Auto‑scroll -----------------------------
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: 0, behavior: 'smooth' });

      // Only focus actual form inputs, not selection buttons
      const firstFocusable = container.querySelector<HTMLElement>(
        'input[type="text"], input[type="email"], input[type="date"], input[type="time"], select, textarea',
      );
      if (firstFocusable) {
        firstFocusable.scrollIntoView({ block: 'center', behavior: 'smooth' });
        // Ensure no accidental focus on interactive elements
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.tagName === 'BUTTON') {
            activeElement.blur();
          }
        }, 100);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [currentStep]);

  // --------------------- Stripe return handler ---------------------------
  useEffect(() => {
    if (!isOpen || !isBrowser) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const status = params.get('status');
    if (sessionId && status === 'success') {
      const email =
        params.get('email') || localStorage.getItem('pending_report_email');
      if (email) {
        setSubmittedData({ name: 'Customer', email });
        setCurrentView('success');
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.removeItem('pending_report_email');
      }
    }
  }, [isOpen]);

  // Auto-reopen success screen after refresh if user was previously viewing it (like desktop)
  useEffect(() => {
    if (!isOpen || !isBrowser) return;
    
    const shouldAutoOpen = localStorage.getItem('autoOpenModal') === 'true';
    const hasGuestReport = !!urlGuestId && !!guestReportData;
    
    if (shouldAutoOpen && hasGuestReport && !modalTriggered && currentView === 'success') {
      console.log('🔁 Mobile: Auto-opening report modal after refresh');
      setModalTriggered(true);
      localStorage.removeItem('autoOpenModal');
    }
  }, [isOpen, urlGuestId, guestReportData, modalTriggered, currentView]);

  // Footer height is now static via CSS variable

  // --------------------------- Helpers ----------------------------------
  const resetDrawer = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    setSubmittedData(null);
    setModalTriggered(false); // Reset modal trigger state like desktop

    clearAllSessionData(); // Clear URL and localStorage
  };

  const promoValidationState = useMemo(
    () => ({
      status: (promoValidation?.isValid
        ? promoValidation.isFree
          ? 'valid-free'
          : 'valid-discount'
        : promoValidation
        ? 'invalid'
        : 'none') as 'valid-free' | 'valid-discount' | 'invalid' | 'none' | 'validating',
      message: promoValidation?.message || '',
      discountPercent: promoValidation?.discountPercent || 0,
    }),
    [promoValidation],
  );

  const onSubmit = async (data: ReportFormData) => {
    setSubmittedData({ name: data.name, email: data.email });
    localStorage.setItem('pending_report_email', data.email);
    // Track modal view state for auto-reopen on refresh (like desktop)
    localStorage.setItem('autoOpenModal', 'true');
    await submitReport(data, promoValidationState, resetValidation);
    setCurrentView('success');
  };

  // Use the same payment submission logic as desktop
  const handleMobilePaymentSubmission = async () => {
    const formData = form.getValues();
    const promoCode = watch('promoCode') || '';
    
    await handlePaymentSubmission({
      promoCode,
      validatePromoManually,
      onSubmit: () => handleSubmit(onSubmit)(),
      setIsLocalProcessing
    });
  };

  // Mobile Report Viewer Handler (matches desktop logic)
  const handleViewReport = (
    content: string,
    pdf?: string | null,
    swissData?: any,
    hasReport?: boolean,
    swissBoolean?: boolean,
    reportType?: string
  ) => {
    console.log('📱 Mobile: Opening report viewer with data:', {
      hasContent: !!content,
      hasPdf: !!pdf,
      hasSwissData: !!swissData,
      hasReport,
      swissBoolean,
      reportType
    });
    
    // Set report data state
    setReportContent(content);
    setReportPdf(pdf);
    setSwissData(swissData);
    setHasReport(hasReport || false);
    setSwissBoolean(swissBoolean || false);
    setReportType(reportType || '');
    
    // Clear auto-open modal flag like desktop
    localStorage.removeItem('autoOpenModal');
    
    // Show report viewer
    setViewingReport(true);
    setCurrentView('report');
  };
  
  // Close report viewer and return to success screen
  const handleCloseReportViewer = () => {
    console.log('📱 Mobile: Closing report viewer');
    setViewingReport(false);
    setCurrentView('success');
    
    // Clear report state
    setReportContent('');
    setReportPdf(null);
    setSwissData(null);
    setHasReport(false);
    setSwissBoolean(false);
    setReportType('');
  };

  // Step 3 validation and auto-scroll
  const handleStep3Continue = () => {
    const reportCategory = watch('reportCategory');
    const request = watch('request');
    const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';

    // Required fields for person 1
    const requiredFields = [
      { name: 'name', label: 'Full Name' },
      { name: 'email', label: 'Email Address' },
      { name: 'birthDate', label: 'Birth Date' },
      { name: 'birthTime', label: 'Birth Time' },
      { name: 'birthLocation', label: 'Birth Location' },
    ];

    // Add second person fields for compatibility reports
    if (isCompatibilityReport) {
      requiredFields.push(
        { name: 'secondPersonName', label: 'Partner Name' },
        { name: 'secondPersonBirthDate', label: 'Partner Birth Date' },
        { name: 'secondPersonBirthTime', label: 'Partner Birth Time' },
        { name: 'secondPersonBirthLocation', label: 'Partner Birth Location' },
      );
    }

    // Check for empty fields
    const emptyFields = requiredFields.filter(
      (field) => !watch(field.name as keyof ReportFormData),
    );

    if (emptyFields.length > 0) {
      // Scroll to first empty field
      const firstEmptyField = emptyFields[0];
      const fieldElement =
        document.querySelector(`#${firstEmptyField.name}`) ||
        document.querySelector(
          `#secondPerson${firstEmptyField.name.replace('secondPerson', '')}`,
        );

      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (fieldElement as HTMLInputElement).focus?.();
      }

      // Add red highlighting to empty fields
      emptyFields.forEach((field) => {
        const element =
          document.querySelector(`#${field.name}`) ||
          document.querySelector(
            `#secondPerson${field.name.replace('secondPerson', '')}`,
          );
        if (element) {
          element.classList.add('border-red-500', 'ring-1', 'ring-red-500');
          setTimeout(() => {
            element.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
          }, 3000);
        }
      });

      return;
    }

    // All fields are filled, proceed to next step
    nextStep();
  };

  // Tailwind helper for dots
  const ProgressDots = () => (
    <div className="flex justify-center space-x-2 mb-3" aria-hidden="true">
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

  // Don't render anything on desktop
  if (!isMobile) {
    return null;
  }

  // ---------------------------------------------------------------------
  return (
    <Drawer open={isOpen} onOpenChange={resetDrawer} dismissible={false}>
      <DrawerContent
        className="flex flex-col rounded-none h-screen max-h-screen"
        style={{
          overflowY: currentView === 'form' ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          touchAction: 'manipulation',
        }}
      >

        {/* --------------------------- FORM VIEW ------------------------- */}
        {currentView === 'form' && (
          <div className="flex flex-col h-full">
            <DrawerHeader className="flex-shrink-0 pt-[calc(env(safe-area-inset-top,20px)+24px)] pb-2 px-4">
              <ProgressDots />
              <DrawerTitle className="sr-only">Report Request Flow</DrawerTitle>
            </DrawerHeader>

            {/* ----- Scroll container ---------------------------------- */}
            <div
              ref={scrollContainerRef}
              className={`flex-1 px-6 overflow-y-auto scrollbar-hide ${
                currentStep >= 1
                  ? 'pb-[calc(var(--footer-h)+env(safe-area-inset-bottom,0px))]'
                  : 'pb-6'
              }`}
            >
              
              {/* Step content */}
              {(() => {
                try {
                  if (currentStep === 1) {
                    return (
                      <Step1ReportType
                        key="step1"
                        control={control}
                        setValue={setValue}
                        onNext={nextStep}
                        selectedCategory={reportCategory}
                      />
                    );
                  }

                  if (currentStep === 2 && reportCategory === 'astro-data') {
                    return (
                      <Step1_5AstroData
                        key="step1_5_astro"
                        control={control}
                        setValue={setValue}
                        onNext={nextStep}
                        selectedSubCategory={request}
                      />
                    );
                  }

                  if (currentStep === 2 && reportCategory !== 'astro-data') {
                    return (
                      <Step1_5SubCategory
                        key="step1_5"
                        control={control}
                        setValue={setValue}
                        onNext={nextStep}
                        onPrev={prevStep}
                        selectedCategory={reportCategory}
                        selectedSubCategory={reportSubCategory}
                      />
                    );
                  }

                  if (currentStep === 3) {
                    return (
                      <Step2BirthDetails
                        key="step2"
                        register={register}
                        setValue={setValue}
                        watch={watch}
                        errors={errors}
                      />
                    );
                  }

                  if (currentStep === 4) {
                    return (
                      <Step3Payment
                        key="step3"
                        register={register}
                        watch={watch}
                        errors={errors}
                        isProcessing={isProcessing}
                        promoValidation={promoValidationState}
                        isValidatingPromo={isValidatingPromo}
                      />
                    );
                  }

                  // Fallback content showing current step state
                  return (
                    <div className="p-4 text-center">
                      <p>Current step: {currentStep} (should be 1-4)</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Category: {reportCategory || 'none'}<br/>
                        Request: {request || 'none'}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        If you see this message, check console for debugging info
                      </p>
                    </div>
                  );
                } catch (error) {
                  console.error('Step component error:', error);
                  return (
                    <div className="p-4 text-center bg-red-50 border border-red-200 rounded">
                      <p className="text-red-600">Error loading step {currentStep}</p>
                      <p className="text-sm text-red-500 mt-2">{String(error)}</p>
                    </div>
                  );
                }
              })()}
            </div>

            {/* ----------------------- FOOTER -------------------------- */}
            {currentStep >= 1 && (
              <div
                ref={footerRef}
                className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200"
                style={{
                  minHeight: 'var(--footer-h)',
                  padding: '0.75rem',
                  paddingBottom: `calc(env(safe-area-inset-bottom,0px) + 0.75rem)`,
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  zIndex: 50,
                }}
              >
                <button
                  type="button"
                  onClick={currentStep === 1 ? resetDrawer : prevStep}
                  className="w-auto min-w-fit bg-gray-100 text-gray-700 px-6 py-1 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-300 whitespace-nowrap"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {currentStep === 1 ? 'Close' : 'Back'}
                </button>
                {currentStep >= 3 && (
                  <button
                    type="button"
                    onClick={currentStep === 3 ? handleStep3Continue : handleMobilePaymentSubmission}
                    disabled={currentStep === 4 && (isProcessing || isValidatingPromo || isLocalProcessing)}
                    className="w-auto min-w-fit bg-gray-900 text-white px-8 py-1 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 whitespace-nowrap"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {currentStep === 3
                      ? 'Continue'
                      : isLocalProcessing || isProcessing
                      ? 'Processing…'
                      : isValidatingPromo
                      ? 'Validating…'
                      : 'Generate My Report'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------------------------- SUCCESS --------------------------- */}
        {currentView === 'success' && submittedData && !isLoadingGuestData && (
          <div className="flex flex-col h-full pt-12">
            <SuccessScreen
              name={submittedData.name}
              email={submittedData.email}
              onViewReport={handleViewReport}
              guestReportId={getGuestReportId() || undefined}
            />
          </div>
        )}

        {/* ------------------------- REPORT VIEWER -------------------- */}
        {currentView === 'report' && viewingReport && (
          <ReportViewer
            mappedReport={{
              reportContent,
              pdfData: reportPdf,
              swissData,
              hasReport,
              swissBoolean,
              reportType,
              customerName: submittedData?.name || 'Customer'
            } as MappedReport}
            onBack={handleCloseReportViewer}
            isMobile={true}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default MobileReportDrawer;
