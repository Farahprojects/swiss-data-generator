
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
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

const Step2BirthDetails = ({ register, setValue, watch, errors, onNext, onPrev }: Step2BirthDetailsProps) => {
  const [showSecondPerson, setShowSecondPerson] = useState(false);
  const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);

  const reportType = watch('reportType');
  const isCompatibilityReport = reportType === 'sync';

  // Watch first person fields
  const name = watch('name');
  const email = watch('email');
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');
  const birthLocation = watch('birthLocation');

  // Watch second person fields
  const secondPersonName = watch('secondPersonName');
  const secondPersonBirthDate = watch('secondPersonBirthDate');
  const secondPersonBirthTime = watch('secondPersonBirthTime');
  const secondPersonBirthLocation = watch('secondPersonBirthLocation');

  const isFirstPersonComplete = name && email && birthDate && birthTime && birthLocation;
  const isSecondPersonComplete = secondPersonName && secondPersonBirthDate && secondPersonBirthTime && secondPersonBirthLocation;

  const canProceed = isCompatibilityReport 
    ? (isFirstPersonComplete && isSecondPersonComplete)
    : isFirstPersonComplete;

  const handleAddSecondPerson = () => {
    setShowSecondPerson(true);
  };

  const scrollToFirstError = () => {
    // Find the first error field and scroll to it
    const errorFields = [
      { field: 'name', element: document.querySelector('#name') },
      { field: 'email', element: document.querySelector('#email') },
      { field: 'birthDate', element: document.querySelector('#birthDate') },
      { field: 'birthTime', element: document.querySelector('#birthTime') },
      { field: 'birthLocation', element: document.querySelector('#birthLocation') },
      { field: 'secondPersonName', element: document.querySelector('#secondPersonName') },
      { field: 'secondPersonBirthDate', element: document.querySelector('#secondPersonBirthDate') },
      { field: 'secondPersonBirthTime', element: document.querySelector('#secondPersonBirthTime') },
      { field: 'secondPersonBirthLocation', element: document.querySelector('#secondPersonBirthLocation') },
    ];

    for (const { field, element } of errorFields) {
      if (errors[field as keyof FieldErrors<ReportFormData>] && element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        break;
      }
    }
  };

  const handleReviewAndPay = () => {
    setHasTriedToSubmit(true);
    
    // Check if form is valid before proceeding
    if (canProceed) {
      onNext();
    } else {
      // Scroll to first error after a brief delay to allow error states to update
      setTimeout(() => {
        scrollToFirstError();
      }, 100);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Birth Details</h2>
          <p className="text-gray-600">
            {isCompatibilityReport 
              ? "We need both people's details for your compatibility report" 
              : "We need these to create your personalized report"
            }
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* First Person Card */}
        <PersonCard
          personNumber={1}
          title={isCompatibilityReport ? "Your Details" : "Your Birth Details"}
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
          hasTriedToSubmit={hasTriedToSubmit}
        />

        {/* Add Second Person Button */}
        {isCompatibilityReport && !showSecondPerson && isFirstPersonComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={handleAddSecondPerson}
              variant="outline"
              className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Partner's Details
            </Button>
          </motion.div>
        )}

        {/* Second Person Card */}
        <AnimatePresence>
          {isCompatibilityReport && showSecondPerson && (
            <motion.div
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
                hasTriedToSubmit={hasTriedToSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Review & Pay Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={handleReviewAndPay}
          variant="outline"
          className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
          size="lg"
        >
          Review & Pay
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default Step2BirthDetails;
