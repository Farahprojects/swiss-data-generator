import { useEffect, useRef } from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface UseMemoryMonitorOptions {
  warningThreshold?: number; // MB
  criticalThreshold?: number; // MB
  onWarning?: (memoryInfo: MemoryInfo) => void;
  onCritical?: (memoryInfo: MemoryInfo) => void;
  checkInterval?: number; // ms
}

export const useMemoryMonitor = (options: UseMemoryMonitorOptions = {}) => {
  const {
    warningThreshold = 100, // 100MB
    criticalThreshold = 200, // 200MB
    onWarning,
    onCritical,
    checkInterval = 30000 // 30 seconds
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    const checkMemory = () => {
      try {
        const memory = (performance as any).memory as MemoryInfo;
        if (!memory) return;

        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

        console.log(`🧠 Memory usage: ${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (${limitMB.toFixed(1)}MB limit)`);

        if (usedMB > criticalThreshold) {
          console.warn(`🚨 Critical memory usage: ${usedMB.toFixed(1)}MB`);
          onCritical?.(memory);
        } else if (usedMB > warningThreshold) {
          console.warn(`⚠️ High memory usage: ${usedMB.toFixed(1)}MB`);
          onWarning?.(memory);
        }
      } catch (error) {
        console.error('Error checking memory usage:', error);
      }
    };

    // Check immediately
    checkMemory();

    // Set up interval
    intervalRef.current = setInterval(checkMemory, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [warningThreshold, criticalThreshold, onWarning, onCritical, checkInterval]);

  return {
    checkMemory: () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const memory = (performance as any).memory as MemoryInfo;
        return memory ? {
          usedMB: memory.usedJSHeapSize / 1024 / 1024,
          totalMB: memory.totalJSHeapSize / 1024 / 1024,
          limitMB: memory.jsHeapSizeLimit / 1024 / 1024
        } : null;
      }
      return null;
    }
  };
}; 