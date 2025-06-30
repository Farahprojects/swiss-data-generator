
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface MobilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  disableBackdropClose?: boolean;
}

const MobilePickerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  children,
  disableBackdropClose = false
}: MobilePickerModalProps) => {
  const handleBackdropClick = () => {
    if (!disableBackdropClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleBackdropClick}
          />
          
          {/* Modal - Reduced animation duration for faster response */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ 
              type: "spring", 
              damping: 35, 
              stiffness: 500,
              duration: 0.2
            }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-xl shadow-xl"
          >
            {/* Header - Apple Style */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800 hover:bg-transparent font-normal text-base px-2"
              >
                Cancel
              </Button>
              
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onConfirm}
                className="text-blue-600 hover:text-blue-700 hover:bg-transparent font-semibold text-base px-2"
              >
                Done
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-4 pb-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobilePickerModal;
