
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

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
  const [lastVelocity, setLastVelocity] = useState(0);
  
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
    // Apply momentum based on velocity (simulate friction)
    const momentumDistance = velocity * 0.3; // Adjust this multiplier for momentum strength
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
      // Store velocity for momentum calculation
      setLastVelocity(info.velocity.y);
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
      
      // Animate to final position with momentum
      y.stop();
      y.set(currentY);
      
      // Use spring animation with physics-based parameters
      const controls = y.animate(finalY, {
        type: "spring",
        damping: Math.abs(velocity) > 500 ? 25 : 35, // Less damping for high velocity
        stiffness: Math.abs(velocity) > 500 ? 80 : 120, // Lower stiffness for smoother motion
        mass: 1,
        restDelta: 0.5,
        restSpeed: 0.5
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
    if (isDragging) return 1;
    const currentIndex = Math.round(-value / itemHeight);
    return (index: number) => {
      const distance = Math.abs(index - currentIndex);
      return Math.max(0.3, 1 - distance * 0.2);
    };
  });

  const scale = useTransform(y, (value) => {
    if (isDragging) return 1;
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
          top: -(options.length - 1) * itemHeight - itemHeight,
          bottom: itemHeight
        }}
        dragElastic={{
          top: 0.05,
          bottom: 0.05
        }}
        dragTransition={{
          bounceStiffness: 600,
          bounceDamping: 20,
          power: 0.3,
          timeConstant: 200
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
          const itemOpacity = isDragging ? 1 : Math.max(0.3, 1 - distance * 0.25);
          const itemScale = isDragging ? 1 : Math.max(0.85, 1 - distance * 0.08);
          const textColor = distance === 0 && !isDragging ? '#000' : '#666';
          
          return (
            <motion.div
              key={`${option}-${index}`}
              className="flex items-center justify-center text-lg font-medium"
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
                duration: isDragging ? 0 : 0.2,
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
