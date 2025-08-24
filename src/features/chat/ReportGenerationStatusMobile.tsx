import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isVisible: boolean;
  onComplete: () => void;
}

const statusSequence = [
  "Thinking...",
  "Calling Stargate", 
  "connecting",
  "Star calculation done",
  "Therai Ai",
  "Generating report"
];

export const ReportGenerationStatusMobile: React.FC<Props> = ({ isVisible, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setCurrentIndex(0);
      setIsSequenceComplete(false);
      return;
    }

    if (currentIndex < statusSequence.length) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 1500); // 1.5 seconds per status

      return () => clearTimeout(timer);
    } else if (!isSequenceComplete) {
      setIsSequenceComplete(true);
      onComplete();
    }
  }, [isVisible, currentIndex, isSequenceComplete, onComplete]);

  if (!isVisible) return null;

  const currentStatus = currentIndex < statusSequence.length 
    ? statusSequence[currentIndex] 
    : statusSequence[statusSequence.length - 1];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-gray-200"
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-gray-900 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {currentStatus}
            </h3>
            <div className="flex justify-center space-x-1">
              {statusSequence.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index <= currentIndex ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};