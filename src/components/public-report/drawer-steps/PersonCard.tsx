
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { MobilePickerModal, MobileDatePicker, MobileTimePicker } from '@/components/ui/mobile-pickers';
import { useIsMobile } from '@/hooks/use-mobile';
import { DrawerFormData } from '@/hooks/useMobileDrawerForm';

interface PersonCardProps {
  personNumber: 1 | 2;
  title: string;
  register: UseFormRegister<DrawerFormData>;
  setValue: UseFormSetValue<DrawerFormData>;
  watch: UseFormWatch<DrawerFormData>;
  errors: FieldErrors<DrawerFormData>;
}

const PersonCard = ({ personNumber, title, register, setValue, watch, errors }: PersonCardProps) => {
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    email: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false,
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const isMobile = useIsMobile();
  const isSecondPerson = personNumber === 2;
  const prefix = isSecondPerson ? 'secondPerson' : '';
  
  // Watch values with proper field names
  const name = watch(isSecondPerson ? 'secondPersonName' : 'name') || '';
  const email = watch('email') || '';
  const birthDate = watch(isSecondPerson ? 'secondPersonBirthDate' : 'birthDate') || '';
  const birthTime = watch(isSecondPerson ? 'secondPersonBirthTime' : 'birthTime') || '';
  const birthLocation = watch(isSecondPerson ? 'secondPersonBirthLocation' : 'birthLocation') || '';

  const handlePlaceSelect = (placeData: PlaceData) => {
    const locationField = `${prefix}${prefix ? 'B' : 'b'}irthLocation` as keyof DrawerFormData;
    const latField = `${prefix}${prefix ? 'L' : 'birthL'}atitude` as keyof DrawerFormData;
    const lngField = `${prefix}${prefix ? 'L' : 'birthL'}ongitude` as keyof DrawerFormData;
    const placeIdField = `${prefix}${prefix ? 'P' : 'birthP'}laceId` as keyof DrawerFormData;
    
    setValue(locationField, placeData.name);
    setHasInteracted(prev => ({ ...prev, birthLocation: true }));
    
    if (placeData.latitude && placeData.longitude) {
      setValue(latField, placeData.latitude);
      setValue(lngField, placeData.longitude);
    }
    
    if (placeData.placeId) {
      setValue(placeIdField, placeData.placeId);
    }
  };

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (fieldName: keyof typeof hasInteracted, error: any) => {
    return hasInteracted[fieldName] && error;
  };

  const getFieldName = (field: string) => {
    if (isSecondPerson) {
      return `secondPerson${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof DrawerFormData;
    }
    return field as keyof DrawerFormData;
  };

  const getError = (field: string) => {
    const fieldName = getFieldName(field);
    return errors[fieldName];
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr) return 'Select time';
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  const handleDateChange = (date: string) => {
    const dateField = getFieldName('birthDate');
    setValue(dateField, date);
    setHasInteracted(prev => ({ ...prev, birthDate: true }));
  };

  const handleTimeChange = (time: string) => {
    const timeField = getFieldName('birthTime');
    setValue(timeField, time);
    setHasInteracted(prev => ({ ...prev, birthTime: true }));
  };

  return (
    <>
      <Card className="border-2 border-primary/20 max-w-none w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}name`}>Full Name *</Label>
            <Input
              id={`${prefix}name`}
              {...register(getFieldName('name'))}
              placeholder="Enter full name"
              className="h-12"
              onFocus={() => handleFieldInteraction('name')}
              onBlur={() => handleFieldInteraction('name')}
            />
            {shouldShowError('name', getError('name')) && (
              <p className="text-sm text-red-500">{getError('name')?.message}</p>
            )}
          </div>

          {!isSecondPerson && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                className="h-12"
                onFocus={() => handleFieldInteraction('email')}
                onBlur={() => handleFieldInteraction('email')}
              />
              {shouldShowError('email', errors.email) && (
                <p className="text-sm text-red-500">{errors.email?.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor={`${prefix}birthDate`}>Birth Date *</Label>
              {isMobile ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 justify-start text-left font-normal"
                  onClick={() => setDatePickerOpen(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDateForDisplay(birthDate)}
                </Button>
              ) : (
                <Input
                  id={`${prefix}birthDate`}
                  type="date"
                  {...register(getFieldName('birthDate'))}
                  className="h-12"
                  onFocus={() => handleFieldInteraction('birthDate')}
                  onBlur={() => handleFieldInteraction('birthDate')}
                />
              )}
              {shouldShowError('birthDate', getError('birthDate')) && (
                <p className="text-sm text-red-500">{getError('birthDate')?.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${prefix}birthTime`}>Birth Time *</Label>
              {isMobile ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 justify-start text-left font-normal"
                  onClick={() => setTimePickerOpen(true)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {formatTimeForDisplay(birthTime)}
                </Button>
              ) : (
                <Input
                  id={`${prefix}birthTime`}
                  type="time"
                  {...register(getFieldName('birthTime'))}
                  step="60"
                  className="h-12"
                  onFocus={() => handleFieldInteraction('birthTime')}
                  onBlur={() => handleFieldInteraction('birthTime')}
                />
              )}
              {shouldShowError('birthTime', getError('birthTime')) && (
                <p className="text-sm text-red-500">{getError('birthTime')?.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <PlaceAutocomplete
              label="Birth Location *"
              value={birthLocation}
              onChange={(value) => {
                const locationField = `${prefix}${prefix ? 'B' : 'b'}irthLocation` as keyof DrawerFormData;
                setValue(locationField, value);
                if (!hasInteracted.birthLocation && value) {
                  handleFieldInteraction('birthLocation');
                }
              }}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Enter birth city, state, country"
              id={`${prefix}birthLocation`}
              error={shouldShowError('birthLocation', getError('birthLocation')) ? getError('birthLocation')?.message : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile Date Picker Modal */}
      <MobilePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={() => setDatePickerOpen(false)}
        title="Select Birth Date"
      >
        <MobileDatePicker
          value={birthDate}
          onChange={handleDateChange}
        />
      </MobilePickerModal>

      {/* Mobile Time Picker Modal */}
      <MobilePickerModal
        isOpen={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        onConfirm={() => setTimePickerOpen(false)}
        title="Select Birth Time"
      >
        <MobileTimePicker
          value={birthTime}
          onChange={handleTimeChange}
        />
      </MobilePickerModal>
    </>
  );
};

export default PersonCard;
