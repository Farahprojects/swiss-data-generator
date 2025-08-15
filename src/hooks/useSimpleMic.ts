import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 🎤 MIC BOSS - Centralized Microphone Authority
 * 
 * The ONLY component that controls browser microphone.
 * Anyone else wanting mic access must go through the Boss.
 */
export const useSimpleMic = () => {
  const [isOn, setIsOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const originalGetUserMediaRef = useRef<typeof navigator.mediaDevices.getUserMedia | null>(null);

  // ROGUE REQUEST DETECTOR - Catch anyone bypassing the Boss
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      // Store original function
      originalGetUserMediaRef.current = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getUserMedia = function(constraints) {
        console.error('🚨 ROGUE MIC REQUEST DETECTED! 🚨');
        console.error('Someone is bypassing the MIC BOSS!');
        console.trace('ROGUE REQUEST CALL STACK:');
        
        return originalGetUserMediaRef.current!(constraints);
      };

      return () => {
        if (originalGetUserMediaRef.current) {
          navigator.mediaDevices.getUserMedia = originalGetUserMediaRef.current;
        }
      };
    }
  }, []);

  // Expose the current stream for other services to use
  const getActiveStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  const turnOn = useCallback(async (): Promise<boolean> => {
    if (isOn) return true;

    try {
      console.log('[MIC BOSS] 🎤 MIC ON');
      
      // Use original function to bypass our own detector
      const stream = await originalGetUserMediaRef.current!({
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
