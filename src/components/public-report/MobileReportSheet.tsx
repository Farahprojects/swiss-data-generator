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
import { useToast } from '@/components/ui/use-toast';

interface MobileReportSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReportCreated?: (guestReportId: string, paymentStatus: string, name: string, email: string) => void;
}

const MobileReportSheet: React.FC<MobileReportSheetProps> = ({ isOpen, onOpenChange, onReportCreated }) => {
  const form = useForm<ReportFormData>();
  const { control, register, setValue, watch, handleSubmit, formState: { errors } } = form;
  const formValues = watch();
  
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  const [guestReportId, setGuestReportId] = React.useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string>('');
  const [userEmail, setUserEmail] = React.useState<string>('');
  
  const { toast } = useToast();
  const { getPriceById, isLoading: pricesLoading } = usePricing();
  
  // Get base price from cached data
  const getBasePrice = () => {
    const priceIdentifier = getPriceIdentifier();
    if (!priceIdentifier) return 0;
    
    const priceData = getPriceById(priceIdentifier);
    return priceData ? Number(priceData.unit_price_usd) : 0;
  };

  // Add timeout mechanism to prevent stuck processing state
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isProcessing) {
      setHasTimedOut(false);
      timeoutId = setTimeout(() => {
        console.warn('Processing timeout - this may indicate a server issue');
        setHasTimedOut(true);
        toast({
          title: "Request Timeout",
          description: "The request took too long. Please try again.",
          variant: "destructive",
        });
      }, 15000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isProcessing, toast]);

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const reportType = watch('reportType');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');
  const requestField = watch('request');
  const name = watch('name');
  const email = watch('email');
  const promoCode = watch('promoCode') || '';

  // Get price identifier from form data
  const getPriceIdentifier = () => {
    // Prioritize direct reportType for unified mobile/desktop behavior
    if (reportType) {
      return reportType;
    }
    
    // Fallback to request field for astro data
    if (requestField) {
      return requestField;
    }
    
    // Legacy fallback for form combinations (desktop compatibility)
    if (essenceType && reportCategory === 'the-self') {
      return `essence_${essenceType}`;
    }
    
    if (relationshipType && reportCategory === 'compatibility') {
      return `sync_${relationshipType}`;
    }
    
    return '';
  };

  const handleButtonClick = async () => {
    setHasTimedOut(false);
    
    const currentPromoCode = promoCode.trim();
    let pricingResult: any;

    try {
      // Only validate promo code if one is provided
      if (currentPromoCode) {
        const { data, error } = await supabase.functions.invoke('validate-promo-code', {
          body: { promoCode: currentPromoCode, basePrice: getBasePrice(), reportType: getPriceIdentifier() }
        });

        if (error || !data.valid) {
          toast({
            title: "Invalid Promo Code",
            description: data?.reason || 'Please check your promo code and try again.',
            variant: "destructive",
          });
          return;
        }
        
        pricingResult = data;
      } else {
        // No promo code provided - use base pricing
        const priceIdentifier = getPriceIdentifier();
        if (!priceIdentifier) {
          toast({
            title: "Invalid Report Type",
            description: "Please select a valid report type.",
            variant: "destructive",
          });
          return;
        }
        
        pricingResult = {
          valid: true,
          discount_usd: 0,
          trusted_base_price_usd: getBasePrice(),
          final_price_usd: getBasePrice(),
          report_type: priceIdentifier,
        };
      }

      // Submit the form with trusted pricing
      await handleSubmit(async (data) => {
        setIsProcessing(true);
        
        try {
          const { data: result, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              ...data,
              trustedPricing: pricingResult
            }
          });

          if (error) {
            throw new Error(error.message);
          }

          if (result?.guestReportId) {
            setGuestReportId(result.guestReportId);
            setPaymentStatus(result.paymentStatus);
            setUserName(data.name);
            setUserEmail(data.email);
            
            if (onReportCreated) {
              onReportCreated(result.guestReportId, result.paymentStatus, data.name, data.email);
            }
          }

        } catch (error) {
          console.error('❌ Mobile report creation error:', error);
          toast({
            title: "Payment Failed",
            description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      })();

    } catch (error) {
      console.error('❌ Mobile button click error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const requiresSecondPerson = reportCategory === 'compatibility' && relationshipType !== 'synastry';

  const totalSteps = requiresSecondPerson ? 5 : 4;
  const canGoNext = currentStep < totalSteps;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Mobile-specific scroll and keyboard handling
  const scrollLockCount = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    // Lock scroll on body
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    scrollLockCount.current += 1;

    // Handle virtual keyboard
    const vv = window.visualViewport;
    let raf: number;

    const onVV = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (vv) {
          const h = Math.round(vv.height);
          document.documentElement.style.setProperty('--kb', `${h}px`);
        }
      });
    };

    const onResize = () => {
      const h = Math.round(window.innerHeight);
      document.documentElement.style.setProperty('--vh', `${h}px`);
    };

    if (vv) {
      vv.addEventListener('resize', onVV);
      vv.addEventListener('scroll', onVV);
    }
    window.addEventListener('resize', onResize);
    onResize();

    // Handle focus scrolling
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