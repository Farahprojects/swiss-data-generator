import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

interface PaymentSuccessMessageProps {
  onClose: () => void;
}

export const PaymentSuccessMessage: React.FC<PaymentSuccessMessageProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 8 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-gray-900">
                Payment Successful!
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Your payment has been processed. We're now generating your personalized report.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};