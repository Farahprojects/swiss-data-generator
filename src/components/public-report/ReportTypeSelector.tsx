import React, { useEffect, useRef, useCallback } from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormSetValue,
  useWatch,
} from 'react-hook-form';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  astroRequestCategories,
} from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';
import ReportGuideResponsive from './ReportGuideResponsive';

interface ReportTypeSelectorProps {
  control: Control<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  selectedReportType: string;
  showReportGuide: boolean;
  setShowReportGuide: (show: boolean) => void;
  setValue?: UseFormSetValue<ReportFormData>;
}

/**
 * ReportTypeSelector – streamlined for astro data only
 * --------------------------------------------------
 * ✦ Direct selection of astro data types (essence or sync)
 * ✦ Auto-scroll to Step 2 once selection is made
 * ✦ Simplified flow with no sub-categories
 */
const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
  control,
  errors,
  selectedReportType,
  showReportGuide,
  setShowReportGuide,
  setValue,
}) => {
  /* ──────────────────────────
   * Reactive form state
   * ────────────────────────── */
  const watchedAstroData = useWatch({ control, name: 'request' });

  /* ──────────────────────────
   * Scroll targets
   * ────────────────────────── */
  const stepTwoRef = useRef<HTMLDivElement>(null); // Step 2
  const hasScrolledToStepTwo = useRef(false);

  /* ──────────────────────────
   * Reset scroll flags if astro data changes
   * ────────────────────────── */
  useEffect(() => {
    hasScrolledToStepTwo.current = false;
  }, [watchedAstroData]);

  /* ──────────────────────────
   * Scroll: Step 1 → Step 2 (when astro data is selected)
   * ────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    if (!watchedAstroData || hasScrolledToStepTwo.current) return;

    window.requestAnimationFrame(() => {
      stepTwoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hasScrolledToStepTwo.current = true;
    });
  }, [watchedAstroData]);

  /* ──────────────────────────
   * Handlers
   * ────────────────────────── */
  const handleAstroDataClick = useCallback(
    (value: string, reportType: ReportFormData['reportType'], onChange: (v: any) => void) => {
      onChange(value);

      // For astro data, the request field IS the report type
      setValue?.('request', value, { shouldValidate: true });
      
      // Clear reportType since astro data uses request field instead
      setValue?.('reportType', '', { shouldValidate: true });
    },
    [setValue],
  );

  /* ──────────────────────────
   * Derived UI helpers
   * ────────────────────────── */
  const requiresReturnYear = selectedReportType === 'return';
  const currentYear = new Date().getFullYear();

  /* ──────────────────────────
   * Render
   * ────────────────────────── */
  return (
    <>
      {/* STEP 1 */}
      <FormStep
        stepNumber={1}
        title="Choose Your Astro Data Type"
        className="bg-background"
        data-step="1"
      >
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setShowReportGuide(true)}
            className="text-lg md:text-xl font-light text-gray-700 hover:text-gray-900 mx-auto block transition-colors tracking-tight"
          >
            Not sure which report to choose? Click here.
          </button>

          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Astro data selection - now the main Step 1 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                Choose your astro data type
              </h3>
              <Controller
                control={control}
                name="request"
                render={({ field }) => (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {astroRequestCategories.map((sub) => {
                      const IconComponent = sub.icon;
                      const isSelected = watchedAstroData === sub.value;
                      return (
                        <motion.button
                          key={sub.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() =>
                            handleAstroDataClick(sub.value, sub.request, field.onChange)
                          }
                          className={[
                            'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                            'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                            isSelected
                              ? 'border-primary shadow-lg'
                              : 'border-neutral-200 hover:border-neutral-300',
                          ].join(' ')}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                              <IconComponent className="h-6 w-6 text-gray-700" />
                            </div>
                            <div className="flex-1 text-left">
                              <h3 className="text-lg font-semibold text-gray-900">{sub.title}</h3>
                              <p className="text-sm text-muted-foreground">{sub.description}</p>
                              <div className="mt-2 text-xs text-green-600 font-medium">
                                ⚡ Instant delivery (~5 seconds)
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Return year */}
            {requiresReturnYear && (
              <div className="space-y-2" data-step="1.5">
                <Label htmlFor="returnYear">Return Year *</Label>
                <Controller
                  control={control}
                  name="returnYear"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="returnYear"
                      type="number"
                      placeholder={currentYear.toString()}
                      min="1900"
                      max="2100"
                      className="h-12"
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 2 reference for auto-scroll */}
        <div ref={stepTwoRef} data-step="2" />
      </FormStep>

      {/* Report Guide */}
      <ReportGuideResponsive
        isOpen={showReportGuide}
        onClose={() => setShowReportGuide(false)}
      />
    </>
  );
};

export default ReportTypeSelector;