import React, { useState, useCallback } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSmartScroll } from '@/hooks/useSmartScroll';
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
  const { scrollToElement, scrollToNextField } = useSmartScroll();

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeSelector, setActiveSelector] = useState<'date' | 'time' | null>(null);

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));
  const showError = (field: string) => (hasTriedToSubmit || touched[field]) && errors[field];

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    scrollToElement(e.target, { block: 'center' });
  };

  const handleBlur = (field: string, nextFieldId?: string) => (e: React.FocusEvent<HTMLInputElement>) => {
    markTouched(field);
    if (e.target.value.trim() && nextFieldId) scrollToNextField(nextFieldId);
  };

  const getField = (name: string) => isSecondPerson ? `secondPerson${name.charAt(0).toUpperCase() + name.slice(1)}` : name;

  const handlePlaceSelect = (place: PlaceData) => {
    const loc = getField('birthLocation');
    setValue(loc, place.address || place.name);
    if (place.latitude) setValue(getField('birthLatitude'), place.latitude);
    if (place.longitude) setValue(getField('birthLongitude'), place.longitude);
    if (place.placeId) setValue(getField('birthPlaceId'), place.placeId);
    onPlaceSelect?.();
    scrollToNextField(loc);
  };

  const ErrorMsg = ({ msg }: { msg: string }) => (
    <div className="text-sm text-red-500 mt-1 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" />
      <span>{msg}</span>
    </div>
  );

  return (
    <div className="bg-white w-full mb-8" data-person={personNumber}>
      <div className="mb-8">
        <h2 className="text-3xl font-light text-gray-900 mb-2 tracking-tight">{title}</h2>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <Label htmlFor={`${prefix}name`} className="text-lg font-light text-gray-700">Full Name *</Label>
          <Input
            id={`${prefix}name`}
            {...register(getField('name'))}
            placeholder="Enter full name"
            className={`h-14 rounded-xl text-lg font-light border-gray-200 focus:border-gray-400 ${showError(getField('name')) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            onFocus={handleFocus}
            onBlur={handleBlur(getField('name'), getField('email'))}
            inputMode="text"
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
              onBlur={handleBlur('email', getField('birthDate'))}
              inputMode="email"
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
              value={watch(getField('birthDate'))}
              onChange={(date) => setValue(getField('birthDate'), date)}
              onConfirm={() => {
                markTouched(getField('birthDate'));
                setActiveSelector(null);
                scrollToNextField(getField('birthTime'));
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
              value={watch(getField('birthTime'))}
              onChange={(time) => setValue(getField('birthTime'), time)}
              onConfirm={() => {
                markTouched(getField('birthTime'));
                setActiveSelector(null);
                scrollToNextField(getField('birthLocation'));
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
          <PlaceAutocomplete
            label="Birth Location *"
            value={watch(getField('birthLocation')) || ''}
            onChange={(val) => setValue(getField('birthLocation'), val)}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Enter birth city, state, country"
            id={`${prefix}birthLocation`}
            disabled={autocompleteDisabled}
            error={showError(getField('birthLocation')) ? (errors[getField('birthLocation')]?.message as string) : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default PersonCard;
