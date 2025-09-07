import React, { useState } from 'react';
import { X } from 'lucide-react';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[calc(90vh-80px)] overflow-y-auto">
          {mode === 'login' ? (
            <LoginModal onSuccess={onClose} />
          ) : (
            <SignupModal onSuccess={onClose} />
          )}
        </div>

        {/* Mode Toggle */}
        <div className="py-6 px-4 border-t border-gray-200 text-center flex items-center justify-center">
          {mode === 'login' ? (
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-gray-900 hover:text-gray-700 transition-colors border-b border-gray-300 hover:border-gray-600 pb-1"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-gray-900 hover:text-gray-700 transition-colors border-b border-gray-300 hover:border-gray-600 pb-1"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
