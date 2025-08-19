import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface PreparingSpaceModalProps {
  isOpen: boolean;
}

export const PreparingSpaceModal: React.FC<PreparingSpaceModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl"
      >
        {/* Animated loading spinner */}
        <div className="mb-6">
          <motion.div
            className="w-12 h-12 mx-auto border-4 border-gray-200 border-t-gray-900 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Message */}
        <h3 className="text-lg font-light text-gray-900 mb-2">
          Preparing your personalised
        </h3>
        <p className="text-2xl font-light italic text-gray-900 mb-4">
          Therai space
        </p>
        
        {/* Subtitle */}
        <p className="text-sm text-gray-600 font-light">
          Setting up your cosmic blueprint...
        </p>
      </motion.div>
    </div>,
    document.body
  );
};
