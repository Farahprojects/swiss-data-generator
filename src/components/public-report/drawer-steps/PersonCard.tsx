import React, { useState } from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors,
} from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import {
  MobilePickerModal,
  MobileDatePicker,
  MobileTimePicker,
} from '@/components/ui/mobile-pickers';
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

/**
 * A reusable card collecting the birth data for a person (A or B).
 * The biggest UX pain‑point we had was the mobile “date / time” buttons not
 * aligning nicely with the surrounding inputs – the text could spill outside
 * the outline and the icon/text pair were not vertically centred.
 *
 * Fixes applied:
 *  1. Re‑styled the <Button> used as the display for date & time so that it
 *     behaves like an Input (same height, padding, radius).
 *  2. Explicit flex container inside Button to guarantee icon + label stay
 *     centred and truncates gracefully when the label is long.
 *  3. Minor a11y improvements (aria‑labels on the buttons).
 */
const PersonCard = ({
  personNumber,
  title,
  register,
  setValue,
  watch,
  errors,
}: PersonCardProps) => {
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

  // ---------------------------------------------------------------------------
  // Helpers – names, errors & formatting
  // ---------------------------------------------------------------------------

  const name = watch(isSecondPerson ? 'secondPersonName' : 'name') || '';
  const email = watch('email') || '';
  const birthDate =
    watch(isSecondPerson ? 'secondPersonBirthDate' : 'birthDate') || '';
  const birthTime =
    watch(isSecondPerson ? 'secondPersonBirthTime' : 'birthTime') || '';
  const birthLocation =
    watch(isSecondPerson ? 'secondPersonBirthLocation' : 'birthLocation') || '';

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted((prev) => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (
    fieldName: keyof typeof hasInteracted,
    error: any
  ) => hasInteracted[fieldName] && error;

  const getFieldName = (field: string) =>
    isSecondPerson
      ? (`secondPerson${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof DrawerFormData)
      : (field as keyof DrawerFormData);

  const getError = (field: string) => {
    const fieldName = getFieldName(field);
    return errors[fieldName as keyof DrawerFormData];
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en‑US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeForDisplay = (timeStr: string) => {
    if (!timeStr) return 'Select time';
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  };

  const handleDateChange = (date: string) => {
    setValue(getFieldName('birthDate'), date);
    setHasInteracted((prev) => ({ ...prev, birthDate: true }));
  };

  const handleTimeChange = (time: string) => {
    setValue(getFieldName('birthTime'), time);
    setHasInteracted((prev) => ({ ...prev, birthTime: true }));
  };

  const handlePlaceSelect = (placeData: PlaceData) => {
    const locationField = `${prefix}${prefix ? 'B' : 'b'}irthLocation` as keyof DrawerFormData;
    const latField = `${prefix}${prefix ? 'L' : 'birthL'}atitude` as keyof DrawerFormData;
    const lngField = `${prefix}${prefix ? 'L' : 'birthL'}ongitude` as keyof DrawerFormData;
    const placeIdField = `${prefix}${prefix ? 'P' : 'birthP'}laceId` as keyof DrawerFormData;

    setValue(locationField, placeData.name);
    setHasInteracted((prev) => ({ ...prev, birthLocation: true }));

    if (placeData.latitude && placeData.longitude) {
      setValue(latField, placeData.latitude);
      setValue(lngField, placeData.longitude);
    }

    if (placeData.placeId) {
      setValue(placeIdField, placeData.placeId);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers – so we don’t repeat the flex wrapper twice
  // ---------------------------------------------------------------------------

  const RenderPickerButton = (
    {
      label,
      icon: Icon,
      onClick,
      aria,
    }: {
      label: string;
      icon: typeof Calendar | typeof Clock;
      onClick: () => void;
      aria: string;
    },
  ) => (
    <Button
      type="button"
      variant="outline"
      aria-label={aria}
      className="w-full h-12 px-3 flex items-center gap-2 overflow-hidden"
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-left font-normal grow">{label}</span>
    </Button>
  );

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <>
      <Card className="border-2 border-primary/20 w-full max-w-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          {/* NAME */}
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
              <p className="text-sm text-red-500">
                {getError('name')?.message as string}
              </p>
            )}
          </div>

          {/* EMAIL – only for first person */}
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
                <p className="text-sm text-red-500">
                  {errors.email?.message as string}
                </p>
              )}
            </div>
          )}

          {/* DATE & TIME */}
          <div className="grid grid-cols-2 gap-6">
            {/* DATE */}
            <div className="space-y-2">
              <Label htmlFor={`${prefix}birthDate`}>Birth Date *</Label>
              {isMobile ? (
                <RenderPickerButton
                  label={formatDateForDisplay(birthDate)}
                  icon={Calendar}
                  onClick={() => setDatePickerOpen(true)}
                  aria="Open date picker"
                />
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
                <p className="text-sm text-red-500">
                  {getError('birthDate')?.message as string}
                </p>
              )}
            </div>

            {/* TIME */}
            <div className="space-y-2">
              <Label htmlFor={`${prefix}birthTime`}>Birth Time *</Label>
              {isMobile ? (
                <RenderPickerButton
                  label={formatTimeForDisplay(birthTime)}
                  icon={Clock}
                  onClick={() => setTimePickerOpen(true)}
                  aria="Open time picker"
                />
              ) : (
                <Input
                  id={`${prefix}birthTime`}
                  type="time"
                  step="60"
                  {...register(getFieldName('birthTime'))}
                  className="h-12"
                  onFocus={() => handleFieldInteraction('birthTime')}
                  onBlur={() => handleFieldInteraction('birthTime')}
                />
              )}
              {shouldShowError('birthTime', getError('birthTime')) && (
                <p className="text-sm text-red-500">
                  {getError('birthTime')?.message as string}
                </p>
              )}
            </div>
          </div>

          {/* LOCATION */}
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
              error={shouldShowError('birthLocation', getError('birthLocation'))
                ? (getError('birthLocation')?.message as string)
                : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* MOBILE PICKER MODALS -------------------------------------------------- */}
      <MobilePickerModal
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={() => setDatePickerOpen(false)}
        title="Select Birth Date"
      >
        <MobileDatePicker value={birthDate} onChange={handleDateChange} />
      </MobilePickerModal>

      <MobilePickerModal
        isOpen={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        onConfirm={() => setTimePickerOpen(false)}
        title="Select Birth Time"
      >
        <MobileTimePicker value={birthTime} onChange={handleTimeChange} />
      </MobilePickerModal>
    </>
  );
};

export default PersonCard;
