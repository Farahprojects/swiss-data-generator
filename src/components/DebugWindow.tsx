// Debug window for mobile testing - shows errors and logs

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, Bug } from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'error' | 'warn' | 'info' | 'log';
  message: string;
  timestamp: string;
  stack?: string;
}

export const DebugWindow: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [maxLogs] = useState(50);

  useEffect(() => {
    // Override console methods to capture logs
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalLog = console.log;

    const addLog = (type: LogEntry['type'], ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      const logEntry: LogEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        stack: type === 'error' ? new Error().stack : undefined
      };

      setLogs(prev => {
        const newLogs = [logEntry, ...prev].slice(0, maxLogs);
        return newLogs;
      });
    };

    console.error = (...args) => {
      addLog('error', ...args);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('warn', ...args);
      originalWarn.apply(console, args);
    };

    console.info = (...args) => {
      addLog('info', ...args);
      originalInfo.apply(console, args);
    };

    console.log = (...args) => {
      addLog('log', ...args);
      originalLog.apply(console, args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', `Unhandled Error: ${event.message}`, event.filename, event.lineno);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', `Unhandled Promise Rejection: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Add initial log
    addLog('info', 'Debug window initialized');

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.log = originalLog;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [maxLogs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'warn': return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'info': return <Info className="w-3 h-3 text-blue-500" />;
      default: return <Bug className="w-3 h-3 text-gray-500" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-2 right-2 z-50 bg-red-500 text-white p-2 rounded-full shadow-lg"
        title="Show Debug Window"
      >
        <Bug className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed top-2 right-2 z-50 w-80 max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Debug Console</span>
          <span className="text-xs text-gray-500">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-600"
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No logs yet...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`text-xs p-2 rounded border-l-2 ${getLogColor(log.type)}`}
            >
              <div className="flex items-start gap-2">
                {getLogIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-500">
                      {log.timestamp}
                    </span>
                    <span className="text-xs font-medium uppercase">
                      {log.type}
                    </span>
                  </div>
                  <div className="font-mono text-xs break-words">
                    {log.message}
                  </div>
                  {log.stack && (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Stack trace
                      </summary>
                      <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                        {log.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
