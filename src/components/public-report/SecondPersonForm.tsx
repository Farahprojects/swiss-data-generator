
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { CleanPlaceAutocomplete } from '@/components/shared/forms/place-input/CleanPlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
import { ReportFormData } from '@/types/public-report';
import { useFieldFocusHandler } from '@/hooks/useFieldFocusHandler';
import FormStep from './FormStep';

interface SecondPersonFormProps {
  register: UseFormRegister<ReportFormData>;
  setValue: UseFormSetValue<ReportFormData>;
  watch: UseFormWatch<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  onPlaceSelected?: () => void;
}

const SecondPersonForm = ({ register, setValue, watch, errors, onPlaceSelected }: SecondPersonFormProps) => {
  const { scrollTo } = useFieldFocusHandler();
  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    birthDate: false,
    birthTime: false,
    birthLocation: false,
  });

  const secondPersonName = watch('secondPersonName') || '';
  const secondPersonBirthDate = watch('secondPersonBirthDate') || '';
  const secondPersonBirthTime = watch('secondPersonBirthTime') || '';
  const secondPersonBirthLocation = watch('secondPersonBirthLocation') || '';

  const handlePlaceSelect = (placeData: PlaceData) => {
    // Use the full formatted address (which is now in placeData.name) or fallback to address field
    const fullLocation = placeData.address || placeData.name;
    
    setValue('secondPersonBirthLocation', fullLocation);
    setHasInteracted(prev => ({ ...prev, birthLocation: true }));
    
    if (placeData.latitude && placeData.longitude) {
      setValue('secondPersonLatitude', placeData.latitude);
      setValue('secondPersonLongitude', placeData.longitude);
    }
    
    if (placeData.placeId) {
      setValue('secondPersonPlaceId', placeData.placeId);
    }
    
    // Trigger auto-scroll callback
    onPlaceSelected?.();
  };

  const handleFieldInteraction = (fieldName: string) => {
    setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
  };

  const shouldShowError = (fieldName: keyof typeof hasInteracted, error: any) => {
    return hasInteracted[fieldName] && error;
  };

  // Smart validation helpers
  const getMissingFields = () => {
    const missing = [];
    if (!secondPersonName.trim()) missing.push('name');
    if (!secondPersonBirthDate) missing.push('birth date');
    if (!secondPersonBirthTime) missing.push('birth time');
    if (!secondPersonBirthLocation.trim()) missing.push('birth location');
    return missing;
  };

  const getCompletionStatus = () => {
    const missing = getMissingFields();
    if (missing.length === 0) return 'complete';
    if (missing.length === 4) return 'empty';
    return 'partial';
  };

  const getSmartValidationMessage = () => {
    const status = getCompletionStatus();
    const missing = getMissingFields();
    
    if (status === 'complete') {
      return { type: 'success', message: 'Second person details complete!' };
    } else if (status === 'partial') {
      const remaining = missing.length === 1 ? missing[0] : `${missing.length} fields`;
      return { type: 'progress', message: `Just ${remaining} needed for second person` };
    }
    return null;
  };

  const getHelperText = (fieldName: string, value: string, error: any) => {
    if (!hasInteracted[fieldName as keyof typeof hasInteracted] && !value) {
      return "This field is required for compatibility reports";
    }
    return null;
  };

  const smartValidation = getSmartValidationMessage();

  return (
    <FormStep stepNumber={4} title="Second Person Details" className="bg-muted/20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Smart validation status */}
        <div className="flex items-center justify-between">
          <p className="text-gray-600">Complete all fields to continue to payment</p>
          {smartValidation && (
            <div className="flex items-center gap-2 text-sm">
              {smartValidation.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-blue-600" />
              )}
              <span className={smartValidation.type === 'success' ? 'text-green-600' : 'text-blue-600'}>
                {smartValidation.message}
              </span>
            </div>
          )}
        </div>
        
        {smartValidation && smartValidation.type === 'progress' && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {smartValidation.message}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="secondPersonName">Name *</Label>
          <Input
            id="secondPersonName"
            {...register('secondPersonName')}
            placeholder="Enter second person's name"
            className="h-12"
            onFocus={(e) => scrollTo(e.target)}
            onBlur={(e) => {
              handleFieldInteraction('name');
            }}
          />
          {shouldShowError('name', errors.secondPersonName) ? (
            <p className="text-sm text-destructive">{errors.secondPersonName.message}</p>
          ) : (
            getHelperText('name', secondPersonName, errors.secondPersonName) && (
              <p className="text-sm text-muted-foreground">
                {getHelperText('name', secondPersonName, errors.secondPersonName)}
              </p>
            )
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="secondPersonBirthDate">Birth Date *</Label>
            <Input
              id="secondPersonBirthDate"
              type="date"
              {...register('secondPersonBirthDate')}
              className="h-12"
              min="1900-01-01"
              max="2024-12-31"
              onFocus={() => handleFieldInteraction('birthDate')}
              onBlur={() => handleFieldInteraction('birthDate')}
            />
            {shouldShowError('birthDate', errors.secondPersonBirthDate) ? (
              <p className="text-sm text-destructive">{errors.secondPersonBirthDate.message}</p>
            ) : (
              getHelperText('birthDate', secondPersonBirthDate, errors.secondPersonBirthDate) && (
                <p className="text-sm text-muted-foreground">
                  {getHelperText('birthDate', secondPersonBirthDate, errors.secondPersonBirthDate)}
                </p>
              )
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secondPersonBirthTime">Birth Time *</Label>
            <Input
              id="secondPersonBirthTime"
              type="time"
              {...register('secondPersonBirthTime')}
              step="60"
              className="h-12"
              onFocus={() => handleFieldInteraction('birthTime')}
              onBlur={() => handleFieldInteraction('birthTime')}
            />
            {shouldShowError('birthTime', errors.secondPersonBirthTime) ? (
              <p className="text-sm text-destructive">{errors.secondPersonBirthTime.message}</p>
            ) : (
              getHelperText('birthTime', secondPersonBirthTime, errors.secondPersonBirthTime) && (
                <p className="text-sm text-muted-foreground">
                  {getHelperText('birthTime', secondPersonBirthTime, errors.secondPersonBirthTime)}
                </p>
              )
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <CleanPlaceAutocomplete
            label="Birth Location *"
            value={secondPersonBirthLocation}
            onChange={(value) => {
              setValue('secondPersonBirthLocation', value);
              if (!hasInteracted.birthLocation && value) {
                handleFieldInteraction('birthLocation');
              }
            }}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Enter birth city, state, country"
            id="secondPersonBirthLocation"
            error={shouldShowError('birthLocation', errors.secondPersonBirthLocation) ? errors.secondPersonBirthLocation?.message : undefined}
          />
          {!shouldShowError('birthLocation', errors.secondPersonBirthLocation) && 
           getHelperText('birthLocation', secondPersonBirthLocation, errors.secondPersonBirthLocation) && (
            <p className="text-sm text-muted-foreground">
              {getHelperText('birthLocation', secondPersonBirthLocation, errors.secondPersonBirthLocation)}
            </p>
          )}
        </div>
      </div>
    </FormStep>
  );
};

export default SecondPersonForm;
