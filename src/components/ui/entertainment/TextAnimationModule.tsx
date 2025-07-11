import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTypeAnimation } from '@/hooks/useTypeAnimation';
import { Sparkles, Stars, Zap } from 'lucide-react';

interface TextAnimationModuleProps {
  timeRemaining: number;
  onError?: () => void;
  config?: {
    animationType?: 'typewriter' | 'fade' | 'slide';
    messages?: string[];
    speed?: number;
  };
}

const defaultMessages = [
  "✨ Analyzing your cosmic blueprint...",
  "🌟 Aligning with universal energies...",
  "🔮 Unveiling hidden patterns...",
  "💫 Connecting celestial influences...",
  "🌙 Interpreting lunar wisdom...",
  "☀️ Channeling solar power...",
  "🪐 Exploring planetary alignments...",
  "🌌 Discovering your soul's journey..."
];

export const TextAnimationModule: React.FC<TextAnimationModuleProps> = ({
  timeRemaining,
  onError,
  config = {}
}) => {
  const {
    animationType = 'typewriter',
    messages = defaultMessages,
    speed = 80
  } = config;

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [startTyping, setStartTyping] = useState(true);

  const currentMessage = messages[currentMessageIndex] || messages[0];

  const { displayText, isTyping } = useTypeAnimation(
    currentMessage,
    startTyping,
    {
      speed,
      onComplete: () => {
        // Move to next message after completion
        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
          setStartTyping(true);
        }, 1500);
      }
    }
  );

  // Reset typing when message changes
  useEffect(() => {
    setStartTyping(true);
  }, [currentMessageIndex]);

  // Cycle through messages based on time remaining
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const renderByType = () => {
    switch (animationType) {
      case 'fade':
        return (
          <motion.div
            key={currentMessageIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
            className="text-xl font-light text-center text-foreground"
          >
            {currentMessage}
          </motion.div>
        );

      case 'slide':
        return (
          <motion.div
            key={currentMessageIndex}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="text-xl font-light text-center text-foreground"
          >
            {currentMessage}
          </motion.div>
        );

      case 'typewriter':
      default:
        return (
          <div className="text-xl font-light text-center text-foreground min-h-[60px] flex items-center justify-center">
            {displayText}
            {isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="ml-1 text-primary"
              >
                |
              </motion.span>
            )}
          </div>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Animated Icons */}
      <div className="flex justify-center space-x-4">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="h-8 w-8 text-primary" />
        </motion.div>
        
        <motion.div
          animate={{ 
            y: [-10, 10, -10],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Stars className="h-8 w-8 text-secondary" />
        </motion.div>
        
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [-15, 15, -15]
          }}
          transition={{ 
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Zap className="h-8 w-8 text-accent" />
        </motion.div>
      </div>

      {/* Text Animation */}
      <div className="px-4">
        {renderByType()}
      </div>

      {/* Breathing dots */}
      <div className="flex justify-center space-x-2">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="w-2 h-2 bg-primary rounded-full"
          />
        ))}
      </div>
    </div>
  );
};