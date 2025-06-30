
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onConfirm}
                className="text-primary hover:text-primary/80"
              >
                <Check className="h-5 w-5" />
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
