/**
 * CENTRALIZED MICROPHONE MANAGER
 * 
 * Single source of truth for all microphone access.
 * Prevents multiple getUserMedia calls and ensures proper cleanup.
 */

let globalMicStream: MediaStream | null = null;
let activeStreams: Set<MediaStream> = new Set();

/**
 * Get or create the global microphone stream
 */
export const getGlobalMicStream = async (): Promise<MediaStream> => {
  if (globalMicStream && globalMicStream.active) {
    console.log('[CentralizedMic] Returning existing active stream');
    return globalMicStream;
  }

  console.log('[CentralizedMic] Creating new microphone stream');
  
  try {
    globalMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      }
    });

    activeStreams.add(globalMicStream);
    
    console.log('[CentralizedMic] Stream created:', {
      streamId: globalMicStream.id,
      active: globalMicStream.active,
      tracks: globalMicStream.getTracks().length
    });

    return globalMicStream;
  } catch (error) {
    console.error('[CentralizedMic] Failed to create stream:', error);
    throw error;
  }
};

/**
 * Track a stream for cleanup
 */
export const trackStream = (stream: MediaStream) => {
  activeStreams.add(stream);
};

/**
 * Release the global microphone stream
 */
export const releaseGlobalMicStream = () => {
  console.log('[CentralizedMic] Releasing global mic stream');
  
  if (globalMicStream) {
    globalMicStream.getTracks().forEach(track => {
      console.log('[CentralizedMic] Stopping track:', track.kind, track.id);
      track.stop();
    });
    
    activeStreams.delete(globalMicStream);
    globalMicStream = null;
  }
};

/**
 * NUCLEAR OPTION: Force cleanup of ALL active streams
 * Use only in emergencies or when normal cleanup fails
 */
export const forceCleanupAllStreams = () => {
  console.log('[CentralizedMic] 🚨 NUCLEAR CLEANUP - Stopping ALL active streams');
  
  // Stop all tracked streams
  activeStreams.forEach(stream => {
    try {
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          console.log('[CentralizedMic] Force stopping track:', track.kind, track.id);
          track.stop();
        }
      });
    } catch (error) {
      console.warn('[CentralizedMic] Error stopping stream:', error);
    }
  });
  
  // Clear all references
  activeStreams.clear();
  globalMicStream = null;
  
  console.log('[CentralizedMic] ✅ Nuclear cleanup complete');
};

/**
 * Get count of active streams (for debugging)
 */
export const getActiveStreamCount = (): number => {
  return activeStreams.size;
};