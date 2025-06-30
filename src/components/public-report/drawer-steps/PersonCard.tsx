
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { ReportFormData } from '@/types/public-report';
import MobilePickerModal from '@/components/ui/mobile-pickers/MobilePickerModal';
import MobileDatePicker from '@/components/ui/mobile-pickers/MobileDatePicker';
import MobileTimePicker from '@/components/ui/mobile-pickers/MobileTimePicker';
import PlaceAutocomplete from '@/components/shared/forms/place-input/PlaceAutocomplete';

interface PersonCardProps {
  personNumber: 1 | 2;
  title: string;
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  hasTriedToSubmit: boolean;
}

const PersonCard = ({ 
  personNumber, 
  title, 
  register, 
  setValue, 
  watch, 
  errors, 
  hasTriedToSubmit 
}: PersonCardProps) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const isSecondPerson = personNumber === 2;
  const prefix = isSecondPerson ? 'secondPerson' : '';

  // Field names based on person number
  const nameField = isSecondPerson ? 'secondPersonName' : 'name' as keyof ReportFormData;
  const emailField = isSecondPerson ? 'secondPersonEmail' : 'email' as keyof ReportFormData;
  const birthDateField = isSecondPerson ? 'secondPersonBirthDate' : 'birthDate' as keyof ReportFormData;
  const birthTimeField = isSecondPerson ? 'secondPersonBirthTime' : 'birthTime' as keyof ReportFormData;
  const birthLocationField = isSecondPerson ? 'secondPersonBirthLocation' : 'birthLocation' as keyof ReportFormData;

  // Watch values
  const name = watch(nameField);
  const email = !isSecondPerson ? watch('email') : '';
  const birthDate = watch(birthDateField);
  const birthTime = watch(birthTimeField);
  const birthLocation = watch(birthLocationField);

  const handleDateConfirm = () => {
    setDatePickerOpen(false);
  };

  const handleTimeConfirm = () => {
    setTimePickerOpen(false);
  };

  const handlePlaceSelect = (placeData: any) => {
    setValue(birthLocationField, placeData.name);
    if (isSecondPerson) {
      setValue('secondPersonLatitude', placeData.latitude);
      setValue('secondPersonLongitude', placeData.longitude);
      setValue('secondPersonPlaceId', placeData.placeId);
    } else {
      setValue('birthLatitude', placeData.latitude);
      setValue('birthLongitude', placeData.longitude);
      setValue('birthPlaceId', placeData.placeId);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor={nameField}>Full Name</Label>
            <Input
              id={nameField}
              {...register(nameField)}
              placeholder="Enter full name"
              className={errors[nameField] && hasTriedToSubmit ? 'border-red-500' : ''}
            />
            {errors[nameField] && hasTriedToSubmit && (
              <p className="text-sm text-red-500">{errors[nameField]?.message}</p>
            )}
          </div>

          {/* Email Field - Only for first person */}
          {!isSecondPerson && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email address"
                className={errors.email && hasTriedToSubmit ? 'border-red-500' : ''}
              />
              {errors.email && hasTriedToSubmit && (
                <p className="text-sm text-red-500">{errors.email?.message}</p>
              )}
            </div>
          )}

          {/* Birth Date Field */}
          <div className="space-y-2">
            <Label>Birth Date</Label>
            <Button
              type="button"
              variant="outline"
              className={`w-full justify-start text-left font-normal ${
                !birthDate ? 'text-muted-foreground' : ''
              } ${errors[birthDateField] && hasTriedToSubmit ? 'border-red-500' : ''}`}
              onClick={() => setDatePickerOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {birthDate ? formatDisplayDate(birthDate) : 'Select birth date'}
            </Button>
            {errors[birthDateField] && hasTriedToSubmit && (
              <p className="text-sm text-red-500">{errors[birthDateField]?.message}</p>
            )}
          </div>

          {/* Birth Time Field */}
          <div className="space-y-2">
            <Label>Birth Time</Label>
            <Button
              type="button"
              variant="outline"
              className={`w-full justify-start text-left font-normal ${
                !birthTime ? 'text-muted-foreground' : ''
              } ${errors[birthTimeField] && hasTriedToSubmit ? 'border-red-500' : ''}`}
              onClick={() => setTimePickerOpen(true)}
            >
              <Clock className="mr-2 h-4 w-4" />
              {birthTime ? formatDisplayTime(birthTime) : 'Select birth time'}
            </Button>
            {errors[birthTimeField] && hasTriedToSubmit && (
              <p className="text-sm text-red-500">{errors[birthTimeField]?.message}</p>
            )}
          </div>

          {/* Birth Location Field */}
          <div className="space-y-2">
            <Label>Birth Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <PlaceAutocomplete
                value={birthLocation || ''}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Enter birth city"
                className={`pl-10 ${errors[birthLocationField] && hasTriedToSubmit ? 'border-red-500' : ''}`}
              />
            </div>
            {errors[birthLocationField] && hasTriedToSubmit && (
              <p className="text-sm text-red-500">{errors[birthLocationField]?.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date Picker Modal */}
      <MobilePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={handleDateConfirm}
        title="Select Birth Date"
      >
        <MobileDatePicker
          value={birthDate || ''}
          onChange={(date) => setValue(birthDateField, date)}
        />
      </MobilePickerModal>

      {/* Time Picker Modal */}
      <MobilePickerModal
        isOpen={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        onConfirm={handleTimeConfirm}
        title="Select Birth Time"
      >
        <MobileTimePicker
          value={birthTime || ''}
          onChange={(time) => setValue(birthTimeField, time)}
        />
      </MobilePickerModal>
    </>
  );
};

export default PersonCard;
