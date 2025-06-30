
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';

interface MobilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

const MobilePickerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  children 
}: MobilePickerModalProps) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop - disabled click to prevent accidental dismissal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
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
            style={{ touchAction: 'pan-y' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-10 w-16 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onConfirm}
                className="h-10 w-16 bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:text-green-700 font-medium"
              >
                <Check className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-4 pb-8" style={{ touchAction: 'pan-y' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobilePickerModal;
