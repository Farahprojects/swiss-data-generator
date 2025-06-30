
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { MobileDatePicker, MobileTimePicker } from '@/components/ui/mobile-pickers';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';

interface PersonCardProps {
  personNumber: 1 | 2;
  title: string;
  register: UseFormRegister<DrawerFormData>;
  setValue: UseFormSetValue<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
  hasTriedToSubmit: boolean;
  onPickerStateChange?: (isOpen: boolean) => void;
}

const PersonCard = ({
  personNumber,
  title,
  register,
  setValue,
  watch,
  errors,
  hasTriedToSubmit,
  onPickerStateChange
}: PersonCardProps) => {
  const [activePickerModal, setActivePickerModal] = useState<string | null>(null);

  const handlePickerOpen = (pickerId: string) => {
    setActivePickerModal(pickerId);
    onPickerStateChange?.(true);
  };

  const handlePickerClose = () => {
    setActivePickerModal(null);
    onPickerStateChange?.(false);
  };

  // Field name prefixes based on person number
  const nameField = personNumber === 1 ? 'name' : 'secondPersonName';
  const emailField = personNumber === 1 ? 'email' : 'secondPersonEmail';
  const birthDateField = personNumber === 1 ? 'birthDate' : 'secondPersonBirthDate';
  const birthTimeField = personNumber === 1 ? 'birthTime' : 'secondPersonBirthTime';
  const birthLocationField = personNumber === 1 ? 'birthLocation' : 'secondPersonBirthLocation';
  const birthLatitudeField = personNumber === 1 ? 'birthLatitude' : 'secondPersonLatitude';
  const birthLongitudeField = personNumber === 1 ? 'birthLongitude' : 'secondPersonLongitude';
  const birthPlaceIdField = personNumber === 1 ? 'birthPlaceId' : 'secondPersonPlaceId';

  // Watch field values
  const birthDate = watch(birthDateField);
  const birthTime = watch(birthTimeField);
  const birthLocation = watch(birthLocationField);

  const handlePlaceSelect = (location: string, lat: number, lng: number, placeId: string) => {
    setValue(birthLocationField, location);
    setValue(birthLatitudeField, lat);
    setValue(birthLongitudeField, lng);
    setValue(birthPlaceIdField, placeId);
  };

  const handleLocationChange = (value: string) => {
    setValue(birthLocationField, value);
  };

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor={nameField} className="text-sm font-medium text-gray-700">
            Full Name
          </Label>
          <Input
            id={nameField}
            {...register(nameField as any)}
            placeholder="Enter full name"
            className={`${
              hasTriedToSubmit && errors[nameField as keyof FieldErrors<DrawerFormData>]
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300'
            }`}
            autoComplete="name"
          />
          {hasTriedToSubmit && errors[nameField as keyof FieldErrors<DrawerFormData>] && (
            <p className="text-sm text-red-600">Name is required</p>
          )}
        </div>

        {/* Email Field - Only for first person */}
        {personNumber === 1 && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="your@email.com"
              className={`${
                hasTriedToSubmit && errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300'
              }`}
              autoComplete="email"
              inputMode="email"
            />
            {hasTriedToSubmit && errors.email && (
              <p className="text-sm text-red-600">Valid email is required</p>
            )}
          </div>
        )}

        {/* Birth Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Birth Date
          </Label>
          <MobileDatePicker
            value={birthDate}
            onChange={(date) => setValue(birthDateField, date)}
            placeholder="Select birth date"
            className={`${
              hasTriedToSubmit && errors[birthDateField as keyof FieldErrors<DrawerFormData>]
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            onModalStateChange={(isOpen) => {
              if (isOpen) {
                handlePickerOpen(`date-${personNumber}`);
              } else {
                handlePickerClose();
              }
            }}
            disableBackdropClose={activePickerModal === `date-${personNumber}`}
          />
          {hasTriedToSubmit && errors[birthDateField as keyof FieldErrors<DrawerFormData>] && (
            <p className="text-sm text-red-600">Birth date is required</p>
          )}
        </div>

        {/* Birth Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Birth Time
          </Label>
          <MobileTimePicker
            value={birthTime}
            onChange={(time) => setValue(birthTimeField, time)}
            placeholder="Select birth time"
            className={`${
              hasTriedToSubmit && errors[birthTimeField as keyof FieldErrors<DrawerFormData>]
                ? 'border-red-500'
                : 'border-gray-300'
            }`}
            onModalStateChange={(isOpen) => {
              if (isOpen) {
                handlePickerOpen(`time-${personNumber}`);
              } else {
                handlePickerClose();
              }
            }}
            disableBackdropClose={activePickerModal === `time-${personNumber}`}
          />
          {hasTriedToSubmit && errors[birthTimeField as keyof FieldErrors<DrawerFormData>] && (
            <p className="text-sm text-red-600">Birth time is required</p>
          )}
        </div>

        {/* Birth Location */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            Birth Location
          </Label>
          <PlaceAutocomplete
            value={birthLocation || ''}
            onChange={handleLocationChange}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Enter birth city"
            className={`${
              hasTriedToSubmit && errors[birthLocationField as keyof FieldErrors<DrawerFormData>]
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300'
            }`}
          />
          {hasTriedToSubmit && errors[birthLocationField as keyof FieldErrors<DrawerFormData>] && (
            <p className="text-sm text-red-600">Birth location is required</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonCard;
