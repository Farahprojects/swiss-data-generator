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
  reportCategories,
  snapshotSubCategories,
  astroRequestCategories,
  detailedEssenceTypes,
  detailedRelationshipTypes,
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
 * ReportTypeSelector – production‑ready
 * --------------------------------------------------
 * ✦ Smooth, single‑fire auto‑scroll:
 *   – Step 1   → Step 1.5 (sub‑step) once a main category is picked
 *   – Step 1.5 → Step 2     once the sub‑step is complete
 * ✦ Flags reset automatically when the user changes category
 * ✦ No brittle DOM queries – uses React refs so it's SSR‑safe
 * ✦ Removed redundant local state (fully derived from RHF values)
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
  const watchedCategory = useWatch({ control, name: 'reportCategory' });
  const watchedEssence = useWatch({ control, name: 'essenceType' });
  const watchedRelationship = useWatch({ control, name: 'relationshipType' });
  const watchedSnapshot = useWatch({ control, name: 'reportType' });
  const watchedAstroData = useWatch({ control, name: 'request' });

  /* ──────────────────────────
   * Scroll targets
   * ────────────────────────── */
  const subStepRef = useRef<HTMLDivElement>(null); // Step 1.5
  const stepTwoRef = useRef<HTMLDivElement>(null); // Step 2

  const hasScrolledToSubStep = useRef(false);
  const hasScrolledToStepTwo = useRef(false);

  /* ──────────────────────────
   * Reset scroll flags if category changes
   * ────────────────────────── */
  useEffect(() => {
    hasScrolledToSubStep.current = false;
    hasScrolledToStepTwo.current = false;
  }, [watchedCategory]);

  /* ──────────────────────────
   * Set combined reportType for essence
   * ────────────────────────── */
  useEffect(() => {
    if (watchedCategory === 'the-self' && watchedEssence && setValue) {
      setValue('reportType', `essence_${watchedEssence}`, { shouldValidate: true });
    }
  }, [watchedCategory, watchedEssence, setValue]);

  /* ──────────────────────────
   * Set combined reportType for relationship
   * ────────────────────────── */
  useEffect(() => {
    if (watchedCategory === 'compatibility' && watchedRelationship && setValue) {
      setValue('reportType', `sync_${watchedRelationship}`, { shouldValidate: true });
    }
  }, [watchedCategory, watchedRelationship, setValue]);

  /* ──────────────────────────
   * Scroll: Step 1 → Step 1.5
   * ────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    if (!watchedCategory || hasScrolledToSubStep.current) return;

    window.requestAnimationFrame(() => {
      subStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hasScrolledToSubStep.current = true;
    });
  }, [watchedCategory]);

  /* ──────────────────────────
   * Is the sub‑step complete?
   * ────────────────────────── */
  const subStepComplete =
    (watchedCategory === 'the-self' && !!watchedEssence) ||
    (watchedCategory === 'compatibility' && !!watchedRelationship) ||
    (watchedCategory === 'astro-data' && !!watchedAstroData);

  /* ──────────────────────────
   * Scroll: Step 1.5 → Step 2
   * ────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!subStepComplete || hasScrolledToStepTwo.current) return;

    window.requestAnimationFrame(() => {
      stepTwoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hasScrolledToStepTwo.current = true;
    });
  }, [subStepComplete]);

  /* ──────────────────────────
   * Handlers
   * ────────────────────────── */
  const handleCategoryClick = useCallback(
    (
      value: string,
      reportType: ReportFormData['reportType'],
      onChange: (v: any) => void,
    ) => {
      onChange(value);
      if (value === 'astro-data') {
        // Astro data uses the `request` field instead of reportType
        setValue?.('reportType', '', { shouldValidate: true });
      } else {
        // Set reportType directly for all other categories
        setValue?.('reportType', reportType, { shouldValidate: true });
      }
    },
    [setValue],
  );

  const handleSubCategoryClick = useCallback(
    (value: string, reportType: ReportFormData['reportType'], onChange: (v: any) => void) => {
      onChange(value);
      setValue?.('reportType', reportType, { shouldValidate: true });
    },
    [setValue],
  );

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
  const showSnapshotSubCategories = false; // Monthly removed
  const showAstroDataSubCategories = watchedCategory === 'astro-data';
  const showEssenceOptions = watchedCategory === 'the-self';
  const showRelationshipOptions = watchedCategory === 'compatibility';
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
        title="Choose Your Report Type"
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
            {/* Main categories */}
            <div className="space-y-4">
              <Controller
                control={control}
                name="reportCategory"
                render={({ field }) => (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {reportCategories.map((category) => {
                      const IconComponent = category.icon;
                      const isSelected = watchedCategory === category.value;
                      return (
                        <motion.button
                          key={category.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() =>
                            handleCategoryClick(category.value, category.reportType, field.onChange)
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
                              <h3 className="text-lg font-normal text-gray-900">{category.title}</h3>
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Snapshot sub‑categories */}
            {showSnapshotSubCategories && (
              <div ref={subStepRef} className="space-y-4" data-step="1.5">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your snapshot type
                </h3>
                <Controller
                  control={control}
                  name="reportSubCategory"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {snapshotSubCategories.map((sub) => {
                        const IconComponent = sub.icon;
                        const isSelected = watchedSnapshot === sub.reportType;
                        return (
                          <motion.button
                            key={sub.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() =>
                              handleSubCategoryClick(sub.value, sub.reportType, field.onChange)
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
                                <h3 className="text-lg font-normal text-gray-900">{sub.title}</h3>
                                <p className="text-sm text-muted-foreground">{sub.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            )}

            {/* Astro‑data sub‑categories */}
            {showAstroDataSubCategories && (
              <div ref={subStepRef} className="space-y-4" data-step="1.5">
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
            )}

            {/* Essence types */}
            {showEssenceOptions && (
              <div ref={subStepRef} className="space-y-4" data-step="1.5">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your report style *
                </h3>
                <Controller
                  control={control}
                  name="essenceType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                      {detailedEssenceTypes.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = field.value === type.value;
                        return (
                          <motion.button
                            key={type.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => field.onChange(type.value)}
                            className={[
                              'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                              'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                              isSelected
                                ? 'border-primary shadow-lg bg-primary/5'
                                : 'border-neutral-200 hover:border-neutral-300',
                            ].join(' ')}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex gap-4 items-center">
                              <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                                <IconComponent className="h-6 w-6 text-gray-700" />
                              </div>
                              <div className="flex-1 text-left">
                                <h3 className="text-lg font-normal text-gray-900">{type.title}</h3>
                                <p className="text-sm text-muted-foreground">{type.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.essenceType && (
                  <p className="text-sm text-destructive text-center">
                    {errors.essenceType.message}
                  </p>
                )}
              </div>
            )}

            {/* Return year */}
            {requiresReturnYear && (
              <div ref={subStepRef} className="space-y-2" data-step="1.5">
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

            {/* Relationship types */}
            {showRelationshipOptions && (
              <div ref={subStepRef} className="space-y-4" data-step="1.5">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your report style *
                </h3>
                <Controller
                  control={control}
                  name="relationshipType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                      {detailedRelationshipTypes.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = field.value === type.value;
                        return (
                          <motion.button
                            key={type.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => field.onChange(type.value)}
                            className={[
                              'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                              'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                              isSelected
                                ? 'border-primary shadow-lg bg-primary/5'
                                : 'border-neutral-200 hover:border-neutral-300',
                            ].join(' ')}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex gap-4 items-center">
                              <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                                <IconComponent className="h-6 w-6 text-gray-700" />
                              </div>
                              <div className="flex-1 text-left">
                                <h3 className="text-lg font-normal text-gray-900">{type.title}</h3>
                                <p className="text-sm text-muted-foreground">{type.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.relationshipType && (
                  <p className="text-sm text-destructive text-center">
                    {errors.relationshipType.message}
                  </p>
                )}
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
