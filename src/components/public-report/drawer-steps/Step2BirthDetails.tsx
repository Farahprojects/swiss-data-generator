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


interface Step2BirthDetailsProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onNext?: () => void;
}

const Step2BirthDetails: React.FC<Step2BirthDetailsProps> = React.memo(({
  register,
  setValue,
  watch,
  errors,
  onNext,
}) => {
  const topSafePadding = useMobileSafeTopPadding();
  const reportCategory = watch('reportCategory');
  const request = watch('request');
  const isCompatibilityReport = reportCategory === 'compatibility' || request === 'sync';
  
  // State to manage which autocomplete is enabled (for mobile sequential loading)
  const [person1LocationSelected, setPerson1LocationSelected] = React.useState(false);
  
  // Watch for person 1 location to enable person 2 autocomplete
  const person1Location = watch('birthLocation');
  
  // Watch birth date and time for auto-scroll
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');
  
  React.useEffect(() => {
    if (person1Location && person1Location.trim().length > 0) {
      setPerson1LocationSelected(true);
    }
  }, [person1Location]);
  
  // Auto-scroll to birth location when both birth date and time are filled
  React.useEffect(() => {
    if (birthDate && birthTime) {
      setTimeout(() => {
        const locationField = document.querySelector('[data-birth-location]');
        if (locationField) {
          locationField.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300);
    }
  }, [birthDate, birthTime]);

  // Removed problematic auto-scroll logic that was causing step navigation issues
  
  // Callback when person 1 selects a location
  const handlePerson1PlaceSelect = () => {
    setPerson1LocationSelected(true);
  };

  return (
    <div className="bg-white">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="space-y-12"
        style={{ paddingTop: `${topSafePadding + 24}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-6 py-8">
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
            onPlaceSelect={handlePerson1PlaceSelect}
          />
        </div>

        {/* Person‑2 */}
        {isCompatibilityReport && (
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
                // Auto-advance to payment step when second person location is filled
                setTimeout(() => {
                  const formData = watch();
                  const secondPersonRequiredFields = ['secondPersonName', 'secondPersonBirthDate', 'secondPersonBirthTime', 'secondPersonBirthLocation'];
                  const isComplete = secondPersonRequiredFields.every(field => {
                    const value = formData[field as keyof typeof formData];
                    return value && value.toString().trim().length > 0;
                  });
                  
                  if (isComplete && onNext) {
                    onNext();
                  }
                }, 300); // Increased delay to ensure form values are properly updated
              }}
            />
          </div>
        )}

      </motion.div>
    </div>
  );
});

Step2BirthDetails.displayName = 'Step2BirthDetails';

export default Step2BirthDetails;