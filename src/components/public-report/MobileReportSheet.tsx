import React, { useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import MobileDrawerHeader from './drawer-components/MobileDrawerHeader';
import MobileDrawerFooter from './drawer-components/MobileDrawerFooter';
import Step1ReportType from './drawer-steps/Step1ReportType';
import Step1_5SubCategory from './drawer-steps/Step1_5SubCategory';
import Step1_5AstroData from './drawer-steps/Step1_5AstroData';
import Step2PersonA from './drawer-steps/Step2PersonA';
import Step2PersonB from './drawer-steps/Step2PersonB';
import Step3Payment from './drawer-steps/Step3Payment';
import { ReportFormData } from '@/types/public-report';
import { supabase } from '@/integrations/supabase/client';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { usePricing } from '@/contexts/PricingContext';

interface MobileReportSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReportCreated?: (guestReportId: string, paymentStatus: string, name: string, email: string) => void;
}

const MobileReportSheet: React.FC<MobileReportSheetProps> = ({ isOpen, onOpenChange, onReportCreated }) => {
  const form = useForm<ReportFormData>({
    mode: 'onBlur',
    defaultValues: {
      reportType: '',
      reportSubCategory: '',
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
      request: '',
    },
  });

  const { register, setValue, control, watch, formState: { errors, isValid } } = form;
  const formValues = watch();
  const reportCategory = watch('reportCategory');
  const reportType = watch('reportType');
  const request = watch('request');

  const requiresSecondPerson = reportCategory === 'compatibility' || reportType?.startsWith('sync_') || request === 'sync';
  const totalSteps = requiresSecondPerson ? 5 : 4;
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  const nextStep = () => { if (currentStep < totalSteps) setCurrentStep(s => s + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(s => s - 1); };
  const resetForm = () => { form.reset(); setCurrentStep(1); };

  const { getReportPrice } = usePriceFetch();
  const { getPriceById } = usePricing();

  // Direct submission to initiate-report-flow
  const handleDirectSubmission = async (formData: ReportFormData, trustedPricing: TrustedPricingObject) => {
    setIsProcessing(true);
    try {
      const transformedReportData = {
        ...formData,
        birth_date: formData.birthDate,
        birth_time: formData.birthTime,
        location: formData.birthLocation,
        latitude: formData.birthLatitude,
        longitude: formData.birthLongitude,
        second_person_birth_date: formData.secondPersonBirthDate,
        second_person_birth_time: formData.secondPersonBirthTime,
        second_person_location: formData.secondPersonBirthLocation,
        second_person_latitude: formData.secondPersonLatitude,
        second_person_longitude: formData.secondPersonLongitude,
        request: formData.request || (formData.reportType?.includes('sync') ? 'sync' : 'essence'),
        is_guest: true,
      } as any;
      
      const payloadBody = {
        reportData: transformedReportData,
        trustedPricing,
        is_guest: true
      };

      const { data, error } = await supabase.functions.invoke('initiate-report-flow', {
        body: payloadBody
      });

      if (error) {
        console.error('❌ [MOBILE] Submission failed:', error);
        return;
      }
      
      const guestReportId = data?.guestReportId || null;
      const paymentStatus = data?.paymentStatus || 'pending';
      const name = data?.name || '';
      const email = data?.email || '';
      const checkoutUrl = data?.checkoutUrl || null;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return; // Redirecting, so no need to proceed
      }

      if (guestReportId) {
        onOpenChange(false);
        onReportCreated?.(guestReportId, paymentStatus, name, email);
      } else {
        console.error('❌ [MOBILE] Invalid response from server:', data);
      }

    } catch (err) {
      console.error('❌ [MOBILE] Submission exception:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriceIdentifier = () => {
    const data = form.getValues();
    if (data.reportType) return data.reportType;
    if (data.request) return data.request;
    if (data.reportSubCategory) return data.reportSubCategory;
    return null;
  };

  const getBasePrice = () => {
    const id = getPriceIdentifier();
    if (!id) return 0;
    const pd = getPriceById(id);
    return pd ? Number(pd.unit_price_usd) : 0;
  };

  type TrustedPricingObject = { valid: boolean; discount_usd: number; trusted_base_price_usd: number; final_price_usd: number; report_type: string; reason?: string };

  const validatePromoCode = async (promoCode: string): Promise<TrustedPricingObject> => {
    const id = getPriceIdentifier();
    if (!id) {
      return { valid: false, discount_usd: 0, trusted_base_price_usd: 0, final_price_usd: 0, report_type: '', reason: 'Invalid report type' };
    }
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { promoCode, basePrice: getBasePrice(), reportType: id }
      });
      if (error) return { valid: false, discount_usd: 0, trusted_base_price_usd: getBasePrice(), final_price_usd: getBasePrice(), report_type: id, reason: 'Failed to validate promo code' };
      return data as TrustedPricingObject;
    } catch {
      return { valid: false, discount_usd: 0, trusted_base_price_usd: getBasePrice(), final_price_usd: getBasePrice(), report_type: id, reason: 'Network error' };
    }
  };

  const canGoNext = useMemo(() => {
    const step1Valid = !!reportCategory;
    const step1_5Valid = reportCategory === 'astro-data' ? !!formValues.request : !!formValues.reportSubCategory;
    const step2Done = Boolean(formValues.name && formValues.email && formValues.birthDate && formValues.birthTime && formValues.birthLocation);
    const step3Done = step2Done && (!requiresSecondPerson || (formValues.secondPersonName && formValues.secondPersonBirthDate && formValues.secondPersonBirthTime && formValues.secondPersonBirthLocation));
    switch (currentStep) {
      case 1: return step1Valid;
      case 2: return step1_5Valid;
      case 3: return step2Done;
      case 4: return requiresSecondPerson ? step3Done : isValid;
      case 5: return requiresSecondPerson ? isValid : false;
      default: return false;
    }
  }, [currentStep, formValues, isValid, reportCategory, requiresSecondPerson]);

  const handleClose = () => { resetForm(); onOpenChange(false); };

  const handleButtonClick = async () => {
    try {
      const formData = form.getValues();
      const code = formData.promoCode?.trim() || '';
      let pricing: TrustedPricingObject;
      if (code) {
        pricing = await validatePromoCode(code);
        if (!pricing.valid) { form.setError('promoCode', { type: 'manual', message: pricing.reason || 'Invalid Promo Code' }); return; }
      } else {
        const id = getPriceIdentifier();
        if (!id) { form.setError('promoCode', { type: 'manual', message: 'Invalid report type' }); return; }
        pricing = { valid: true, discount_usd: 0, trusted_base_price_usd: getBasePrice(), final_price_usd: getBasePrice(), report_type: id };
      }
      form.clearErrors('promoCode');
      await handleDirectSubmission(formData, pricing);
    } catch (e) {
      form.setError('promoCode', { type: 'manual', message: 'Failed to validate pricing. Please try again.' });
    }
  };

  // Scroll lock html+body and visualViewport keyboard padding
  const scrollLockCount = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    scrollLockCount.current += 1;

    const vv = (window as any).visualViewport as VisualViewport | undefined;
    let raf = 0;
    const updateKB = () => {
      raf = 0;
      const height = window.innerHeight;
      const vvHeight = vv?.height ?? height;
      const kb = Math.max(0, height - vvHeight);
      document.documentElement.style.setProperty('--kb', `${kb}px`);
      // Also measure footer height dynamically
      const fh = footerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--footer-h', `${fh}px`);
    };
    const onVV = () => { if (raf) return; raf = requestAnimationFrame(updateKB); };
    vv?.addEventListener('resize', onVV);
    vv?.addEventListener('scroll', onVV);
    updateKB();

    // Recalculate footer height on resize/orientation changes
    const onResize = () => { requestAnimationFrame(() => {
      const fh = footerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty('--footer-h', `${fh}px`);
    }); };
    window.addEventListener('resize', onResize);

    // Focusin handler to ensure inputs are visible
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        try { (target as HTMLElement).scrollIntoView({ block: 'nearest' }); } catch {}
      }
    };
    document.addEventListener('focusin', onFocusIn);

    return () => {
      vv?.removeEventListener('resize', onVV);
      vv?.removeEventListener('scroll', onVV);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.removeProperty('--kb');
      document.documentElement.style.removeProperty('--footer-h');
      window.removeEventListener('resize', onResize);
      document.removeEventListener('focusin', onFocusIn);
      if (scrollLockCount.current > 0) scrollLockCount.current -= 1;
      if (scrollLockCount.current === 0) {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
      }
    };
  }, [isOpen]);

  // Measure footer once when opening (layout phase)
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = footerRef.current;
    if (el) {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--footer-h', `${h}px`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sheet = (
    <div className="sheet-root z-[9999]">
      {/* Backdrop */}
      <div className="sheet-backdrop" onClick={handleClose} />

      {/* Sheet container (no transforms) */}
      <div className="fixed inset-x-0 bottom-0 top-0 flex flex-col bg-white sheet__container" style={{ height: '100dvh' }} role="dialog" aria-modal="true">
        <MobileDrawerHeader currentStep={currentStep} totalSteps={totalSteps} onClose={handleClose} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 sheet__scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
          {currentStep === 1 && (
            <Step1ReportType control={control} setValue={setValue} selectedCategory={reportCategory} onNext={nextStep} />
          )}
          {currentStep === 2 && (
            reportCategory === 'astro-data' ? (
              <Step1_5AstroData control={control} setValue={setValue} selectedSubCategory={formValues.reportSubCategory} onNext={nextStep} />
            ) : (
              <Step1_5SubCategory control={control} setValue={setValue} selectedCategory={reportCategory} selectedSubCategory={formValues.reportSubCategory} onNext={nextStep} />
            )
          )}
          {currentStep === 3 && (
            <Step2PersonA register={register} setValue={setValue} watch={watch} errors={errors} onNext={nextStep} />
          )}
          {currentStep === 4 && (
            requiresSecondPerson ? (
              <Step2PersonB register={register} setValue={setValue} watch={watch} errors={errors} onNext={nextStep} />
            ) : (
              <Step3Payment register={register} watch={watch} errors={errors} isProcessing={isProcessing} onTimeoutChange={() => {}} />
            )
          )}
          {currentStep === 5 && requiresSecondPerson && (
            <Step3Payment register={register} watch={watch} errors={errors} isProcessing={isProcessing} onTimeoutChange={() => {}} />
          )}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div ref={footerRef} className="mobile-footer-fixed bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="w-full max-w-full">
        <MobileDrawerFooter
          currentStep={currentStep}
          totalSteps={totalSteps}
          onPrevious={prevStep}
          onNext={nextStep}
          onSubmit={handleButtonClick}
          canGoNext={!!canGoNext}
          isProcessing={isProcessing}
          isLastStep={currentStep === totalSteps}
          hasTimedOut={hasTimedOut}
        />
      </div>
    </div>
  );

  return <>
    {createPortal(sheet, document.body)}
    {createPortal(footer, document.body)}
  </>;
};

export default MobileReportSheet; 