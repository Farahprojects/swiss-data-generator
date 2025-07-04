import React, {
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
import { Plus } from 'lucide-react';

import { ReportFormData } from '@/types/public-report';
import PersonCard from './PersonCard';


interface Step2BirthDetailsProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
}

const Step2BirthDetails = React.memo(function Step2BirthDetails({
  register,
  setValue,
  watch,
  errors,
}: Step2BirthDetailsProps) {
  const [showSecondPerson, setShowSecondPerson] = useState(false);

  const reportCategory = watch('reportCategory');
  const request = watch('request');
  const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';

  // Debug logging
  React.useEffect(() => {
    console.log('Step2BirthDetails Debug:', {
      reportCategory,
      request,
      isCompatibilityReport,
      showSecondPerson
    });
  }, [reportCategory, request, isCompatibilityReport, showSecondPerson]);

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



  return (
    <div className="bg-white">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-center px-6 py-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
              Your <em className="italic font-light">Info</em>
            </h1>
            <p className="text-lg text-gray-500 font-light leading-relaxed max-w-md mx-auto">
              {isCompatibilityReport
                ? "We need both people's details for your compatibility report"
                : 'We need these to create your personalised report'}
            </p>
          </div>
        </div>

        {/* Person‑1 */}
        <div className="px-6">
          <PersonCard
            personNumber={1}
            title={isCompatibilityReport ? 'Your Details' : 'Your Details'}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            hasTriedToSubmit={false}
          />
        </div>

        {/* Add partner */}
        {isCompatibilityReport && !showSecondPerson && isFirstPersonComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6"
          >
            <button
              onClick={() => setShowSecondPerson(true)}
              className="w-full bg-gray-900 text-white px-12 py-4 rounded-xl text-lg font-light hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5 mr-3 inline" />
              Add Partner's Details
            </button>
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
              className="px-6"
            >
              <PersonCard
                personNumber={2}
                title="Partner's Details"
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
                hasTriedToSubmit={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
});

export default Step2BirthDetails;
