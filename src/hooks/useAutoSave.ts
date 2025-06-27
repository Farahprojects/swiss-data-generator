
import { useEffect, useRef } from 'react';
import { useDebounced } from './useDebounced';

interface UseAutoSaveOptions {
  data: any;
  onSave: (data: any) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave({ data, onSave, delay = 500, enabled = true }: UseAutoSaveOptions) {
  const debouncedData = useDebounced(data, delay);
  const isInitialMount = useRef(true);
  const lastSavedData = useRef<any>(null);

  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedData.current = data;
      return;
    }

    // Skip if auto-save is disabled
    if (!enabled) return;

    // Skip if data hasn't actually changed
    if (JSON.stringify(debouncedData) === JSON.stringify(lastSavedData.current)) {
      return;
    }

    // Perform auto-save
    const performAutoSave = async () => {
      try {
        await onSave(debouncedData);
        lastSavedData.current = debouncedData;
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };

    performAutoSave();
  }, [debouncedData, onSave, enabled]);

  // Reset the last saved data when data changes externally (like template switch)
  const resetAutoSave = () => {
    lastSavedData.current = data;
    isInitialMount.current = true;
  };

  return { resetAutoSave };
}
