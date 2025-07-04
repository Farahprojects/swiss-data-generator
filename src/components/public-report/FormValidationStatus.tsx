import React from 'react';
import { ReportFormData } from '@/types/public-report';
import { FieldErrors } from 'react-hook-form';

interface FormValidationStatusProps {
  formData: ReportFormData;
  errors: FieldErrors<ReportFormData>;
  requiresSecondPerson: boolean;
}

interface ValidationItem {
  field: string;
  label: string;
  isValid: boolean;
  isRequired: boolean;
}

export const FormValidationStatus: React.FC<FormValidationStatusProps> = ({
  formData,
  errors,
  requiresSecondPerson
}) => {
  const validationItems: ValidationItem[] = [
    {
      field: 'reportType',
      label: 'Report type or request',
      isValid: !!(formData.reportType || formData.request),
      isRequired: true
    },
    {
      field: 'name',
      label: 'Your name',
      isValid: !!formData.name && formData.name.length >= 2,
      isRequired: true
    },
    {
      field: 'email',
      label: 'Email address',
      isValid: !!formData.email && formData.email.includes('@'),
      isRequired: true
    },
    {
      field: 'birthDate',
      label: 'Birth date',
      isValid: !!formData.birthDate,
      isRequired: true
    },
    {
      field: 'birthTime',
      label: 'Birth time',
      isValid: !!formData.birthTime,
      isRequired: true
    },
    {
      field: 'birthLocation',
      label: 'Birth location',
      isValid: !!formData.birthLocation,
      isRequired: true
    },
    // Removed coordinate validation - let backend handle it
  ];

  // Add second person validation if required
  if (requiresSecondPerson) {
    validationItems.push(
      {
        field: 'secondPersonName',
        label: 'Second person name',
        isValid: !!formData.secondPersonName && formData.secondPersonName.length >= 2,
        isRequired: true
      },
      {
        field: 'secondPersonBirthDate',
        label: 'Second person birth date',
        isValid: !!formData.secondPersonBirthDate,
        isRequired: true
      },
      {
        field: 'secondPersonBirthTime',
        label: 'Second person birth time',
        isValid: !!formData.secondPersonBirthTime,
        isRequired: true
      },
      {
        field: 'secondPersonBirthLocation',
        label: 'Second person birth location',
        isValid: !!formData.secondPersonBirthLocation,
        isRequired: true
      }
    );
  }

  const requiredItems = validationItems.filter(item => item.isRequired);
  const validCount = requiredItems.filter(item => item.isValid).length;
  const totalRequired = requiredItems.length;
  const isComplete = validCount === totalRequired;

  if (isComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-800">
            All required information complete ({validCount}/{totalRequired})
          </span>
        </div>
      </div>
    );
  }

  const missingItems = requiredItems.filter(item => !item.isValid);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span className="text-sm font-medium text-amber-800">
            Missing information ({validCount}/{totalRequired} complete)
          </span>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-amber-700">Please complete these fields:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {missingItems.map((item) => (
              <div key={item.field} className="flex items-center gap-2">
                <span className="text-xs text-amber-600">•</span>
                <span className="text-xs text-amber-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};