import React from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from 'react-hook-form';
import { motion } from 'framer-motion';

import { ReportFormData } from '@/types/public-report';
import PersonCard from './PersonCard';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step2PersonBProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onNext?: () => void;
  onPlaceSelected?: (isSecondPerson?: boolean) => void;
}

const Step2PersonB: React.FC<Step2PersonBProps> = React.memo(({
  register,
  setValue,
  watch,
  errors,
  onNext,
  onPlaceSelected,
}) => {
  const topSafePadding = useMobileSafeTopPadding();
  const reportCategory = watch('reportCategory');
  const request = watch('request');
  const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';
  
  // Only show this step for compatibility reports
  if (!isCompatibilityReport) {
    return null;
  }

  return (
    <div className="bg-white">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
        style={{ paddingTop: `${topSafePadding + 8}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-6 py-2">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
              Second <em className="italic font-light">person</em>
            </h1>
          </div>
        </div>

        {/* Person‑2 */}
        <div className="px-6">
          <PersonCard
            personNumber={2}
            title="Partner's Details"
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            hasTriedToSubmit={false}
            autocompleteDisabled={false}
            onPlaceSelect={() => {
              // Removed auto-advance - let user control progression
            }}
          />
        </div>

      </motion.div>
    </div>
  );
});

Step2PersonB.displayName = 'Step2PersonB';

export default Step2PersonB;
