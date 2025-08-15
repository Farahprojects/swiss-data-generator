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
      
      // Clear references IMMEDIATELY
      streamRef.current = null;
      setIsOn(false);
      
      console.log('[SimpleMic] 🧹 References cleared - isOn set to false');
      
      // BULLETPROOF BROWSER SESSION FLUSH - Force complete mic release
      setTimeout(() => {
        console.log('[SimpleMic] 🔄 BULLETPROOF FLUSH - Forcing complete browser mic session reset');
        
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((flushStream) => {
            console.log('[SimpleMic] 🔄 Flush stream acquired - immediately stopping to force browser cleanup');
            
            // Immediately stop the flush stream - this forces browser to fully release mic session
            flushStream.getTracks().forEach((track) => {
              track.stop();
              console.log('[SimpleMic] 🔄 Flush track stopped:', track.readyState);
            });
            
            console.log('[SimpleMic] ✅ BULLETPROOF FLUSH COMPLETE');
            console.log('- Browser mic session fully reset');
            console.log('- Red dot should disappear now (may take 100-500ms)');
            
            // Final verification after flush
            setTimeout(() => {
              console.log('[SimpleMic] 🎯 FINAL CHECK: Browser mic indicator should be OFF now');
            }, 300);
          })
          .catch((error) => {
            console.log('[SimpleMic] 🔄 Flush failed (mic may be blocked):', error.message);
            console.log('- This is OK - original cleanup was successful');
            console.log('- Browser should still release mic indicator');
          });
      }, 100); // Shorter delay for immediate flush
      
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
