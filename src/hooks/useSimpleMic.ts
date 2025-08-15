import { useState, useRef, useCallback } from 'react';

/**
 * SIMPLE MIC CONTROL - No complexity, no race conditions
 * 
 * Just turns browser mic on/off. That's it.
 */
export const useSimpleMic = () => {
  const [isOn, setIsOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const turnOn = useCallback(async (): Promise<boolean> => {
    if (isOn) return true;

    try {
      console.log('[SimpleMic] 🎤 Turning mic ON');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      streamRef.current = stream;
      setIsOn(true);
      
      console.log('[SimpleMic] ✅ Mic ON');
      return true;
      
    } catch (error) {
      console.error('[SimpleMic] ❌ Failed to turn mic on:', error);
      return false;
    }
  }, [isOn]);

  const turnOff = useCallback(() => {
    if (!isOn || !streamRef.current) return;

    console.log('[SimpleMic] 🔇 Turning mic OFF');
    
    // Stop all tracks
    streamRef.current.getTracks().forEach(track => {
      console.log('[SimpleMic] Stopping track:', track.kind);
      track.stop();
    });
    
    streamRef.current = null;
    setIsOn(false);
    
    console.log('[SimpleMic] ✅ Mic OFF');
  }, [isOn]);

  return {
    isOn,
    turnOn,
    turnOff
  };
};
