import React from 'react';
import { Loader2, Lock } from 'lucide-react';

interface PaymentProcessingUIProps {
  guestId: string;
}

export const PaymentProcessingUI: React.FC<PaymentProcessingUIProps> = ({ guestId }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
            <div>
              <h2 className="text-lg font-light text-gray-900">Your Session</h2>
              <p className="text-sm text-gray-500">Setting up your personalized space...</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* System Message - Processing Payment */}
          <div className="flex items-end gap-3 justify-start">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-50">
              <p className="text-base font-light leading-relaxed text-gray-700">
                We're processing your payment. This usually takes a few seconds...
              </p>
            </div>
          </div>

          {/* Animated Assistant Bubble */}
          <div className="flex items-end gap-3 justify-start">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-gray-50">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with disabled input */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  disabled
                  placeholder="Setting up your space..."
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl resize-none text-gray-500 cursor-not-allowed"
                  rows={1}
                />
              </div>
            </div>
            
            {/* Disabled Microphone Button */}
            <button
              disabled
              className="p-3 text-gray-300 cursor-not-allowed"
              title="Setting up your space..."
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Disabled Send Button with Lock Icon */}
            <button
              disabled
              className="p-3 bg-gray-200 text-gray-400 rounded-xl cursor-not-allowed"
              title="Setting up your space..."
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
