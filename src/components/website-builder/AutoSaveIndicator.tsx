
import React from 'react';
import { Check, CloudUpload } from 'lucide-react';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ status }) => {
  if (status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <CloudUpload className="h-3 w-3 animate-pulse" />,
          text: 'Saving...',
          className: 'text-blue-600 bg-blue-50'
        };
      case 'saved':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Saved',
          className: 'text-green-600 bg-green-50'
        };
      case 'error':
        return {
          icon: null,
          text: 'Save failed',
          className: 'text-red-600 bg-red-50'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`fixed top-20 right-4 z-50 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};
