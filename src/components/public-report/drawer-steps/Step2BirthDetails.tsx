
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';
import PersonCard from './PersonCard';

interface Step2BirthDetailsProps {
  register: UseFormRegister<DrawerFormData>;
  setValue: UseFormSetValue<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const Step2BirthDetails = ({ register, setValue, watch, errors, onNext, onPrev }: Step2BirthDetailsProps) => {
  const [showSecondPerson, setShowSecondPerson] = useState(false);

  const reportCategory = watch('reportCategory');
  const isCompatibilityReport = reportCategory === 'compatibility';

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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Next Button */}
      {canProceed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={onNext}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
            size="lg"
          >
            Review & Pay
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step2BirthDetails;
