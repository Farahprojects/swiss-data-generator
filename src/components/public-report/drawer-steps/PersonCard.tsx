
import React, { useState, useCallback, useRef } from 'react';
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
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportFormData } from '@/types/public-report';

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
  hasTriedToSubmit,
}: PersonCardProps) => {
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    email: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false,
  });

  const [activeSelector, setActiveSelector] = useState<'date' | 'time' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const isSecondPerson = personNumber === 2;
  const prefix = isSecondPerson ? 'secondPerson' : '';

  /* -------------------------------------------------------------------- */
  /* Helpers                                                              */
  /* -------------------------------------------------------------------- */

  const name = watch(isSecondPerson ? 'secondPersonName' : 'name') || '';
  const email = watch('email') || '';
  const birthDate =
    watch(isSecondPerson ? 'secondPersonBirthDate' : 'birthDate') || '';
  const birthTime =
    watch(isSecondPerson ? 'secondPersonBirthTime' : 'birthTime') || '';
  const birthLocation =
    watch(isSecondPerson ? 'secondPersonBirthLocation' : 'birthLocation') || '';

  const handleFieldInteraction = (fieldName: string) =>
    setHasInteracted((prev) => ({ ...prev, [fieldName]: true }));

  const shouldShowError = (
    fieldName: keyof typeof hasInteracted,
    error: any,
  ) => (hasTriedToSubmit || hasInteracted[fieldName]) && error;

  const getFieldName = (field: string): keyof ReportFormData => {
    if (isSecondPerson) {
      return `secondPerson${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof ReportFormData;
    }
    return field as keyof ReportFormData;
  };

  const getError = (field: string) => {
    const fieldName = getFieldName(field);
    return errors[fieldName];
  };

  // Custom input focus handler to prevent browser auto-scroll
  const handleInputFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    if (isMobile) {
      // Prevent browser's default scroll behavior
      event.preventDefault();
      
      // Custom scroll behavior with smooth animation
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [isMobile]);

  const handleDateChange = (date: string) => {
    const fieldName = getFieldName('birthDate');
    setValue(fieldName, date);
  };

  const handleTimeChange = (time: string) => {
    const fieldName = getFieldName('birthTime');
    setValue(fieldName, time);
  };

  const handlePlaceSelect = (placeData: PlaceData) => {
    const locationField = getFieldName('birthLocation');
    const latField = getFieldName('birthLatitude');
    const lngField = getFieldName('birthLongitude');
    const placeIdField = getFieldName('birthPlaceId');

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

  // Date selector handlers
  const handleDateSelectorOpen = useCallback(() => {
    setActiveSelector('date');
  }, []);

  const handleDateConfirm = useCallback(() => {
    setHasInteracted((prev) => ({ ...prev, birthDate: true }));
    setActiveSelector(null);
  }, []);

  const handleDateCancel = useCallback(() => {
    setActiveSelector(null);
  }, []);

  // Time selector handlers
  const handleTimeSelectorOpen = useCallback(() => {
    setActiveSelector('time');
  }, []);

  const handleTimeConfirm = useCallback(() => {
    setHasInteracted((prev) => ({ ...prev, birthTime: true }));
    setActiveSelector(null);
  }, []);

  const handleTimeCancel = useCallback(() => {
    setActiveSelector(null);
  }, []);

  // Enhanced error message component
  const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex items-center gap-2 text-sm text-red-500 mt-1">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );

  /* -------------------------------------------------------------------- */
  /* JSX                                                                  */
  /* -------------------------------------------------------------------- */

  return (
    <Card ref={cardRef} className="border-2 border-primary/20 w-full max-w-none mb-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-6">
        {/* NAME ------------------------------------------------------- */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}name`}>Full Name *</Label>
          <Input
            id={`${prefix}name`}
            {...register(getFieldName('name') as any)}
            placeholder="Enter full name"
            className={`h-12 ${shouldShowError('name', getError('name')) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            onFocus={(e) => {
              handleFieldInteraction('name');
              handleInputFocus(e);
            }}
            onBlur={() => handleFieldInteraction('name')}
          />
          {shouldShowError('name', getError('name')) && (
            <ErrorMessage message={getError('name')?.message as string} />
          )}
        </div>

        {/* EMAIL (only first person) ----------------------------------- */}
        {!isSecondPerson && (
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email' as any)}
              placeholder="your@email.com"
              className={`h-12 ${shouldShowError('email', errors.email) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              onFocus={(e) => {
                handleFieldInteraction('email');
                handleInputFocus(e);
              }}
              onBlur={() => handleFieldInteraction('email')}
            />
            {shouldShowError('email', errors.email) && (
              <ErrorMessage message={errors.email?.message as string} />
            )}
          </div>
        )}

        {/* DATE & TIME ------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-6">
          {/* DATE */}
          <div className="space-y-2">
            <Label htmlFor={`${prefix}birthDate`}>Birth Date *</Label>
            {isMobile ? (
              <InlineDateTimeSelector
                type="date"
                value={birthDate}
                onChange={handleDateChange}
                onConfirm={handleDateConfirm}
                onCancel={handleDateCancel}
                isOpen={activeSelector === 'date'}
                placeholder="Select date"
                hasError={shouldShowError('birthDate', getError('birthDate'))}
                onOpen={handleDateSelectorOpen}
              />
            ) : (
              <Input
                id={`${prefix}birthDate`}
                type="date"
                {...register(getFieldName('birthDate') as any)}
                className={`h-12 ${shouldShowError('birthDate', getError('birthDate')) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                onFocus={(e) => {
                  handleFieldInteraction('birthDate');
                  handleInputFocus(e);
                }}
                onBlur={() => handleFieldInteraction('birthDate')}
              />
            )}
            {shouldShowError('birthDate', getError('birthDate')) && (
              <ErrorMessage message={getError('birthDate')?.message as string} />
            )}
          </div>

          {/* TIME */}
          <div className="space-y-2">
            <Label htmlFor={`${prefix}birthTime`}>Birth Time *</Label>
            {isMobile ? (
              <InlineDateTimeSelector
                type="time"
                value={birthTime}
                onChange={handleTimeChange}
                onConfirm={handleTimeConfirm}
                onCancel={handleTimeCancel}
                isOpen={activeSelector === 'time'}
                placeholder="Select time"
                hasError={shouldShowError('birthTime', getError('birthTime'))}
                onOpen={handleTimeSelectorOpen}
              />
            ) : (
              <Input
                id={`${prefix}birthTime`}
                type="time"
                step="60"
                {...register(getFieldName('birthTime') as any)}
                className={`h-12 ${shouldShowError('birthTime', getError('birthTime')) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                onFocus={(e) => {
                  handleFieldInteraction('birthTime');
                  handleInputFocus(e);
                }}
                onBlur={() => handleFieldInteraction('birthTime')}
              />
            )}
            {shouldShowError('birthTime', getError('birthTime')) && (
              <ErrorMessage message={getError('birthTime')?.message as string} />
            )}
          </div>
        </div>

        {/* LOCATION ---------------------------------------------------- */}
        <div className="space-y-2">
          <PlaceAutocomplete
            label="Birth Location *"
            value={birthLocation}
            onChange={(value) => {
              const locationField = getFieldName('birthLocation');
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
  );
};

export default PersonCard;
