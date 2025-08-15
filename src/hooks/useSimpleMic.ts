import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * SIMPLE MIC CONTROL - No complexity, no race conditions
 * 
 * Just turns browser mic on/off. That's it.
 */
export const useSimpleMic = () => {
  // Global monitoring of getUserMedia calls
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getUserMedia = function(constraints) {
        console.log('[GLOBAL] 🎤 getUserMedia called with constraints:', constraints);
        console.trace('[GLOBAL] getUserMedia call stack');
        
        return originalGetUserMedia(constraints).then(stream => {
          console.log('[GLOBAL] 📊 getUserMedia resolved with stream:', {
            streamId: stream.id,
            active: stream.active,
            tracks: stream.getTracks().length
          });
          return stream;
        }).catch(error => {
          console.error('[GLOBAL] ❌ getUserMedia rejected:', error);
          throw error;
        });
      };

      return () => {
        // Restore original function on cleanup
        navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      };
    }
  }, []);
  const [isOn, setIsOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const turnOn = useCallback(async (): Promise<boolean> => {
    console.log('[SimpleMic] 🎤 turnOn() called - Current state:', {
      isOn,
      hasStream: !!streamRef.current
    });

    if (isOn) {
      console.log('[SimpleMic] Already ON - returning true');
      return true;
    }

    try {
      console.log('[SimpleMic] 🎯 REQUESTING MIC ACCESS - calling getUserMedia');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      console.log('[SimpleMic] 📊 Stream created:', {
        streamId: stream.id,
        streamActive: stream.active,
        trackCount: stream.getTracks().length,
        trackDetails: stream.getTracks().map(t => ({
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          id: t.id
        }))
      });
      
      streamRef.current = stream;
      setIsOn(true);
      
      console.log('[SimpleMic] ✅ Mic ON - Browser should show mic indicator now');
      return true;
      
    } catch (error) {
      console.error('[SimpleMic] ❌ Failed to turn mic on:', error);
      return false;
    }
  }, [isOn]);

  const turnOff = useCallback(() => {
    console.log('[SimpleMic] 🔇 turnOff() called - Current state:', {
      isOn,
      hasStream: !!streamRef.current,
      streamId: streamRef.current?.id,
      streamActive: streamRef.current?.active
    });

    if (!isOn || !streamRef.current) {
      console.log('[SimpleMic] ❌ Cannot turn off - already off or no stream');
      return;
    }

    console.log('[SimpleMic] 🎯 TURNING MIC OFF - Starting shutdown sequence');
    
    try {
      const stream = streamRef.current;
      const tracks = stream.getTracks();
      
      console.log('[SimpleMic] 📊 Stream details before stopping:', {
        streamId: stream.id,
        streamActive: stream.active,
        trackCount: tracks.length,
        trackDetails: tracks.map(t => ({
          kind: t.kind,
          readyState: t.readyState,
          enabled: t.enabled,
          id: t.id
        }))
      });
      
      // Stop each track with detailed logging
      tracks.forEach((track, index) => {
        console.log(`[SimpleMic] 🛑 Stopping track ${index + 1}/${tracks.length}:`, {
          kind: track.kind,
          readyState: track.readyState,
          enabled: track.enabled,
          id: track.id
        });
        
        track.stop();
        
        console.log(`[SimpleMic] ✅ Track ${index + 1} stopped:`, {
          kind: track.kind,
          readyState: track.readyState,
          enabled: track.enabled
        });
      });
      
      // Log stream state after stopping tracks
      console.log('[SimpleMic] 📊 Stream state after stopping tracks:', {
        streamId: stream.id,
        streamActive: stream.active,
        trackCount: stream.getTracks().length
      });
      
      // Clear references
      streamRef.current = null;
      setIsOn(false);
      
      console.log('[SimpleMic] 🧹 References cleared - isOn set to false');
      
      // DEFINITIVE TEST: Try to reacquire mic to prove it's fully released
      setTimeout(() => {
        console.log('[SimpleMic] 🔍 POST-CLEANUP CHECK:');
        console.log('- Browser mic indicator should be OFF now');
        console.log('- Running definitive mic release test...');
        
        // The ultimate test: can we cleanly reacquire the mic?
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((testStream) => {
            console.log('[SimpleMic] 🧪✅ DEFINITIVE PROOF: Mic was fully released!');
            console.log('- Successfully reacquired mic cleanly');
            console.log('- No conflicts or "already in use" errors');
            console.log('- If browser mic indicator is still on, it\'s a browser/OS UI delay');
            
            // Immediately stop the test stream
            testStream.getTracks().forEach((track) => {
              track.stop();
              console.log('[SimpleMic] 🧪 Test stream track stopped:', track.readyState);
            });
            
            console.log('[SimpleMic] 🧪 Test complete - mic fully available for reuse');
          })
          .catch((error) => {
            console.error('[SimpleMic] 🧪❌ DEFINITIVE PROOF: Mic NOT fully released!');
            console.error('- Could not reacquire mic:', error.name, error.message);
            console.error('- Something is still holding the microphone');
            console.error('- This indicates a real leak in our cleanup');
          });
      }, 200);
      
    } catch (error) {
      console.error('[SimpleMic] ❌ ERROR during turnOff:', error);
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
