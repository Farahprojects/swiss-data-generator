import { useState, useRef, useCallback } from 'react';

/**
 * 🎤 MIC BOSS - Centralized Microphone Authority
 * 
 * The ONLY component that controls browser microphone.
 * Anyone else wanting mic access must go through the Boss.
 */
export const useSimpleMic = () => {
  const [isOn, setIsOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Expose the current stream for other services to use
  const getActiveStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  const turnOn = useCallback(async (): Promise<boolean> => {
    if (isOn) return true;

    try {
      console.log('[MIC BOSS] 🎤 MIC ON');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      streamRef.current = stream;
      setIsOn(true);
      
      console.log('[MIC BOSS] ✅ MIC ON');
      return true;
      
    } catch (error) {
      console.error('[MIC BOSS] ❌ MIC FAILED:', error);
      return false;
    }
  }, [isOn]);

  const turnOff = useCallback(() => {
    if (!isOn || !streamRef.current) return;

    console.log('[MIC BOSS] 🔇 MIC OFF');
    
    try {
      // Stop all tracks
      streamRef.current.getTracks().forEach(track => track.stop());
      
      // Clear references
      streamRef.current = null;
      setIsOn(false);
      
      console.log('[MIC BOSS] ✅ MIC OFF');
      
    } catch (error) {
      console.error('[MIC BOSS] ❌ MIC OFF FAILED:', error);
      // Force cleanup anyway
      streamRef.current = null;
      setIsOn(false);
    }
  }, [isOn]);

  return {
    isOn,
    turnOn,
    turnOff,
    getActiveStream // Expose stream for other services
  };
};
