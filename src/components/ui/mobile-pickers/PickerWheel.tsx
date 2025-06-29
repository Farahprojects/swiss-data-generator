
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';

interface PickerWheelProps {
  options: (string | number)[];
  value: string | number;
  onChange: (value: string | number) => void;
  height?: number;
  itemHeight?: number;
}

const PickerWheel = ({ 
  options, 
  value, 
  onChange, 
  height = 200, 
  itemHeight = 40 
}: PickerWheelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const y = useMotionValue(0);
  const selectedIndex = options.indexOf(value);
  const centerOffset = (height - itemHeight) / 2;

  // Initialize position based on selected value
  useEffect(() => {
    if (selectedIndex >= 0) {
      const targetY = -selectedIndex * itemHeight;
      y.set(targetY);
    }
  }, [selectedIndex, itemHeight, y]);

  // Calculate momentum and final position based on velocity
  const calculateMomentumTarget = useCallback((currentY: number, velocity: number) => {
    // Apply momentum based on velocity with more realistic physics
    const momentumDistance = velocity * 0.15; // Reduced for more control
    const targetY = currentY + momentumDistance;
    
    // Snap to nearest item
    const targetIndex = Math.round(-targetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(options.length - 1, targetIndex));
    
    return {
      finalY: -clampedIndex * itemHeight,
      finalIndex: clampedIndex
    };
  }, [itemHeight, options.length]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Visual feedback during drag is handled by framer-motion automatically
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      const currentY = y.get();
      const velocity = info.velocity.y;
      
      // Calculate momentum target
      const { finalY, finalIndex } = calculateMomentumTarget(currentY, velocity);
      
      // Animate to final position with smooth physics
      const controls = animate(y, finalY, {
        type: "spring",
        damping: Math.abs(velocity) > 800 ? 35 : 45, // More damping for smoother motion
        stiffness: Math.abs(velocity) > 800 ? 120 : 150, // Adjusted stiffness
        mass: 1.2, // Slightly heavier feel
        restDelta: 0.1,
        restSpeed: 0.1
      });
      
      // Update selected value when animation completes
      controls.then(() => {
        onChange(options[finalIndex]);
      });
    },
    [y, calculateMomentumTarget, onChange, options]
  );

  // Transform for visual effects during drag
  const opacity = useTransform(y, (value) => {
    const currentIndex = Math.round(-value / itemHeight);
    return (index: number) => {
      const distance = Math.abs(index - currentIndex);
      return Math.max(0.3, 1 - distance * 0.25);
    };
  });

  const scale = useTransform(y, (value) => {
    const currentIndex = Math.round(-value / itemHeight);
    return (index: number) => {
      const distance = Math.abs(index - currentIndex);
      return Math.max(0.85, 1 - distance * 0.08);
    };
  });

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden select-none"
      style={{ height }}
    >
      {/* Selection indicator */}
      <div 
        className="absolute left-0 right-0 border-t border-b border-gray-300 bg-gray-50/50 pointer-events-none z-10"
        style={{ 
          top: centerOffset,
          height: itemHeight
        }}
      />
      
      {/* Options */}
      <motion.div
        drag="y"
        dragConstraints={{
          top: -(options.length - 1) * itemHeight - itemHeight * 0.5,
          bottom: itemHeight * 0.5
        }}
        dragElastic={{
          top: 0.05,
          bottom: 0.05
        }}
        dragTransition={{
          bounceStiffness: 300,
          bounceDamping: 40,
          power: 0.2,
          timeConstant: 150
        }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ 
          y,
          top: centerOffset
        }}
        className="cursor-grab active:cursor-grabbing will-change-transform"
      >
        {options.map((option, index) => {
          const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
          const distance = Math.abs(index - currentIndex);
          const itemOpacity = isDragging ? Math.max(0.3, 1 - distance * 0.2) : Math.max(0.3, 1 - distance * 0.25);
          const itemScale = isDragging ? Math.max(0.9, 1 - distance * 0.05) : Math.max(0.85, 1 - distance * 0.08);
          const textColor = distance === 0 && !isDragging ? '#000' : '#666';
          
          return (
            <motion.div
              key={`${option}-${index}`}
              className="flex items-center justify-center text-lg font-medium transition-colors duration-150"
              style={{ 
                height: itemHeight,
                opacity: itemOpacity,
                transform: `scale(${itemScale})`,
                color: textColor
              }}
              animate={{
                opacity: itemOpacity,
                scale: itemScale,
                color: textColor
              }}
              transition={{
                duration: isDragging ? 0.1 : 0.3,
                ease: "easeOut"
              }}
            >
              {option}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default PickerWheel;
