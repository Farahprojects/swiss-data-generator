import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';
import PersonCard from './PersonCard';


interface Step2BirthDetailsProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const Step2BirthDetails = React.memo(function Step2BirthDetails({
  register,
  setValue,
  watch,
  errors,
  onNext,
  onPrev,
}: Step2BirthDetailsProps) {
  const [showSecondPerson, setShowSecondPerson] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  

  const reportCategory = watch('reportCategory');
  const astroDataType = watch('astroDataType');
  const isCompatibilityReport = reportCategory === 'compatibility' || astroDataType === 'sync_rich';

  // Person‑1
  const isFirstPersonComplete = useMemo(() => {
    const name = watch('name');
    const email = watch('email');
    const birthDate = watch('birthDate');
    const birthTime = watch('birthTime');
    const birthLocation = watch('birthLocation');
    return !!(name && email && birthDate && birthTime && birthLocation);
  }, [watch]);

  // Person‑2 (compatibility only)
  const isSecondPersonComplete = useMemo(() => {
    if (!isCompatibilityReport) return true; // not required
    const n = watch('secondPersonName');
    const d = watch('secondPersonBirthDate');
    const t = watch('secondPersonBirthTime');
    const l = watch('secondPersonBirthLocation');
    return !!(n && d && t && l);
  }, [watch, isCompatibilityReport]);

  const canProceed = isCompatibilityReport
    ? isFirstPersonComplete && isSecondPersonComplete
    : isFirstPersonComplete;

  const ERROR_FIELDS: (keyof ReportFormData)[] = useMemo(
    () => [
      'name',
      'email',
      'birthDate',
      'birthTime',
      'birthLocation',
      'secondPersonName',
      'secondPersonBirthDate',
      'secondPersonBirthTime',
      'secondPersonBirthLocation',
    ],
    []
  );

  const scrollToFirstError = useCallback(() => {
    if (typeof window === 'undefined') return;
    for (const field of ERROR_FIELDS) {
      if (errors[field]) {
        const el = document.querySelector(`#${field}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          break;
        }
      }
    }
  }, [ERROR_FIELDS, errors]);

  const handleReviewAndPay = useCallback(() => {
    setHasTriedSubmit(true);
    if (canProceed) return onNext();
    setTimeout(scrollToFirstError, 100); // allow error states to paint first
  }, [canProceed, onNext, scrollToFirstError]);

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 w-full"
      >
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onPrev} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Your Info</h2>
            <p className="text-gray-600">
              {isCompatibilityReport
                ? "We need both people's details for your compatibility report"
                : 'We need these to create your personalised report'}
            </p>
          </div>
        </div>

        {/* Person‑1 */}
        <PersonCard
          personNumber={1}
          title={isCompatibilityReport ? 'Your Details' : 'Your Details'}
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
          hasTriedToSubmit={hasTriedSubmit}
        />

        {/* Add partner */}
        {isCompatibilityReport && !showSecondPerson && isFirstPersonComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => setShowSecondPerson(true)}
              variant="outline"
              className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Partner's Details
            </Button>
          </motion.div>
        )}

        {/* Person‑2 */}
        <AnimatePresence>
          {isCompatibilityReport && showSecondPerson && (
            <motion.div
              key="partner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PersonCard
                personNumber={2}
                title="Partner's Details"
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                hasTriedToSubmit={hasTriedSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review & Pay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pb-6 w-full"
        >
          <Button
            onClick={handleReviewAndPay}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
          >
            Review & Pay
          </Button>
        </motion.div>
      </motion.div>

    </div>
  );
});

export default Step2BirthDetails;