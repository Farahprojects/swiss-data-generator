
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from "@/components/calendar/DateTimePicker";
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import MobileDatePicker from '@/components/ui/mobile-pickers/MobileDatePicker';
import MobileTimePicker from '@/components/ui/mobile-pickers/MobileTimePicker';
import MobilePickerModal from '@/components/ui/mobile-pickers/MobilePickerModal';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';

interface Step2BirthDetailsProps {
  register: UseFormRegister<DrawerFormData>;
  setValue: UseFormSetValue<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
  onNext: () => void;
  onPrev: () => void;
}

const Step2BirthDetails = ({ 
  register, 
  setValue, 
  watch, 
  errors, 
  onNext, 
  onPrev 
}: Step2BirthDetailsProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const reportCategory = watch('reportCategory');
  const reportSubCategory = watch('reportSubCategory');
  const name = watch('name');
  const email = watch('email');
  const birthDate = watch('birthDate');
  const birthTime = watch('birthTime');
  const birthLocation = watch('birthLocation');

  const isCompatibilityReport = reportCategory === 'compatibility';
  const isFormValid = name && email && birthDate && birthTime && birthLocation;

  const handleContinue = () => {
    if (isFormValid) {
      onNext();
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
  };

  const handleTimeConfirm = () => {
    setShowTimePicker(false);
  };

  return (
    <>
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
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {isCompatibilityReport ? 'Your Details' : 'Birth Details'}
            </h2>
            <p className="text-gray-600">Tell us about yourself</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter your full name"
              className="h-12"
              autoComplete="name"
              inputMode="text"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter your email"
              className="h-12"
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Birth Date
            </Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDatePicker(true)}
              className="w-full h-12 justify-start text-left font-normal"
            >
              {birthDate ? new Date(birthDate).toLocaleDateString() : 'Select birth date'}
            </Button>
            {errors.birthDate && (
              <p className="text-sm text-red-500">{errors.birthDate.message}</p>
            )}
          </div>

          {/* Birth Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Birth Time
            </Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTimePicker(true)}
              className="w-full h-12 justify-start text-left font-normal"
            >
              {birthTime ? birthTime : 'Select birth time'}
            </Button>
            {errors.birthTime && (
              <p className="text-sm text-red-500">{errors.birthTime.message}</p>
            )}
          </div>

          {/* Birth Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Birth Location
            </Label>
            <PlaceAutocomplete
              value={birthLocation}
              onChange={(location) => setValue('birthLocation', location)}
              onPlaceSelect={(placeData) => {
                setValue('birthLocation', placeData.name);
                setValue('birthLatitude', placeData.latitude);
                setValue('birthLongitude', placeData.longitude);
                setValue('birthPlaceId', placeData.placeId);
              }}
              placeholder="Enter birth city/location"
              className="h-12"
            />
            {errors.birthLocation && (
              <p className="text-sm text-red-500">{errors.birthLocation.message}</p>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!isFormValid}
          className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50"
          size="lg"
        >
          Continue
        </Button>
      </motion.div>

      {/* Date Picker Modal */}
      <MobilePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateConfirm}
        title="Select Birth Date"
      >
        <MobileDatePicker
          value={birthDate || ''}
          onChange={(date) => setValue('birthDate', date)}
        />
      </MobilePickerModal>

      {/* Time Picker Modal */}
      <MobilePickerModal
        isOpen={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={handleTimeConfirm}
        title="Select Birth Time"
      >
        <MobileTimePicker
          value={birthTime || ''}
          onChange={(time) => setValue('birthTime', time)}
        />
      </MobilePickerModal>
    </>
  );
};

export default Step2BirthDetails;
