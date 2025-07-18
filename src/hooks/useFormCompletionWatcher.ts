import { useEffect, useRef } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';

interface FormCompletionWatcherProps {
  watch: UseFormWatch<ReportFormData>;
  onFirstPersonComplete?: () => void;
  onSecondPersonComplete?: () => void;
  isCompatibilityReport?: boolean;
  debounceMs?: number;
}

export const useFormCompletionWatcher = ({ 
  watch, 
  onFirstPersonComplete, 
  onSecondPersonComplete,
  isCompatibilityReport = false,
  debounceMs = 300 
}: FormCompletionWatcherProps) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const firstPersonTriggeredRef = useRef<boolean>(false);
  const secondPersonTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    const subscription = watch((formData) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the completion check
      timeoutRef.current = setTimeout(() => {
        const firstPersonComplete = checkFirstPersonCompletion(formData);
        const secondPersonComplete = isCompatibilityReport ? checkSecondPersonCompletion(formData) : false;
        
        // Stage 1: First person completion
        if (firstPersonComplete && !firstPersonTriggeredRef.current && onFirstPersonComplete) {
          console.log('🎯 First person completion detected');
          firstPersonTriggeredRef.current = true;
          onFirstPersonComplete();
        }
        
        // Stage 2: Second person completion (only for compatibility reports)
        if (isCompatibilityReport && firstPersonComplete && secondPersonComplete && 
            !secondPersonTriggeredRef.current && onSecondPersonComplete) {
          console.log('🎯 Second person completion detected');
          secondPersonTriggeredRef.current = true;
          onSecondPersonComplete();
        }
        
        // Reset triggers if forms become incomplete
        if (!firstPersonComplete) {
          firstPersonTriggeredRef.current = false;
          secondPersonTriggeredRef.current = false;
        } else if (isCompatibilityReport && !secondPersonComplete) {
          secondPersonTriggeredRef.current = false;
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, onFirstPersonComplete, onSecondPersonComplete, isCompatibilityReport, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

const checkFirstPersonCompletion = (formData: Partial<ReportFormData>): boolean => {
  // Required fields for first person including coordinates
  const textFields = [
    formData.name,
    formData.email,
    formData.birthDate,
    formData.birthTime,
    formData.birthLocation
  ];

  const textFieldsComplete = textFields.every(field => 
    field && typeof field === 'string' && field.trim().length > 0
  );

  // Also require coordinates to ensure proper place selection
  const coordinatesComplete = typeof formData.birthLatitude === 'number' && typeof formData.birthLongitude === 'number';
  
  const firstPersonComplete = textFieldsComplete && coordinatesComplete;

  console.log('📊 First person completion check:', {
    name: !!formData.name?.trim(),
    email: !!formData.email?.trim(),
    birthDate: !!formData.birthDate?.trim(),
    birthTime: !!formData.birthTime?.trim(),
    birthLocation: !!formData.birthLocation?.trim(),
    birthLatitude: !!formData.birthLatitude,
    birthLongitude: !!formData.birthLongitude,
    complete: firstPersonComplete
  });

  return firstPersonComplete;
};

const checkSecondPersonCompletion = (formData: Partial<ReportFormData>): boolean => {
  // Required fields for second person including coordinates
  const textFields = [
    formData.secondPersonName,
    formData.secondPersonBirthDate,
    formData.secondPersonBirthTime,
    formData.secondPersonBirthLocation
  ];

  const textFieldsComplete = textFields.every(field => 
    field && typeof field === 'string' && field.trim().length > 0
  );

  // Also require coordinates to ensure proper place selection
  const coordinatesComplete = typeof formData.secondPersonLatitude === 'number' && typeof formData.secondPersonLongitude === 'number';
  
  const secondPersonComplete = textFieldsComplete && coordinatesComplete;

  console.log('📊 Second person completion check:', {
    secondPersonName: !!formData.secondPersonName?.trim(),
    secondPersonBirthDate: !!formData.secondPersonBirthDate?.trim(),
    secondPersonBirthTime: !!formData.secondPersonBirthTime?.trim(),
    secondPersonBirthLocation: !!formData.secondPersonBirthLocation?.trim(),
    secondPersonLatitude: !!formData.secondPersonLatitude,
    secondPersonLongitude: !!formData.secondPersonLongitude,
    complete: secondPersonComplete
  });

  return secondPersonComplete;
};