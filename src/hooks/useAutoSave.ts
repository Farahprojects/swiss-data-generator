
import { useEffect, useRef } from 'react';
import { useDebounced } from './useDebounced';
import { deepEqual, normalizeForComparison } from '../utils/deepComparison';

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
  const userInteractionFlag = useRef(false);
  const saveInProgress = useRef(false);

  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedData.current = normalizeForComparison(data);
      console.log('🔧 Auto-save: Initial mount, setting baseline data');
      return;
    }

    // Skip if auto-save is disabled
    if (!enabled) {
      console.log('🔧 Auto-save: Disabled, skipping');
      return;
    }

    // Skip if save is already in progress
    if (saveInProgress.current) {
      console.log('🔧 Auto-save: Save in progress, skipping');
      return;
    }

    // Normalize both data sets for comparison
    const normalizedCurrent = normalizeForComparison(debouncedData);
    const normalizedLast = normalizeForComparison(lastSavedData.current);

    // Skip if data hasn't actually changed using deep comparison
    if (deepEqual(normalizedCurrent, normalizedLast)) {
      console.log('🔧 Auto-save: No meaningful changes detected, skipping');
      return;
    }

    // Additional check: if this appears to be a system update rather than user edit
    // We can detect this by checking if the change is very small or seems programmatic
    const changeSize = JSON.stringify(normalizedCurrent).length - JSON.stringify(normalizedLast).length;
    if (Math.abs(changeSize) < 5 && !userInteractionFlag.current) {
      console.log('🔧 Auto-save: Change appears to be system-generated, skipping');
      return;
    }

    console.log('🔧 Auto-save: Meaningful changes detected, proceeding with save');

    // Perform auto-save
    const performAutoSave = async () => {
      saveInProgress.current = true;
      try {
        await onSave(debouncedData);
        lastSavedData.current = normalizedCurrent;
        userInteractionFlag.current = false; // Reset flag after successful save
        console.log('🔧 Auto-save: Successfully saved');
      } catch (error) {
        console.error('🔧 Auto-save failed:', error);
      } finally {
        saveInProgress.current = false;
      }
    };

    performAutoSave();
  }, [debouncedData, onSave, enabled]);

  // Reset the last saved data when data changes externally (like template switch)
  const resetAutoSave = () => {
    lastSavedData.current = normalizeForComparison(data);
    isInitialMount.current = true;
    userInteractionFlag.current = false;
    saveInProgress.current = false;
    console.log('🔧 Auto-save: Reset triggered');
  };

  // Mark that a user interaction has occurred
  const markUserInteraction = () => {
    userInteractionFlag.current = true;
    console.log('🔧 Auto-save: User interaction marked');
  };

  return { resetAutoSave, markUserInteraction };
}
