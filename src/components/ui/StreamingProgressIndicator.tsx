
import React from 'react';

interface StreamingProgressIndicatorProps {
  progress: number;
  isProcessing: boolean;
  className?: string;
}

export const StreamingProgressIndicator = ({ 
  progress, 
  isProcessing,
  className = "" 
}: StreamingProgressIndicatorProps) => {
  if (!isProcessing) return null;

  return (
    <div className={`flex items-center gap-3 text-sm text-indigo-600 ${className}`}>
      <div className="flex items-center gap-2">
        <span>Processing speech...</span>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="text-xs font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" 
             style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" 
             style={{ animationDelay: '200ms' }} />
        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" 
             style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
};
