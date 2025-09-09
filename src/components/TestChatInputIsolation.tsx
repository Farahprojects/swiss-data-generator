import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';

/**
 * Test component to verify ChatInput isolation
 * This component will trigger parent re-renders to test if ChatInput re-renders unnecessarily
 */
export const TestChatInputIsolation: React.FC = () => {
  const [counter, setCounter] = useState(0);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  // Subscribe to stores that could cause parent re-renders
  const chatError = useChatStore((state) => state.error);
  const reportError = useReportReadyStore((state) => state.errorState);
  
  // Simulate parent component re-renders
  useEffect(() => {
    if (!isTestRunning) return;
    
    const interval = setInterval(() => {
      setCounter(prev => prev + 1);
      console.log('[TestIsolation] 🔄 Triggering parent re-render #', counter + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTestRunning, counter]);
  
  const startTest = () => {
    setIsTestRunning(true);
    setCounter(0);
    console.log('[TestIsolation] 🚀 Starting isolation test...');
  };
  
  const stopTest = () => {
    setIsTestRunning(false);
    console.log('[TestIsolation] ⏹️ Stopping isolation test...');
  };
  
  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50">
      <h3 className="font-semibold text-sm mb-2">ChatInput Isolation Test</h3>
      <div className="text-xs text-gray-600 mb-2">
        Parent re-renders: {counter}
      </div>
      <div className="text-xs text-gray-600 mb-2">
        Chat error: {chatError ? 'Yes' : 'No'}
      </div>
      <div className="text-xs text-gray-600 mb-2">
        Report error: {reportError ? 'Yes' : 'No'}
      </div>
      <div className="flex gap-2">
        <button
          onClick={startTest}
          disabled={isTestRunning}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded disabled:opacity-50"
        >
          Start Test
        </button>
        <button
          onClick={stopTest}
          disabled={!isTestRunning}
          className="px-2 py-1 bg-red-500 text-white text-xs rounded disabled:opacity-50"
        >
          Stop Test
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Check console for re-render logs
      </div>
    </div>
  );
};
