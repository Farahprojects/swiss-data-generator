import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { addYears, format } from 'date-fns';
import { essenceTypes, relationshipTypes } from '@/constants/report-types';
import { ReportTypeOption, ReportFormData } from '@/types/public-report';
import ReportTypeSelector from './ReportTypeSelector';
import BirthDetailsStep from './BirthDetailsStep';
import PaymentStep from './PaymentStep';
import SuccessScreen from './SuccessScreen';
import { usePromoValidation } from '@/hooks/usePromoValidation';
import { useReportSubmission } from '@/hooks/useReportSubmission';

const reportFormSchema = z.object({
  reportType: z.string().min(1, {
    message: "Please select a report type.",
  }),
  relationshipType: z.string().optional(),
  essenceType: z.string().optional(),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  birthDate: z.string().min(1, {
    message: "Please select your birth date.",
  }),
  birthTime: z.string().min(1, {
    message: "Please select your birth time.",
  }),
  birthLocation: z.string().min(2, {
    message: "Please enter your birth location.",
  }),
  birthLatitude: z.number().optional(),
  birthLongitude: z.number().optional(),
  birthPlaceId: z.string().optional(),
  secondPersonName: z.string().optional(),
  secondPersonBirthDate: z.string().optional(),
  secondPersonBirthTime: z.string().optional(),
  secondPersonBirthLocation: z.string().optional(),
  secondPersonLatitude: z.number().optional(),
  secondPersonLongitude: z.number().optional(),
  secondPersonPlaceId: z.string().optional(),
  returnYear: z.string().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
  // Mobile-specific fields
  reportCategory: z.string().optional(),
  reportSubCategory: z.string().optional(),
});

interface PublicReportFormProps {
  showReportGuide?: boolean;
  setShowReportGuide?: (show: boolean) => void;
}

const PublicReportForm = ({ showReportGuide = false, setShowReportGuide }: PublicReportFormProps) => {
  const [step, setStep] = useState(1);
  const [reportData, setReportData] = useState<ReportFormData | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const { validatePromoManually, promoValidation, isValidatingPromo } = usePromoValidation();
  const { isProcessing, isPricingLoading, reportCreated, submitReport } = useReportSubmission();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      reportType: '',
      name: '',
      email: '',
      birthDate: '',
      birthTime: '',
      birthLocation: '',
    },
  });

  const { control, handleSubmit, watch, setValue, formState, register } = form;

  // Watch for report type completion to advance to step 2
  const reportType = watch('reportType');
  const reportCategory = watch('reportCategory');
  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');

  // Auto-advance to step 2 when report type selection is complete
  useEffect(() => {
    const isReportTypeComplete = () => {
      if (reportCategory === 'the-self' && essenceType) return true;
      if (reportCategory === 'compatibility' && relationshipType) return true;
      if (reportCategory === 'snapshot' && reportType) return true;
      return false;
    };

    if (step === 1 && isReportTypeComplete()) {
      console.log('🎯 Report type selection complete, advancing to step 2');
      setTimeout(() => {
        setStep(2);
      }, 500);
    }
  }, [step, reportType, reportCategory, essenceType, relationshipType]);

  const onSubmit = async (data: ReportFormData) => {
    console.log('Form Data Submitted:', data);
    setReportData(data);

    // Create a proper PromoValidationState from PromoCodeValidation
    const promoValidationState = promoValidation ? {
      status: promoValidation.isValid 
        ? (promoValidation.isFree ? 'valid-free' as const : 'valid-discount' as const) 
        : 'invalid' as const,
      message: promoValidation.message,
      discountPercent: promoValidation.discountPercent
    } : {
      status: 'none' as const,
      message: '',
      discountPercent: 0
    };

    const setPromoValidation = (state: any) => {
      // This function would update the promo validation state
      // For now, we'll use the existing validation state
    };

    // Use the real report submission logic
    await submitReport(data, promoValidationState, setPromoValidation);
    
    // Advance to success screen
    setStep(4);
  };

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const handleViewReport = (content: string, pdfData?: string | null) => {
    setReportContent(content);
    setShowReportViewer(true);
  };

  // Create a proper PromoValidationState from PromoCodeValidation
  const promoValidationState = promoValidation ? {
    status: promoValidation.isValid 
      ? (promoValidation.isFree ? 'valid-free' as const : 'valid-discount' as const) 
      : 'invalid' as const,
    message: promoValidation.message,
    discountPercent: promoValidation.discountPercent
  } : {
    status: 'none' as const,
    message: '',
    discountPercent: 0
  };

  // Show success screen when step is 4 or report is created
  if (step === 4 || reportCreated) {
    return (
      <SuccessScreen
        name={reportData?.name || ''}
        email={reportData?.email || ''}
        onViewReport={handleViewReport}
        autoStartPolling={true}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Step 1: Report Type Selection */}
      <ReportTypeSelector
        control={control}
        errors={formState.errors}
        selectedReportType={watch('reportType')}
        showReportGuide={showReportGuide}
        setShowReportGuide={setShowReportGuide || (() => {})}
        setValue={setValue}
      />

      {/* Step 2: Birth Details */}
      {step >= 2 && (
        <BirthDetailsStep
          register={register}
          setValue={setValue}
          watch={watch}
          errors={formState.errors}
          onNext={handleNextStep}
        />
      )}

      {/* Step 3: Payment */}
      {step >= 3 && (
        <PaymentStep 
          register={form.register}
          watch={form.watch}
          errors={formState.errors}
          onSubmit={handleSubmit(onSubmit)}
          isProcessing={isProcessing || isPricingLoading}
          promoValidation={promoValidationState}
          isValidatingPromo={isValidatingPromo}
        />
      )}
    </form>
  );
};

export default PublicReportForm;
