import { useState, useEffect, useCallback } from 'react';
import { MicBoss } from '@/services/MicBoss';

/**
 * 🎤 React Hook for MIC BOSS
 * 
 * Connects React components to the global MIC BOSS singleton.
 * Multiple components can use this hook - they all talk to the same Boss.
 */
export const useMicBoss = (requesterId: string) => {
  const [status, setStatus] = useState(() => MicBoss.getStatus());

  // Update status when MIC BOSS changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newStatus = MicBoss.getStatus();
      setStatus(prevStatus => {
        // Only update if something actually changed
        if (JSON.stringify(prevStatus) !== JSON.stringify(newStatus)) {
          return newStatus;
        }
        return prevStatus;
      });
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, []);

  const requestStream = useCallback(async (): Promise<MediaStream | null> => {
    const stream = await MicBoss.requestStream(requesterId);
    setStatus(MicBoss.getStatus()); // Update immediately
    return stream;
  }, [requesterId]);

  const releaseStream = useCallback(() => {
    MicBoss.releaseStream(requesterId);
    setStatus(MicBoss.getStatus()); // Update immediately
  }, [requesterId]);

  return {
    // Status from global MIC BOSS
    isOn: status.isOn,
    hasStream: status.hasStream,
    activeRequests: status.activeRequests,
    streamActive: status.streamActive,
    
    // Actions
    requestStream,
    releaseStream,
    
    // Emergency
    forceShutdown: MicBoss.forceShutdown,
  };
};
