
import React, { useState } from 'react';
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
import PaymentStep from './PaymentStep';
import { usePromoValidation } from '@/hooks/usePromoValidation';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportData, setReportData] = useState<ReportFormData | null>(null);
  const { validatePromoManually, promoValidation, isValidatingPromo } = usePromoValidation();

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

  const { control, handleSubmit, watch, setValue, formState } = form;

  const onSubmit = async (data: ReportFormData) => {
    console.log('Form Data Submitted:', data);
    setIsProcessing(true);

    // Validate promo code if present
    if (data.promoCode && data.promoCode.trim() !== '') {
      console.log('Validating promo code:', data.promoCode);
      await validatePromoManually(data.promoCode);
    }

    // Simulate report generation (replace with actual API call)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Store form data in context
    setReportData(data);

    setIsProcessing(false);
    setStep(4); // Proceed to confirmation step
  };

  const reportType = watch('reportType');
  const reportCategory = watch('reportCategory');
  const relationshipType = watch('relationshipType');
  const essenceType = watch('essenceType');

  const showSecondPersonFields = reportType === 'sync' || reportType === 'compatibility';
  const requiresNotes = reportType === 'transit' || reportType === 'progression' || reportType === 'return';

  // Create a proper PromoValidationState from PromoCodeValidation
  const promoValidationState = promoValidation ? {
    status: (promoValidation.isValid ? (promoValidation.isFree ? 'valid-free' : 'valid-discount') : 'invalid') as const,
    message: promoValidation.message,
    discountPercent: promoValidation.discountPercent
  } : {
    status: 'none' as const,
    message: '',
    discountPercent: 0
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <ReportTypeSelector
        control={control}
        errors={formState.errors}
        selectedReportType={watch('reportType')}
        showReportGuide={showReportGuide}
        setShowReportGuide={setShowReportGuide || (() => {})}
        setValue={setValue}
      />

      {step >= 2 && (
        <PaymentStep 
          register={form.register}
          watch={form.watch}
          errors={formState.errors}
          onSubmit={handleSubmit(onSubmit)}
          isProcessing={isProcessing}
          promoValidation={promoValidationState}
          isValidatingPromo={isValidatingPromo}
        />
      )}
    </form>
  );
};

export default PublicReportForm;
