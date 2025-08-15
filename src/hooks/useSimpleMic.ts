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
    if (!isOn || !streamRef.current) {
      console.log('[SimpleMic] Already off or no stream');
      return;
    }

    console.log('[SimpleMic] 🔇 Turning mic OFF');
    
    try {
      // Stop all tracks immediately
      const tracks = streamRef.current.getTracks();
      console.log('[SimpleMic] Found', tracks.length, 'tracks to stop');
      
      tracks.forEach(track => {
        if (track.readyState === 'live') {
          console.log('[SimpleMic] Stopping', track.kind, 'track, state:', track.readyState);
          track.stop();
          console.log('[SimpleMic] Track stopped, new state:', track.readyState);
        } else {
          console.log('[SimpleMic] Track already stopped:', track.kind, track.readyState);
        }
      });
      
      // Clear the stream reference immediately
      streamRef.current = null;
      setIsOn(false);
      
      console.log('[SimpleMic] ✅ Mic OFF - All tracks stopped');
      
      // Give browser a moment to update mic indicator
      setTimeout(() => {
        console.log('[SimpleMic] 🔍 Browser should have updated mic indicator by now');
      }, 100);
      
    } catch (error) {
      console.error('[SimpleMic] Error stopping tracks:', error);
      // Force cleanup anyway
      streamRef.current = null;
      setIsOn(false);
    }
  }, [isOn]);

  return {
    isOn,
    turnOn,
    turnOff
  };
};
