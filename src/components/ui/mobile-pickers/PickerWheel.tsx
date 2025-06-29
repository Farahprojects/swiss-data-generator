
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';

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
  const [scrollY, setScrollY] = useState(0);

  const selectedIndex = options.indexOf(value);
  const centerOffset = (height - itemHeight) / 2;

  useEffect(() => {
    if (selectedIndex >= 0) {
      setScrollY(-selectedIndex * itemHeight);
    }
  }, [selectedIndex, itemHeight]);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      const newScrollY = scrollY + info.offset.y;
      const newIndex = Math.round(-newScrollY / itemHeight);
      const clampedIndex = Math.max(0, Math.min(options.length - 1, newIndex));
      
      setScrollY(-clampedIndex * itemHeight);
      onChange(options[clampedIndex]);
    },
    [scrollY, itemHeight, options, onChange]
  );

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const newScrollY = scrollY + info.offset.y;
      setScrollY(newScrollY);
    },
    [scrollY]
  );

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
          top: -(options.length - 1) * itemHeight,
          bottom: 0
        }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ y: scrollY }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        style={{ y: centerOffset }}
        className="cursor-grab active:cursor-grabbing"
      >
        {options.map((option, index) => {
          const distance = Math.abs(index - selectedIndex);
          const opacity = Math.max(0.3, 1 - distance * 0.3);
          const scale = Math.max(0.8, 1 - distance * 0.1);
          
          return (
            <div
              key={`${option}-${index}`}
              className="flex items-center justify-center text-lg font-medium transition-all duration-200"
              style={{ 
                height: itemHeight,
                opacity: isDragging ? 1 : opacity,
                transform: isDragging ? 'scale(1)' : `scale(${scale})`,
                color: distance === 0 ? '#000' : '#666'
              }}
            >
              {option}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default PickerWheel;
