import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useConversationUIStore } from '../conversation-ui-store';

interface ConnectionErrorFallbackProps {
  onRetry: () => void;
}

export const ConnectionErrorFallback: React.FC<ConnectionErrorFallbackProps> = ({ onRetry }) => {
  const { closeConversation } = useConversationUIStore();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Issue
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sorry, we're having trouble with the connection. This could be due to slow internet or microphone permissions.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 bg-gray-900 text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={closeConversation}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
