import React, { useEffect } from 'react';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';
import CombinedPersonalDetailsForm from '@/components/public-report/CombinedPersonalDetailsForm';
import SecondPersonForm from '@/components/public-report/SecondPersonForm';
import PaymentStep from '@/components/public-report/PaymentStep';
import { UnifiedSuccessHandler } from './UnifiedSuccessHandler';
import { useUnifiedReportForm } from '@/hooks/useUnifiedReportForm';

interface ReportFormStepsProps {
  formState: ReturnType<typeof useUnifiedReportForm>;
  coachSlug?: string;
  themeColor?: string;
  fontFamily?: string;
  onFormStateChange?: (isValid: boolean, step: number) => void;
  onSubmit: () => void;
}

export const ReportFormSteps: React.FC<ReportFormStepsProps> = ({
  formState,
  coachSlug,
  themeColor,
  fontFamily,
  onFormStateChange,
  onSubmit
}) => {
  const {
    form,
    currentStep,
    canGoNext,
    requiresSecondPerson,
    reportCreated,
    watchedValues
  } = formState;

  // Notify parent of form state changes
  useEffect(() => {
    onFormStateChange?.(canGoNext, currentStep);
  }, [canGoNext, currentStep, onFormStateChange]);

  // Show success screen if report was created
  if (reportCreated && typeof reportCreated === 'object') {
    const reportData = reportCreated as any;
    if (reportData.guestReportId) {
      return (
        <UnifiedSuccessHandler
          name={watchedValues.name}
          email={watchedValues.email}
          guestReportId={reportData.guestReportId}
        />
      );
    }
  }

  const formStyle = fontFamily ? { fontFamily } : {};

  return (
    <div style={formStyle} className="space-y-6">
      {currentStep === 1 && (
        <ReportTypeSelector
          control={form.control}
          errors={form.formState.errors}
          selectedReportType={watchedValues.reportType}
          showReportGuide={false}
          setShowReportGuide={() => {}}
          setValue={form.setValue}
        />
      )}

      {currentStep === 2 && (
        <CombinedPersonalDetailsForm
          register={form.register}
          errors={form.formState.errors}
          watch={form.watch}
          setValue={form.setValue}
        />
      )}

      {currentStep === 3 && requiresSecondPerson && (
        <SecondPersonForm
          register={form.register}
          errors={form.formState.errors}
          watch={form.watch}
          setValue={form.setValue}
        />
      )}

      {((currentStep === 3 && !requiresSecondPerson) || (currentStep === 4 && requiresSecondPerson)) && (
        <PaymentStep
          register={form.register}
          watch={form.watch}
          errors={form.formState.errors}
          setValue={form.setValue}
          onSubmit={onSubmit}
          isProcessing={formState.isProcessing}
        />
      )}
    </div>
  );
};