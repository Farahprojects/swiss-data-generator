
import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceAutocomplete } from '@/components/shared/forms/place-input/PlaceAutocomplete';
import { PlaceData } from '@/components/shared/forms/place-input/utils/extractPlaceData';
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

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}birthDate`}>Birth Date *</Label>
            <Input
              id={`${prefix}birthDate`}
              type="date"
              {...register(getFieldName('birthDate'))}
              className="h-12"
              onFocus={() => handleFieldInteraction('birthDate')}
              onBlur={() => handleFieldInteraction('birthDate')}
            />
            {shouldShowError('birthDate', getError('birthDate')) && (
              <p className="text-sm text-red-500">{getError('birthDate')?.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${prefix}birthTime`}>Birth Time *</Label>
            <Input
              id={`${prefix}birthTime`}
              type="time"
              {...register(getFieldName('birthTime'))}
              step="60"
              className="h-12"
              onFocus={() => handleFieldInteraction('birthTime')}
              onBlur={() => handleFieldInteraction('birthTime')}
            />
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
  );
};

export default PersonCard;
