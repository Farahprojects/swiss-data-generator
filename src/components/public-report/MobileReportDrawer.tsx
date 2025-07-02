import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
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

// --- Utility helpers -------------------------------------------------------
const isBrowser = typeof window !== 'undefined';
const getViewportHeight = () =>
  isBrowser && window.visualViewport ? window.visualViewport.height : window.innerHeight;

/**
 * Ensure smooth‑scroll behaviour on legacy Safari / Android browsers.
 * Loaded once on mount – dynamic import keeps bundle size low for modern browsers.
 */
const useSmoothScrollPolyfill = () => {
  useEffect(() => {
    if (!isBrowser) return;
    (async () => {
      try {
        const { polyfill } = await import('smoothscroll-polyfill');
        polyfill();
      } catch (_) {
        /* no‑op – polyfill failed, continue without smooth scroll */
      }
    })();
  }, []);
};

/**
 * Locks <body> scroll to prevent background interaction while the drawer is open.
 */
const useBodyScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!isBrowser) return;
    if (active) {
      document.body.classList.add('drawer-scroll-lock');
    } else {
      document.body.classList.remove('drawer-scroll-lock');
    }
    return () => document.body.classList.remove('drawer-scroll-lock');
  }, [active]);
};

// ---------------------------------------------------------------------------
const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  // ---------------------------------- State --------------------------------
  const [currentView, setCurrentView] = useState<DrawerView>('form');
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);
  const [reportData, setReportData] = useState<{ content: string; pdfData?: string | null } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // -------------------------------- Hooks ----------------------------------
  useSmoothScrollPolyfill();
  useBodyScrollLock(isOpen);

  const {
    form,
    currentStep,
    nextStep,
    prevStep,
  } = useMobileDrawerForm();

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  const { isProcessing, submitReport } = useReportSubmission();
  const { promoValidation, isValidatingPromo } = usePromoValidation();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const astroDataType = watch('astroDataType');

  // Viewport height CSS custom prop – updates on resize & orientation change
  useEffect(() => {
    if (!isBrowser) return;

    const updateVH = () => {
      const vh = getViewportHeight() * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    updateVH();
    window.addEventListener('resize', updateVH, { passive: true });
    window.visualViewport?.addEventListener('resize', updateVH, { passive: true });

    return () => {
      window.removeEventListener('resize', updateVH);
      window.visualViewport?.removeEventListener('resize', updateVH);
    };
  }, []);

  // ----------------------------- Auto‑scroll logic -------------------------
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top + center first focusable element on every step change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // 1️⃣ Reset to top so the next step never starts halfway down
      container.scrollTo({ top: 0, behavior: 'smooth' });

      // 2️⃣ Nudge the first focusable (input/select/button…) into view
      const firstFocusable = container.querySelector<HTMLElement>(
        'input, select, textarea, button:not([disabled]):not(.sr-only)'
      );
      firstFocusable?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350); // delay must exceed your <AnimatePresence> exit duration

    return () => window.clearTimeout(timer);
  }, [currentStep]);

  // --------------------------- Keyboard detection --------------------------
  useEffect(() => {
    if (!isBrowser || !isOpen) return;

    const initialHeight = getViewportHeight();

    const onVisualViewportResize = () => {
      const heightDiff = initialHeight - getViewportHeight();
      setKeyboardVisible(heightDiff > 150); // heuristic
    };

    window.visualViewport?.addEventListener('resize', onVisualViewportResize, { passive: true });

    return () => {
      window.visualViewport?.removeEventListener('resize', onVisualViewportResize);
    };
  }, [isOpen]);

  // -------------------------- Stripe return handler ------------------------
  useEffect(() => {
    if (!isOpen || !isBrowser) return;

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const status = urlParams.get('status');

    if (sessionId && status === 'success') {
      const email = urlParams.get('email') || localStorage.getItem('pending_report_email');
      if (email) {
        setSubmittedData({ name: 'Customer', email });
        setCurrentView('success');
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.removeItem('pending_report_email');
      }
    }
  }, [isOpen]);

  // ------------------------------ Helpers ----------------------------------
  const resetDrawer = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    setSubmittedData(null);
    setReportData(null);
    setKeyboardVisible(false);
  };

  const promoValidationState = useMemo(() => ({
    status: promoValidation?.isValid
      ? (promoValidation.isFree ? 'valid-free' : 'valid-discount')
      : (promoValidation ? 'invalid' : 'none') as 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid',
    message: promoValidation?.message || '',
    discountPercent: promoValidation?.discountPercent || 0,
  }), [promoValidation]);

  const onSubmit = async (data: ReportFormData) => {
    setSubmittedData({ name: data.name, email: data.email });
    localStorage.setItem('pending_report_email', data.email);
    await submitReport(data, promoValidationState, () => {});
    setCurrentView('success');
  };

  const handleFormSubmit = () => handleSubmit(onSubmit)();

  const handleViewReport = (reportContent: string, reportPdfData?: string | null) => {
    setReportData({ content: reportContent, pdfData: reportPdfData });
    setCurrentView('report-viewer');
  };

  const handleBackFromReport = () => setCurrentView('success');

  // ---------------------------- Render helpers ----------------------------
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

  const needsScrolling = currentStep >= 2; // Changed from 3 to 2 to include Step2BirthDetails

  // -------------------------------------------------------------------------
  return (
    <Drawer open={isOpen} onOpenChange={resetDrawer} dismissible={false}>
      <DrawerContent
        className={`flex flex-col rounded-none [&>div:first-child]:hidden ${keyboardVisible ? 'keyboard-visible' : ''}`}
        style={{
          height: 'calc(var(--vh, 1vh) * 100)',
          maxHeight: 'calc(var(--vh, 1vh) * 100)',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          touchAction: 'manipulation',
          paddingTop: 0,
          marginTop: 0,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={resetDrawer}
          aria-label="Close report drawer"
          className="absolute right-4 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', WebkitAppearance: 'none' }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* ------------------------------ FORM VIEW ------------------------- */}
        {currentView === 'form' && (
          <div className="flex flex-col h-full">
            <DrawerHeader className="flex-shrink-0 pt-6 pb-2 px-4">
              <ProgressDots />
              <DrawerTitle className="sr-only">Report Request Flow</DrawerTitle>
            </DrawerHeader>

            <div
              ref={scrollContainerRef}
              className={`flex-1 px-6 pb-6 ${needsScrolling ? 'overflow-y-auto' : 'flex items-center justify-center'}`}
              style={{ 
                paddingTop: currentStep === 3 ? '1rem' : undefined // Extra padding for Step2BirthDetails
              }}
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
                  <>
                    {console.log('Rendering Step1_5AstroData, reportCategory:', reportCategory, 'astroDataType:', astroDataType)}
                    <Step1_5AstroData
                      key="step1_5_astro"
                      control={control}
                      setValue={setValue}
                      onNext={nextStep}
                      selectedSubCategory={astroDataType}
                    />
                  </>
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

        {/* --------------------------- SUCCESS VIEW ------------------------- */}
        {currentView === 'success' && submittedData && (
          <div className="flex flex-col h-full pt-12">
            <SuccessScreen name={submittedData.name} email={submittedData.email} onViewReport={handleViewReport} />
          </div>
        )}

        {/* ------------------------ REPORT VIEWER -------------------------- */}
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
