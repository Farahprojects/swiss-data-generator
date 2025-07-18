import { useEffect, useRef } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';

interface FormCompletionWatcherProps {
  watch: UseFormWatch<ReportFormData>;
  onFormComplete?: () => void;
  isCompatibilityReport?: boolean;
  debounceMs?: number;
}

export const useFormCompletionWatcher = ({ 
  watch, 
  onFormComplete, 
  isCompatibilityReport = false,
  debounceMs = 300 
}: FormCompletionWatcherProps) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCompletionStateRef = useRef<boolean>(false);

  useEffect(() => {
    const subscription = watch((formData) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the completion check
      timeoutRef.current = setTimeout(() => {
        const isComplete = checkFormCompletion(formData, isCompatibilityReport);
        
        // Only trigger if we've transitioned from incomplete to complete
        if (isComplete && !lastCompletionStateRef.current && onFormComplete) {
          console.log('🎯 Form completion detected, triggering action');
          lastCompletionStateRef.current = true;
          onFormComplete();
        } else if (!isComplete) {
          // Reset the completion state if form becomes incomplete
          lastCompletionStateRef.current = false;
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, onFormComplete, isCompatibilityReport, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

const checkFormCompletion = (formData: Partial<ReportFormData>, isCompatibilityReport: boolean): boolean => {
  // Required fields for first person
  const person1Required = [
    formData.name,
    formData.email,
    formData.birthDate,
    formData.birthTime,
    formData.birthLocation
  ];

  const person1Complete = person1Required.every(field => 
    field && typeof field === 'string' && field.trim().length > 0
  );

  console.log('📊 Person 1 completion check:', {
    name: !!formData.name?.trim(),
    email: !!formData.email?.trim(),
    birthDate: !!formData.birthDate?.trim(),
    birthTime: !!formData.birthTime?.trim(),
    birthLocation: !!formData.birthLocation?.trim(),
    complete: person1Complete
  });

  // If not a compatibility report, only check person 1
  if (!isCompatibilityReport) {
    return person1Complete;
  }

  // For compatibility reports, also check second person
  const person2Required = [
    formData.secondPersonName,
    formData.secondPersonBirthDate,
    formData.secondPersonBirthTime,
    formData.secondPersonBirthLocation
  ];

  const person2Complete = person2Required.every(field => 
    field && typeof field === 'string' && field.trim().length > 0
  );

  console.log('📊 Person 2 completion check:', {
    secondPersonName: !!formData.secondPersonName?.trim(),
    secondPersonBirthDate: !!formData.secondPersonBirthDate?.trim(),
    secondPersonBirthTime: !!formData.secondPersonBirthTime?.trim(),
    secondPersonBirthLocation: !!formData.secondPersonBirthLocation?.trim(),
    complete: person2Complete
  });

  const bothComplete = person1Complete && person2Complete;
  console.log('🎯 Overall completion status:', { person1Complete, person2Complete, bothComplete });
  
  return bothComplete;
};