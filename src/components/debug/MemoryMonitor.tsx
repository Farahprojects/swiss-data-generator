import React, { useState, useEffect } from 'react';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
import { useReportModal } from '@/contexts/ReportModalContext';
import { sessionManager } from '@/utils/sessionManager';
import { RefreshCw } from 'lucide-react';

export const MemoryMonitor: React.FC = () => {
  const { checkMemory } = useMemoryMonitor({
    warningThreshold: 100, // 100MB
    criticalThreshold: 200, // 200MB
    onWarning: (memoryInfo) => {
      console.warn('⚠️ High memory usage detected:', memoryInfo);
    },
    onCritical: (memoryInfo) => {
      console.error('🚨 Critical memory usage detected:', memoryInfo);
    }
  });

  const { cacheSize, currentReport } = useReportModal();
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Refresh memory info
  const refreshMemory = () => {
    const info = checkMemory();
    setMemoryInfo(info);
    setLastRefresh(new Date());
  };

  // Initial memory check
  useEffect(() => {
    refreshMemory();
  }, []);

  // Listen for session clearing events
  useEffect(() => {
    const handleSessionClear = () => {
      console.log('🔄 MemoryMonitor: Session cleared, refreshing memory info...');
      // Small delay to ensure clearing completes
      setTimeout(refreshMemory, 500);
    };

    // Listen for session clearing (we'll use a custom event)
    window.addEventListener('session-cleared', handleSessionClear);
    
    return () => {
      window.removeEventListener('session-cleared', handleSessionClear);
    };
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshMemory, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!memoryInfo) {
    return null; // Don't render in SSR
  }

  const getMemoryStatus = () => {
    const { usedMB, totalMB, limitMB } = memoryInfo;
    const usagePercent = (usedMB / limitMB) * 100;
    
    if (usagePercent > 80) return 'critical';
    if (usagePercent > 60) return 'warning';
    return 'normal';
  };

  const status = getMemoryStatus();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs z-50">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Memory Monitor</div>
        <button 
          onClick={refreshMemory}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Refresh memory info"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Used:</span>
          <span className={`font-mono ${
            status === 'critical' ? 'text-red-600' : 
            status === 'warning' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {memoryInfo.usedMB.toFixed(1)}MB
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Total:</span>
          <span className="font-mono">{memoryInfo.totalMB.toFixed(1)}MB</span>
        </div>
        
        <div className="flex justify-between">
          <span>Limit:</span>
          <span className="font-mono">{memoryInfo.limitMB.toFixed(1)}MB</span>
        </div>
        
        <div className="flex justify-between">
          <span>Usage:</span>
          <span className={`font-mono ${
            status === 'critical' ? 'text-red-600' : 
            status === 'warning' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {((memoryInfo.usedMB / memoryInfo.limitMB) * 100).toFixed(1)}%
          </span>
        </div>
        
        <div className="border-t pt-1 mt-1">
          <div className="flex justify-between">
            <span>Cache:</span>
            <span className="font-mono">{cacheSize} reports</span>
          </div>
          
          {currentReport && (
            <div className="text-xs text-gray-500 mt-1">
              Current: {currentReport.guestReportId.slice(0, 8)}...
            </div>
          )}
        </div>

        <div className="border-t pt-1 mt-1 text-xs text-gray-400">
          Last refresh: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}; 