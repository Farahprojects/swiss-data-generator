
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

  // Initialize position to center the selected item
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
      
      if (Math.abs(currentY - expectedY) > itemHeight / 2) {
        animate(y, expectedY, {
          type: "spring",
          damping: 30,
          stiffness: 300,
          duration: 0.3
        });
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
    const momentumDistance = velocity * 0.15;
    const targetY = currentY + momentumDistance;
    
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
      const currentY = y.get();
      const currentIndex = getCurrentSelectedIndex(currentY);
      
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
      
      const { finalY, finalIndex } = calculateMomentumTarget(currentY, velocity);
      
      const controls = animate(y, finalY, {
        type: "spring",
        damping: 35,
        stiffness: 300,
        mass: 1,
        restDelta: 0.5,
        restSpeed: 0.5
      });
      
      controls.then(() => {
        if (options[finalIndex] !== value) {
          onChange(options[finalIndex]);
        }
      });
    },
    [y, calculateMomentumTarget, onChange, options, value]
  );

  // Memoized drag constraints
  const dragConstraints = useMemo(() => ({
    top: -(options.length - 1) * itemHeight - itemHeight * 0.3,
    bottom: itemHeight * 0.3
  }), [options.length, itemHeight]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden select-none"
      style={{ height }}
    >
      {/* Subtle selection indicator - much more minimal */}
      <div 
        className="absolute left-0 right-0 pointer-events-none z-10"
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
          top: 0.03,
          bottom: 0.03
        }}
        dragTransition={{
          bounceStiffness: 400,
          bounceDamping: 30,
          power: 0.3,
          timeConstant: 120
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

// iOS-style picker item with proper visual hierarchy
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

  // iOS-style opacity: center item is fully opaque, others fade out
  const opacity = useTransform(distanceFromCenter, [0, 1, 2, 3], [1, 0.6, 0.3, 0.1]);
  
  // iOS-style scale: center item is normal size, others slightly smaller
  const scale = useTransform(distanceFromCenter, [0, 1, 2], [1, 0.9, 0.8]);

  // iOS-style font weight: center item is bold, others are normal
  const fontWeight = useTransform(distanceFromCenter, (distance) => distance < 0.5 ? 600 : 400);
  
  // iOS-style color: center item is black, others are gray
  const textColor = useTransform(distanceFromCenter, (distance) => 
    distance < 0.5 ? '#000000' : '#666666'
  );
  
  return (
    <motion.div
      className="flex items-center justify-center text-lg transition-all duration-100"
      style={{ 
        height: itemHeight,
        opacity,
        scale
      }}
    >
      <motion.span
        style={{
          fontWeight,
          color: textColor
        }}
        className="select-none"
      >
        {option}
      </motion.span>
    </motion.div>
  );
});

PickerItem.displayName = 'PickerItem';

export default PickerWheel;
