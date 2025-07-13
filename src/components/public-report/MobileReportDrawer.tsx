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
import { clearGuestReportId, getGuestReportId } from '@/utils/urlHelpers';
import { useGuestReportData } from '@/hooks/useGuestReportData';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2BirthDetails from './drawer-steps/Step2BirthDetails';
import Step3Payment from './drawer-steps/Step3Payment';
import SuccessScreen from './SuccessScreen';
import { ReportViewer } from './ReportViewer';
import { mapReportPayload } from '@/utils/mapReportPayload';
import { ReportFormData } from '@/types/public-report';

/**
 * MobileReportDrawer – end‑to‑end drawer flow optimised for mobile browsers.
 *
 * Tweaks:
 *   • keyboard‑safe vh workaround (footer stable)
 *   • footer height reduced (p‑2) so it feels lighter on mobile
 *   • dynamic scroll‑padding still follows footer height
 */

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

interface MobileReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrawerView = 'form' | 'success' | 'report-viewer';

const MobileReportDrawer = ({ isOpen, onClose }: MobileReportDrawerProps) => {
  const [currentView, setCurrentView] = useState<DrawerView>('form');
  const [submittedData, setSubmittedData] = useState<{ name: string; email: string } | null>(null);

  const footerRef = useRef<HTMLDivElement>(null);

  useSmoothScrollPolyfill();
  useBodyScrollLock(isOpen);

  const urlGuestId = getGuestReportId();
  const { data: guestReportData, isLoading: isLoadingReport, error: reportError } = useGuestReportData(urlGuestId);

  const { form, currentStep, nextStep, prevStep } = useMobileDrawerForm();
  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = form;
  const { isProcessing, submitReport } = useReportSubmission();
  const { promoValidation, isValidatingPromo } = usePromoValidation();

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const request = watch('request');

  /** Keyboard‑safe vh variable */
  useEffect(() => {
    if (!isBrowser) return;
    const THRESHOLD = 150;
    const setVH = (h: number) => document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
    setVH(window.innerHeight);
    const handleResize = () => {
      const lost = window.innerHeight - window.visualViewport.height;
      if (lost > THRESHOLD) return; // Ignore keyboard
      setVH(window.visualViewport.height);
    };
    window.addEventListener('orientationchange', () => setVH(window.innerHeight));
    window.visualViewport?.addEventListener('resize', handleResize, { passive: true });
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: 0, behavior: 'smooth' });
      const firstFocusable = container.querySelector<HTMLElement>('input, select, textarea');
      if (firstFocusable) {
        firstFocusable.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen || !isBrowser) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const status = params.get('status');
    if (sessionId && status === 'success') {
      const email = params.get('email') || localStorage.getItem('pending_report_email');
      if (email) {
        setSubmittedData({ name: 'Customer', email });
        setCurrentView('success');
        window.history.replaceState({}, document.title, window.location.pathname);
        localStorage.removeItem('pending_report_email');
      }
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!footerRef.current) return;
    const setSpace = () => document.documentElement.style.setProperty('--footer-space', `${footerRef.current!.offsetHeight}px`);
    setSpace();
    const ro = new ResizeObserver(setSpace);
    ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, [currentStep]);

  const resetDrawer = () => {
    onClose();
    form.reset();
    setCurrentView('form');
    setSubmittedData(null);
    clearGuestReportId();
  };

  const promoValidationState = useMemo(() => ({
    status: promoValidation?.isValid ? (promoValidation.isFree ? 'valid-free' : 'valid-discount') : promoValidation ? 'invalid' : 'none',
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

  const handleViewReport = () => setCurrentView('report-viewer');
  const handleBackFromReport = () => resetDrawer();

  const handleStep3Continue = () => {
    const isCompatibility = reportCategory === 'compatibility' || request === 'sync';
    const required: { name: keyof ReportFormData }[] = [
      { name: 'name' },
      { name: 'email' },
      { name: 'birthDate' },
      { name: 'birthTime' },
      { name: 'birthLocation' },
    ];
    if (isCompatibility) {
      required.push(
        { name: 'secondPersonName' },
        { name: 'secondPersonBirthDate' },
        { name: 'secondPersonBirthTime' },
        { name: 'secondPersonBirthLocation' },
      );
    }
    const missing = required.filter((f) => !watch(f.name));
    if (missing.length) {
      const el = document.querySelector(`#${missing[0].name}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (el as HTMLInputElement | null)?.focus?.();
      return;
    }
    nextStep();
  };

  const ProgressDots = () => (
    <div className="flex justify-center space-x-2 mb-3" aria-hidden="true">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={`w-2 h-2 rounded-full transition-colors duration-200 ${s === currentStep ? 'bg-primary' : s < currentStep ? 'bg-primary/60' : 'bg-gray-300'}`} />
      ))}
    </div>
  );

  return (
    <Drawer open={isOpen} onOpenChange={resetDrawer} dismissible={false}>
      <DrawerContent
        className="flex flex-col rounded-none [&>div:first-child]:hidden"
        style={{ height: 'calc(var(--vh,1vh)*100)', maxHeight: 'calc(var(--vh,1vh)*100)', overflowY: currentView === 'form' ? 'hidden' : 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'none', touchAction: 'manipulation' }}
      >
        <button
          type="button"
          onClick={resetDrawer}
          aria-label="Close report drawer"
          className="absolute top-[calc(env(safe
