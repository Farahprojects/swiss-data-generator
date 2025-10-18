import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SubscriptionToastProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const SubscriptionToast: React.FC<SubscriptionToastProps> = ({ isVisible, onDismiss }) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/subscription');
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4"
        >
          <div className="bg-white border border-gray-200 rounded-full shadow-lg px-6 py-4 flex items-center justify-between gap-4 w-full max-w-md">
            {/* Icon */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-gray-900" />
              </div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-normal text-gray-900">
                  Upgrade to Premium
                </p>
                <p className="text-xs font-light text-gray-600 truncate">
                  Unlock unlimited conversations & reports
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleUpgrade}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-light rounded-full transition-colors"
              >
                Upgrade
              </button>
              <button
                onClick={onDismiss}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

