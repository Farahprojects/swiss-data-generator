
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);
  
  const y = useMotionValue(0);
  const selectedIndex = options.indexOf(value);
  const centerOffset = (height - itemHeight) / 2;

  // Initialize position only once when component mounts or value changes from external source
  useEffect(() => {
    if (selectedIndex >= 0 && !isInitialized) {
      const targetY = -selectedIndex * itemHeight;
      y.set(targetY);
      setIsInitialized(true);
    }
  }, [selectedIndex, itemHeight, y, isInitialized]);

  // Reset initialization when value changes externally (not from drag)
  useEffect(() => {
    if (!isDragging && selectedIndex >= 0) {
      const currentY = y.get();
      const expectedY = -selectedIndex * itemHeight;
      
      // Only update if the position doesn't match the expected position
      if (Math.abs(currentY - expectedY) > itemHeight / 2) {
        y.set(expectedY);
      }
    }
  }, [value, isDragging, selectedIndex, itemHeight, y]);

  // Calculate which item should be selected based on current position
  const getCurrentSelectedIndex = useCallback((currentY: number) => {
    const rawIndex = Math.round(-currentY / itemHeight);
    return Math.max(0, Math.min(options.length - 1, rawIndex));
  }, [itemHeight, options.length]);

  // Calculate momentum and final position based on velocity
  const calculateMomentumTarget = useCallback((currentY: number, velocity: number) => {
    // Apply momentum with realistic physics
    const momentumDistance = velocity * 0.1;
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
      // Update selection in real-time during drag
      const currentY = y.get();
      const currentIndex = getCurrentSelectedIndex(currentY);
      
      // Only update if the index has changed
      if (currentIndex !== selectedIndex && options[currentIndex] !== value) {
        onChange(options[currentIndex]);
      }
    },
    [y, getCurrentSelectedIndex, selectedIndex, options, value, onChange]
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
        damping: 40,
        stiffness: 200,
        mass: 1,
        restDelta: 0.1,
        restSpeed: 0.1
      });
      
      // Update selected value when animation completes
      controls.then(() => {
        if (options[finalIndex] !== value) {
          onChange(options[finalIndex]);
        }
      });
    },
    [y, calculateMomentumTarget, onChange, options, value]
  );

  // Real-time position-based transforms for visual feedback
  const currentIndexTransform = useTransform(y, (yValue) => {
    return Math.round(-yValue / itemHeight);
  });

  // Memoized drag constraints to prevent recalculation
  const dragConstraints = useMemo(() => ({
    top: -(options.length - 1) * itemHeight - itemHeight * 0.5,
    bottom: itemHeight * 0.5
  }), [options.length, itemHeight]);

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
        dragConstraints={dragConstraints}
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
          return (
            <PickerItem
              key={`${option}-${index}`}
              option={option}
              index={index}
              itemHeight={itemHeight}
              y={y}
              isDragging={isDragging}
            />
          );
        })}
      </motion.div>
    </div>
  );
};

// Separate component for individual picker items to optimize rendering
const PickerItem = React.memo(({ 
  option, 
  index, 
  itemHeight, 
  y, 
  isDragging 
}: {
  option: string | number;
  index: number;
  itemHeight: number;
  y: any;
  isDragging: boolean;
}) => {
  // Calculate distance from center in real-time
  const distanceFromCenter = useTransform(y, (yValue) => {
    const centerIndex = -yValue / itemHeight;
    return Math.abs(index - centerIndex);
  });

  // Dynamic opacity based on distance from center
  const opacity = useTransform(distanceFromCenter, [0, 1, 2], [1, 0.7, 0.3]);
  
  // Dynamic scale based on distance from center
  const scale = useTransform(distanceFromCenter, [0, 1, 2], [1, 0.95, 0.85]);

  // Dynamic color based on distance from center
  const isCenter = useTransform(distanceFromCenter, (distance) => distance < 0.5);
  
  return (
    <motion.div
      className="flex items-center justify-center text-lg font-medium transition-colors duration-150"
      style={{ 
        height: itemHeight,
        opacity,
        scale
      }}
    >
      <motion.span
        style={{
          color: useTransform(isCenter, (isCentered) => isCentered ? '#000' : '#666')
        }}
      >
        {option}
      </motion.span>
    </motion.div>
  );
});

PickerItem.displayName = 'PickerItem';

export default PickerWheel;
