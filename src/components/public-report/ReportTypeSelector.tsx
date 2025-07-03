import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  astroDataSubCategories,
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
 * ReportTypeSelector
 * --------------------------------------------------
 * Production‑ready version with robust auto‑scroll behaviour.
 * ‑ Debounces scroll so it fires only once per category selection.
 * ‑ Uses refs rather than DOM queries for reliability & SSR safety.
 * ‑ Cleans up duplicated local state & re‑computes from RHF values.
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
  const watchedAstroData = useWatch({ control, name: 'astroDataType' });

  /* ──────────────────────────
   * Local UI state
   * ────────────────────────── */
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

  /* ──────────────────────────
   * Step‑two ref for scrolling
   * ────────────────────────── */
  const stepTwoRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  /** Resets the hasScrolled flag whenever the top‑level category changes */
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [watchedCategory]);

  /**
   * Fires once when the user has made a *complete* selection for step one.
   * We debounce with hasScrolledRef to avoid repeated scrolls when the user
   * tweaks sub‑options (e.g. picking a different snapshot type).
   */
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard

    const categoryComplete =
      (watchedCategory === 'the-self' && !!watchedEssence) ||
      (watchedCategory === 'compatibility' && !!watchedRelationship) ||
      (watchedCategory === 'snapshot' && !!watchedSnapshot) ||
      (watchedCategory === 'astro-data' && !!watchedAstroData);

    if (categoryComplete && !hasScrolledRef.current && stepTwoRef.current) {
      // Use rAF for smoother timing than setTimeout & to wait for layout flush
      window.requestAnimationFrame(() => {
        stepTwoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        hasScrolledRef.current = true;
      });
    }
  }, [watchedCategory, watchedEssence, watchedRelationship, watchedSnapshot, watchedAstroData]);

  /* ──────────────────────────
   * Derived booleans for conditional renders
   * ────────────────────────── */
  const showSnapshotSubCategories = watchedCategory === 'snapshot';
  const showAstroDataSubCategories = watchedCategory === 'astro-data';
  const showEssenceOptions = watchedCategory === 'the-self' && selectedReportType === 'essence';
  const showRelationshipOptions =
    watchedCategory === 'compatibility' &&
    (selectedReportType === 'sync' || selectedReportType === 'compatibility');
  const requiresReturnYear = selectedReportType === 'return';
  const getCurrentYear = () => new Date().getFullYear();

  /* ──────────────────────────
   * Handlers
   * ────────────────────────── */
  const handleCategoryClick = useCallback(
    (
      value: string,
      reportType: ReportFormData['reportType'],
      onChange: (v: any) => void,
    ) => {
      setSelectedCategory(value);
      onChange(value);

      // If not a snapshot or astro-data, propagate reportType immediately
      if (value !== 'snapshot' && value !== 'astro-data' && setValue) {
        setValue('reportType', reportType, { shouldValidate: true });
      }
    },
    [setValue],
  );

  const handleSubCategoryClick = useCallback(
    (value: string, reportType: ReportFormData['reportType'], onChange: (v: any) => void) => {
      setSelectedSubCategory(value);
      onChange(value);
      setValue?.('reportType', reportType, { shouldValidate: true });
    },
    [setValue],
  );

  const handleAstroDataClick = useCallback(
    (value: string, reportType: ReportFormData['reportType'], onChange: (v: any) => void) => {
      setSelectedSubCategory(value);
      onChange(value);
      
      // Set request field based on the category selected
      const requestValue = watchedCategory === 'the-self' ? 'essence' : 'sync';
      setValue?.('request', requestValue, { shouldValidate: true });
      setValue?.('reportType', '', { shouldValidate: true }); // Keep reportType blank for astro data
    },
    [setValue, watchedCategory],
  );

  /* ──────────────────────────
   * Render
   * ────────────────────────── */
  return (
    <>
      {/* STEP 1 ─────────────────────────────────────────────── */}
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
            className="text-primary hover:text-primary/80 font-bold mx-auto block transition-colors"
          >
            Not sure which report to choose? Click here.
          </button>

          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Main Category Selection */}
            <div className="space-y-4">
              <Controller
                control={control}
                name="reportCategory"
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          className={
                            [
                              'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                              'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                              isSelected
                                ? 'border-primary shadow-lg'
                                : 'border-neutral-200 hover:border-neutral-300',
                            ].join(' ')
                          }
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                              <IconComponent className="h-6 w-6 text-gray-700" />
                            </div>
                            <div className="flex-1 text-left">
                              <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
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

            {/* Snapshot sub‑categories (only visible when snapshot selected) */}
            {showSnapshotSubCategories && (
              <div className="space-y-4">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your snapshot type
                </h3>
                <Controller
                  control={control}
                  name="reportSubCategory"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            className={
                              [
                                'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                                'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                                isSelected
                                  ? 'border-primary shadow-lg'
                                  : 'border-neutral-200 hover:border-neutral-300',
                              ].join(' ')
                            }
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex gap-4 items-center">
                              <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                                <IconComponent className="h-6 w-6 text-gray-700" />
                              </div>
                              <div className="flex-1 text-left">
                                <h3 className="text-lg font-semibold text-gray-900">{sub.title}</h3>
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

            {/* Astro Data sub‑categories (only visible when astro-data selected) */}
            {showAstroDataSubCategories && (
              <div className="space-y-4">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your astro data type
                </h3>
                <Controller
                  control={control}
                  name="astroDataType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {astroDataSubCategories.map((sub) => {
                        const IconComponent = sub.icon;
                        const isSelected = watchedAstroData === sub.value;
                        return (
                          <motion.button
                            key={sub.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() =>
                              handleAstroDataClick(sub.value, sub.reportType, field.onChange)
                            }
                            className={
                              [
                                'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                                'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                                isSelected
                                  ? 'border-primary shadow-lg'
                                  : 'border-neutral-200 hover:border-neutral-300',
                              ].join(' ')
                            }
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

            {/* Essence types (only when "the‑self" + essence report) */}
            {showEssenceOptions && (
              <div className="space-y-4">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your report style *
                </h3>
                <Controller
                  control={control}
                  name="essenceType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
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
                            className={
                              [
                                'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                                'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                                isSelected
                                  ? 'border-primary shadow-lg bg-primary/5'
                                  : 'border-neutral-200 hover:border-neutral-300',
                              ].join(' ')
                            }
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex gap-4 items-center">
                              <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                                <IconComponent className="h-6 w-6 text-gray-700" />
                              </div>
                              <div className="flex-1 text-left">
                                <h3 className="text-lg font-semibold text-gray-900">{type.title}</h3>
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

            {/* Return year (only when solar/lunar return report) */}
            {requiresReturnYear && (
              <div className="space-y-2">
                <Label htmlFor="returnYear">Return Year *</Label>
                <Controller
                  control={control}
                  name="returnYear"
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="returnYear"
                      type="number"
                      placeholder={getCurrentYear().toString()}
                      min="1900"
                      max="2100"
                      className="h-12"
                    />
                  )}
                />
              </div>
            )}

            {/* Relationship types (only when compatibility report) */}
            {showRelationshipOptions && (
              <div className="space-y-4">
                <h3 className="text-2xl font-light text-gray-900 text-center tracking-tight">
                  Choose your report style *
                </h3>
                <Controller
                  control={control}
                  name="relationshipType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
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
                            className={
                              [
                                'w-full p-6 rounded-2xl border transition-all duration-200 shadow-md',
                                'bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98]',
                                isSelected
                                  ? 'border-primary shadow-lg bg-primary/5'
                                  : 'border-neutral-200 hover:border-neutral-300',
                              ].join(' ')
                            }
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex gap-4 items-center">
                              <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                                <IconComponent className="h-6 w-6 text-gray-700" />
                              </div>
                              <div className="flex-1 text-left">
                                <h3 className="text-lg font-semibold text-gray-900">{type.title}</h3>
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
      </FormStep>

      {/* STEP 2 (dummy wrapper for ref) */}
      <div ref={stepTwoRef} data-step="2" />

      <ReportGuideResponsive isOpen={showReportGuide} onClose={() => setShowReportGuide(false)} />
    </>
  );
};

export default ReportTypeSelector;
