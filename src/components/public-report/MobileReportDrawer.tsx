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
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import MobileReportViewer from './MobileReportViewer';
import { ReportFormData } from '@/types/public-report';

/**
 * MobileReportDrawer – end‑to‑end drawer flow optimised for mobile browsers.
 *
 * Key production‑readiness tweaks:
 *   • no hard‑coded footer height – adapts to content + safe‑area inset
 *   • dynamic scroll‑padding that always matches footer height
 *   • 100 vh bug workaround using --vh custom property
 *   • smooth‑scroll polyfill loaded on legacy browsers only
 *   • body‑scroll lock while drawer is open
 */

// ---------- Helpers -------------------------------------------------------
const isBrowser = typeof window !== 'undefined';
const getViewportHeight = () =>
  isBrowser && window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;

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

type DrawerView = 'form' | 'success' | 'report-viewer';

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  // ------------------------------ State ----------------------------------
  const [currentView, setCurrentView] = useState<DrawerView>('form');
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [reportData, setReportData] = useState<{
    content: string;
    pdfData?: string | null;
  } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  // ----------------------------- Hooks -----------------------------------
  useSmoothScrollPolyfill();
  useBodyScrollLock(isOpen);

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
  const { promoValidation, isValidatingPromo } = usePromoValidation();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const request = watch('request');

  // --------------- Viewport height CSS var (--vh) -------------------------
  useEffect(() => {
    if (!isBrowser) return;
    const updateVH = () => {
      document.documentElement.style.setProperty(
        '--vh', `${getViewportHeight() * 0.01}px`
      );
    };
    updateVH();
    window.addEventListener('resize', updateVH, { passive: true });
    window.visualViewport?.addEventListener('resize', updateVH, {
      passive: true,
    });
    return () => {
      window.removeEventListener('resize', updateVH);
      window.visualViewport?.removeEventListener('resize', updateVH);
    };
  }, []);

  // ----------------------------- Auto‑scroll -----------------------------
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: 0, behavior: 'smooth' });
      const firstFocusable = container.querySelector<HTMLElement>(
        'input, select, textarea, button:not([disabled]):not(.sr-only)'
      );
      firstFocusable?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
    return () => window.clearTimeout(t);
  }, [currentStep]);

  // ------------------------ Keyboard detection ---------------------------
  useEffect(() => {
    if (!isBrowser || !isOpen) return;
    const initial = getViewportHeight();
    const onResize = () =>
      setKeyboardVisible(initial - getViewportHeight() > 150);
    window.visualViewport?.addEventListener('resize', onResize, {
      passive: true,
    });
    return () =>
      window.visualViewport?.removeEventListener('resize', onResize);
  }, [isOpen]);

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

  // -------------------- Dynamic footer height ---------------------------
  useLayoutEffect(() => {
    if (!footerRef.current) return;
    const setSpace = () => {
      document.documentElement.style.setProperty(
        '--footer-space', `${footerRef.current!.offsetHeight}px`
      );
    };
    setSpace();
    const ro = new ResizeObserver(setSpace);
    ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, [currentStep]);

  // --------------------------- Helpers ----------------------------------
  const resetDrawer = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    setSubmittedData(null);
    setReportData(null);
    setKeyboardVisible(false);
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
    [promoValidation]
  );

  const onSubmit = async (data: ReportFormData) => {
    setSubmittedData({ name: data.name, email: data.email });
    localStorage.setItem('pending_report_email', data.email);
    await submitReport(data, promoValidationState, () => {});
    setCurrentView('success');
  };
  const handleFormSubmit = () => handleSubmit(onSubmit)();

  const handleViewReport = (
    reportContent: string,
    reportPdfData?: string | null
  ) => {
    setReportData({ content: reportContent, pdfData: reportPdfData });
    setCurrentView('report-viewer');
  };
  const handleBackFromReport = () => setCurrentView('success');

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
      { name: 'birthLocation', label: 'Birth Location' }
    ];
    
    // Add second person fields for compatibility reports
    if (isCompatibilityReport) {
      requiredFields.push(
        { name: 'secondPersonName', label: 'Partner Name' },
        { name: 'secondPersonBirthDate', label: 'Partner Birth Date' },
        { name: 'secondPersonBirthTime', label: 'Partner Birth Time' },
        { name: 'secondPersonBirthLocation', label: 'Partner Birth Location' }
      );
    }
    
    // Check for empty fields
    const emptyFields = requiredFields.filter(field => !watch(field.name as keyof ReportFormData));
    
    if (emptyFields.length > 0) {
      // Scroll to first empty field
      const firstEmptyField = emptyFields[0];
      const fieldElement = document.querySelector(`#${firstEmptyField.name}`) || 
                          document.querySelector(`#secondPerson${firstEmptyField.name.replace('secondPerson', '')}`);
      
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (fieldElement as HTMLInputElement).focus?.();
      }
      
      // Add red highlighting to empty fields
      emptyFields.forEach(field => {
        const element = document.querySelector(`#${field.name}`) || 
                       document.querySelector(`#secondPerson${field.name.replace('secondPerson', '')}`);
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

  // ---------------------------------------------------------------------
  return (
    <Drawer open={isOpen} onOpenChange={resetDrawer} dismissible={false}>
      <DrawerContent
        className={`flex flex-col rounded-none [&>div:first-child]:hidden ${
          keyboardVisible ? 'keyboard-visible' : ''
        }`}
        style={{
          height: 'calc(var(--vh, 1vh) * 100)',
          maxHeight: 'calc(var(--vh, 1vh) * 100)',
          overflowY: currentView === 'form' ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          touchAction: 'manipulation',
        }}
      >
        {/* ----- Header close button ------------------------------------- */}
        <button
          type="button"
          onClick={resetDrawer}
          aria-label="Close report drawer"
          className="absolute top-3 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* --------------------------- FORM VIEW ------------------------- */}
        {currentView === 'form' && (
          <div className="flex flex-col h-full">
            <DrawerHeader className="flex-shrink-0 pt-6 pb-2 px-4">
              <ProgressDots />
              <DrawerTitle className="sr-only">Report Request Flow</DrawerTitle>
            </DrawerHeader>

            {/* ----- Scroll container ---------------------------------- */}
            <div
              ref={scrollContainerRef}
              className={`flex-1 px-6 overflow-y-auto scrollbar-hide ${
                currentStep >= 3 ? 'pb-[calc(var(--footer-space,72px))]' : 'pb-6'
              }`}
            >
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

                {currentStep === 2 && reportCategory === 'astro-data' && (
                  <Step1_5AstroData
                    key="step1_5_astro"
                    control={control}
                    setValue={setValue}
                    onNext={nextStep}
                    selectedSubCategory={request}
                  />
                )}

                {currentStep === 2 && reportCategory !== 'astro-data' && (
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
                  />
                )}

                {currentStep === 4 && (
                  <Step3Payment
                    key="step3"
                    register={register}
                    watch={watch}
                    errors={errors}
                    isProcessing={isProcessing}
                    promoValidation={promoValidationState}
                    isValidatingPromo={isValidatingPromo}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* ----------------------- FOOTER -------------------------- */}
            {currentStep >= 3 && (
              <div
                ref={footerRef}
                className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 p-4 pb-safe flex gap-3 items-center z-50"
                style={{
                  // add OS safe area inset (iOS home gesture bar, etc.)
                  paddingBottom: `calc(env(safe-area-inset-bottom,0px) + 1rem)`,
                }}
              >
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-auto min-w-fit bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg text-base font-medium hover:bg-gray-200 transition-all duration-300"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={currentStep === 3 ? handleStep3Continue : handleFormSubmit}
                  disabled={currentStep === 4 && (isProcessing || isValidatingPromo)}
                  className="w-auto min-w-fit bg-gray-900 text-white px-8 py-2.5 rounded-lg text-base font-medium hover:bg-gray-800 transition-all duration-300 disabled:opacity-50"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {currentStep === 3
                    ? 'Continue'
                    : isProcessing
                    ? 'Processing…'
                    : isValidatingPromo
                    ? 'Validating…'
                    : 'Confirm'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------- SUCCESS --------------------------- */}
        {currentView === 'success' && submittedData && (
          <div className="flex flex-col h-full pt-12">
            <SuccessScreen
              name={submittedData.name}
              email={submittedData.email}
              onViewReport={handleViewReport}
              guestReportId={localStorage.getItem('currentGuestReportId') || undefined}
            />
          </div>
        )}

        {/* --------------------- REPORT VIEWER ------------------------- */}
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
