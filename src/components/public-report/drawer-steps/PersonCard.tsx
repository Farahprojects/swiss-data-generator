import React, { useState, useCallback } from 'react';
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
import { AlertCircle } from 'lucide-react';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import InlineDateTimeSelector from '@/components/ui/mobile-pickers/InlineDateTimeSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { ReportFormData } from '@/types/public-report';
import { Button } from '@/components/ui/button';

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

  // Enhanced input focus handler with proper scroll management
  const handleInputFocus = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    if (isMobile) {
      const target = event.target;
      
      // Prevent any browser interference
      event.preventDefault();
      
      // Custom controlled scroll behavior
      setTimeout(() => {
        target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      }, 50);
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

  // Enhanced place selection handler with complete layout stabilization
  const handlePlaceSelect = (placeData: PlaceData) => {
    const locationField = getFieldName('birthLocation');
    const latField = getFieldName('birthLatitude');
    const lngField = getFieldName('birthLongitude');
    const placeIdField = getFieldName('birthPlaceId');

    // Use the full formatted address (which is now in placeData.name) or fallback to address field
    const fullLocation = placeData.address || placeData.name;
    console.log(`📍 Person ${personNumber} - Setting location to:`, fullLocation);
    
    setValue(locationField, fullLocation);
    setHasInteracted((prev) => ({ ...prev, birthLocation: true }));

    if (placeData.latitude && placeData.longitude) {
      setValue(latField, placeData.latitude);
      setValue(lngField, placeData.longitude);
      console.log(`✅ Person ${personNumber} - Coordinates saved:`, {
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        location: fullLocation
      });
    } else {
      console.warn(`⚠️ Person ${personNumber} - No coordinates available for location:`, fullLocation);
    }
    
    if (placeData.placeId) {
      setValue(placeIdField, placeData.placeId);
    }

    // Enhanced layout stabilization for mobile with proper timing
    if (isMobile) {
      // Prevent scroll interference during Google's cleanup
      document.body.style.pointerEvents = 'none';
      
      setTimeout(() => {
        // Re-enable interactions
        document.body.style.pointerEvents = '';
        
        // Force layout recalculation
        const currentCard = document.querySelector(`[data-person="${personNumber}"]`);
        if (currentCard) {
          // Ensure card is properly positioned
          const cardRect = currentCard.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Only scroll if card is not fully visible
          if (cardRect.bottom > viewportHeight || cardRect.top < 0) {
            currentCard.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }
      }, 400); // Extended timeout to ensure Google's DOM cleanup is complete
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
    <Card className="border-2 border-primary/20 w-full mb-4" data-person={personNumber}>
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
            inputMode="text"
            style={{ fontSize: '16px' }} // Prevent zoom on iOS
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
              inputMode="email"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
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
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
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
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
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
