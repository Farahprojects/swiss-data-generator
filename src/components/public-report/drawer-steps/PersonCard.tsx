import React, { useState } from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
  FieldErrors
} from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFieldFocusHandler } from '@/hooks/useFieldFocusHandler';
import { ReportFormData } from '@/types/public-report';

interface PersonCardProps {
  personNumber: 1 | 2;
  title: string;
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  hasTriedToSubmit: boolean;
  autocompleteDisabled?: boolean;
  helperText?: string;
  onPlaceSelect?: () => void;
}

const PersonCard = ({
  personNumber,
  title,
  register,
  setValue,
  watch,
  errors,
  hasTriedToSubmit,
  autocompleteDisabled = false,
  helperText,
  onPlaceSelect,
}: PersonCardProps) => {
  const isMobile = useIsMobile();
  const isSecondPerson = personNumber === 2;
  const prefix = isSecondPerson ? 'secondPerson' : '';
  const { scrollTo } = useFieldFocusHandler();

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeSelector, setActiveSelector] = useState<'date' | 'time' | null>(null);

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));
  const showError = (field: string) => (hasTriedToSubmit || touched[field]) && errors[field];

  // Removed handleFocus to prevent unwanted scrolling
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // No longer scrolling to element - let user control scrolling
  };

  const handleBlur = (field: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    markTouched(field);
  };

  const getField = (name: string) => isSecondPerson ? `secondPerson${name.charAt(0).toUpperCase() + name.slice(1)}` : name;

  const handlePlaceSelect = (place: PlaceData) => {
    const loc = getField('birthLocation') as keyof ReportFormData;
    const latField = isSecondPerson ? 'secondPersonLatitude' : 'birthLatitude';
    const lngField = isSecondPerson ? 'secondPersonLongitude' : 'birthLongitude';
    const placeIdField = isSecondPerson ? 'secondPersonPlaceId' : 'birthPlaceId';

    console.log(`🗺️ [PlaceSelect] Person ${personNumber} selected place:`, place);
    console.log(`🗺️ [PlaceSelect] Person ${personNumber} lat/lng:`, place.latitude, place.longitude);
    
    // Use the name property from PlaceData interface
    setValue(loc, place.name, { shouldDirty: true, shouldValidate: true });
    if (place.latitude) setValue(latField as keyof ReportFormData, place.latitude, { shouldDirty: true, shouldValidate: true });
    if (place.longitude) setValue(lngField as keyof ReportFormData, place.longitude, { shouldDirty: true, shouldValidate: true });
    if (place.placeId) setValue(placeIdField as keyof ReportFormData, place.placeId, { shouldDirty: true, shouldValidate: true });

    console.log(`✅ Person ${personNumber} location data saved with fields:`, {
      location: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      placeId: place.placeId,
      latField,
      lngField,
      placeIdField
    });

    (document.activeElement as HTMLElement)?.blur?.();

    onPlaceSelect?.();
  };

  const ErrorMsg = ({ msg }: { msg: string }) => (
    <div className="text-sm text-red-500 mt-1 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span>{msg}</span>
    </div>
  );

  return (
    <div className="bg-white w-full mb-8" data-person={personNumber}>

      <div className="space-y-8">
        <div className="space-y-3">
          <Label htmlFor={`${prefix}name`} className="text-lg font-light text-gray-700">Full Name *</Label>
          <Input
            id={`${prefix}name`}
            {...register(getField('name') as keyof ReportFormData)}
            placeholder="Enter full name"
            className={`h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 ${showError(getField('name')) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            onFocus={handleFocus}
            onBlur={handleBlur(getField('name'))}
            inputMode="text"
            autoComplete="off"
            style={{ fontSize: '16px' }}
          />
          {showError(getField('name')) && <ErrorMsg msg={errors[getField('name')]?.message as string} />}
        </div>

        {!isSecondPerson && (
          <div className="space-y-3">
            <Label htmlFor="email" className="text-lg font-light text-gray-700">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="your@email.com"
              className={`h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 ${showError('email') ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              onFocus={handleFocus}
              onBlur={handleBlur('email')}
              inputMode="email"
              autoComplete="off"
              style={{ fontSize: '16px' }}
            />
            {showError('email') && <ErrorMsg msg={errors.email?.message as string} />}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor={`${prefix}birthDate`} className="text-lg font-light text-gray-700">Birth Date *</Label>
            <InlineDateTimeSelector
              type="date"
              value={watch(getField('birthDate') as keyof ReportFormData) as string}
              onChange={(date) => setValue(getField('birthDate') as keyof ReportFormData, date)}
              onConfirm={() => {
                markTouched(getField('birthDate'));
                setActiveSelector(null);
              }}
              onCancel={() => setActiveSelector(null)}
              isOpen={activeSelector === 'date'}
              placeholder="Select date"
              hasError={!!showError(getField('birthDate'))}
              onOpen={() => setActiveSelector('date')}
            />
            {showError(getField('birthDate')) && <ErrorMsg msg={errors[getField('birthDate')]?.message as string} />}
          </div>

          <div className="space-y-3">
            <Label htmlFor={`${prefix}birthTime`} className="text-lg font-light text-gray-700">Birth Time *</Label>
            <InlineDateTimeSelector
              type="time"
              value={watch(getField('birthTime') as keyof ReportFormData) as string}
              onChange={(time) => setValue(getField('birthTime') as keyof ReportFormData, time)}
              onConfirm={() => {
                markTouched(getField('birthTime'));
                setActiveSelector(null);
              }}
              onCancel={() => setActiveSelector(null)}
              isOpen={activeSelector === 'time'}
              placeholder="Select time"
              hasError={!!showError(getField('birthTime'))}
              onOpen={() => setActiveSelector('time')}
            />
            {showError(getField('birthTime')) && <ErrorMsg msg={errors[getField('birthTime')]?.message as string} />}
          </div>
        </div>

        <div className="space-y-3">
          {helperText && autocompleteDisabled && (
            <div className="text-sm text-gray-500 mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {helperText}
            </div>
          )}
          <div className="space-y-2" data-birth-location>
            <Label htmlFor={`${prefix}birthLocation`} className="text-lg font-light text-gray-700">
              Birth Location *
            </Label>
            <div style={{ fontSize: '16px' }}>
              <CleanPlaceAutocomplete
                value={(watch(getField('birthLocation') as keyof ReportFormData) as string) || ''}
                onChange={(val) => setValue(getField('birthLocation') as keyof ReportFormData, val)}
                onPlaceSelect={handlePlaceSelect}
                placeholder="Enter birth city, state, country"
                className={`h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 ${
                  showError(getField('birthLocation')) ? 'border-red-500 ring-1 ring-red-500' : ''
                }`}
                disabled={autocompleteDisabled}
              />
            </div>
            {showError(getField('birthLocation')) && (
              <ErrorMsg msg={errors[getField('birthLocation')]?.message as string} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonCard;
