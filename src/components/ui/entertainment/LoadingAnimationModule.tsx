import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Moon, Sun, Zap, Heart, Diamond } from 'lucide-react';

interface LoadingAnimationModuleProps {
  timeRemaining: number;
  onError?: () => void;
  config?: {
    animationType?: 'cosmic' | 'geometric' | 'organic' | 'elemental';
    speed?: number;
    colorScheme?: 'cosmic' | 'warm' | 'cool';
  };
}

export const LoadingAnimationModule: React.FC<LoadingAnimationModuleProps> = ({
  timeRemaining,
  onError,
  config = {}
}) => {
  const {
    animationType = 'cosmic',
    speed = 1,
    colorScheme = 'cosmic'
  } = config;

  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 2000 / speed);

    return () => clearInterval(interval);
  }, [speed]);

  const getColorClasses = () => {
    switch (colorScheme) {
      case 'warm':
        return ['text-orange-400', 'text-red-400', 'text-yellow-400', 'text-pink-400'];
      case 'cool':
        return ['text-blue-400', 'text-purple-400', 'text-teal-400', 'text-indigo-400'];
      case 'cosmic':
      default:
        return ['text-primary', 'text-secondary', 'text-accent', 'text-muted-foreground'];
    }
  };

  const colors = getColorClasses();

  const renderCosmicAnimation = () => (
    <div className="relative w-64 h-64 mx-auto">
      {/* Central pulsing star */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Star className={`h-12 w-12 ${colors[0]}`} />
      </motion.div>

      {/* Orbiting elements */}
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={index}
          className="absolute top-1/2 left-1/2"
          style={{
            transformOrigin: `${40 + index * 20}px 0px`
          }}
          animate={{
            rotate: [0, 360]
          }}
          transition={{
            duration: 4 + index,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <motion.div
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.5
            }}
          >
            {index % 2 === 0 ? 
              <Moon className={`h-6 w-6 ${colors[index]}`} /> : 
              <Sparkles className={`h-6 w-6 ${colors[index]}`} />
            }
          </motion.div>
        </motion.div>
      ))}
    </div>
  );

  const renderGeometricAnimation = () => (
    <div className="relative w-64 h-64 mx-auto">
      {/* Rotating triangles */}
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          animate={{
            rotate: [0, 120, 240, 360],
            scale: [1, 1.1, 0.9, 1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: index * 0.8
          }}
          style={{
            transform: `translate(-50%, -50%) scale(${1 + index * 0.3})`
          }}
        >
          <Diamond className={`h-16 w-16 ${colors[index]} opacity-70`} />
        </motion.div>
      ))}
      
      {/* Central pulsing element */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      >
        <Zap className={`h-8 w-8 ${colors[3]}`} />
      </motion.div>
    </div>
  );

  const renderOrganicAnimation = () => (
    <div className="relative w-64 h-64 mx-auto">
      {/* Flowing hearts */}
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className="absolute"
          initial={{
            x: 128,
            y: 128,
            scale: 0
          }}
          animate={{
            x: [128, 200 + Math.cos(index * 2) * 50, 50 + Math.sin(index * 3) * 30, 128],
            y: [128, 80 + Math.sin(index * 2) * 30, 200 + Math.cos(index * 3) * 40, 128],
            scale: [0, 1, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: index * 0.8,
            ease: "easeInOut"
          }}
        >
          <Heart className={`h-8 w-8 ${colors[index % colors.length]} opacity-80`} />
        </motion.div>
      ))}
    </div>
  );

  const renderElementalAnimation = () => (
    <div className="relative w-64 h-64 mx-auto">
      {/* Four elements in corners */}
      <motion.div
        className="absolute top-8 left-8"
        animate={{
          y: [-5, 5, -5],
          rotate: [0, 10, -10, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity
        }}
      >
        <Sun className={`h-12 w-12 ${colors[0]}`} />
      </motion.div>

      <motion.div
        className="absolute top-8 right-8"
        animate={{
          x: [-5, 5, -5],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity
        }}
      >
        <Moon className={`h-12 w-12 ${colors[1]}`} />
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-8"
        animate={{
          rotate: [0, 360],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 4,
          repeat: Infinity
        }}
      >
        <Sparkles className={`h-12 w-12 ${colors[2]}`} />
      </motion.div>

      <motion.div
        className="absolute bottom-8 right-8"
        animate={{
          scale: [0.8, 1.3, 0.8],
          y: [-3, 3, -3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      >
        <Zap className={`h-12 w-12 ${colors[3]}`} />
      </motion.div>

      {/* Central connecting energy */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity
        }}
      >
        <div className="w-4 h-4 bg-primary rounded-full" />
      </motion.div>
    </div>
  );

  const renderAnimation = () => {
    switch (animationType) {
      case 'geometric':
        return renderGeometricAnimation();
      case 'organic':
        return renderOrganicAnimation();
      case 'elemental':
        return renderElementalAnimation();
      case 'cosmic':
      default:
        return renderCosmicAnimation();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Main Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex justify-center"
      >
        {renderAnimation()}
      </motion.div>

      {/* Status Text */}
      <motion.div
        key={animationPhase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <div className="text-lg font-light text-foreground">
          {animationPhase === 0 && "Gathering cosmic data..."}
          {animationPhase === 1 && "Analyzing celestial patterns..."}
          {animationPhase === 2 && "Aligning universal energies..."}
          {animationPhase === 3 && "Crafting your unique insights..."}
        </div>
        <div className="text-sm text-muted-foreground">
          {timeRemaining > 15 ? "This won't take long" : "Almost ready!"}
        </div>
      </motion.div>
    </div>
  );
};