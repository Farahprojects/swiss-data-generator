import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  animate,
  PanInfo,
  useTransform,
} from 'framer-motion';

// Helper – clamp a value between two bounds
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

interface PickerWheelProps<T extends string | number> {
  options: T[];
  value: T;
  onChange: (next: T) => void;
  height?: number; // visible height of the wheel
  itemHeight?: number; // height of each row
  className?: string; // extra Tailwind classes
}

/**
 * PickerWheel – polished iOS‑style scroll wheel.
 *
 * Features
 * • true spring snapping + momentum
 * • rubber‑band overscroll
 * • fade masks top/bottom
 * • translucent "selection lane" with blur (matches native iOS)
 * • a11y listbox semantics
 */
function PickerWheel<T extends string | number = string>({
  options,
  value,
  onChange,
  height = 240,
  itemHeight = 40,
  className = '',
}: PickerWheelProps<T>) {
  /* --------------------------------------------------------------------- */
  // Refs & motion values
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate initial position based on current value
  const initialPosition = useMemo(() => {
    const idx = options.indexOf(value);
    return idx !== -1 ? -idx * itemHeight : 0;
  }, [options, value, itemHeight]);

  const rawY = useMotionValue(initialPosition); // Initialize with correct position
  const y = useSpring(rawY, { stiffness: 400, damping: 45, mass: 0.8 });

  const [{ isDragging, isInitialized }, setDrag] = useState({ 
    isDragging: false, 
    isInitialized: false 
  });

  /* --------------------------------------------------------------------- */
  // Initialize position on mount
  useEffect(() => {
    if (!isInitialized) {
      const idx = options.indexOf(value);
      if (idx !== -1) {
        rawY.set(-idx * itemHeight);
        console.log(`PickerWheel initialized: value=${value}, index=${idx}, position=${-idx * itemHeight}`);
      }
      setDrag(prev => ({ ...prev, isInitialized: true }));
    }
  }, [options, value, itemHeight, rawY, isInitialized]);

  // Keep wheel in sync with external value changes (but not during drag or initial load)
  useEffect(() => {
    if (!isInitialized || isDragging) return;
    
    const idx = options.indexOf(value);
    const currentPosition = rawY.get();
    const expectedPosition = -idx * itemHeight;
    
    // Only reposition if there's a significant difference (avoid micro-adjustments)
    if (idx !== -1 && Math.abs(currentPosition - expectedPosition) > itemHeight * 0.1) {
      console.log(`PickerWheel repositioning: value=${value}, from=${currentPosition} to=${expectedPosition}`);
      rawY.set(expectedPosition);
    }
  }, [value, options, itemHeight, rawY, isDragging, isInitialized]);

  // Convert y‑offset → nearest option index
  const nearestIndex = useCallback(
    (yPos: number) => clamp(Math.round(-yPos / itemHeight), 0, options.length - 1),
    [itemHeight, options.length]
  );

  // Snap helper (springs & fires onChange)
  const snapTo = useCallback(
    (target: number, velocity = 0) => {
      const idx = nearestIndex(target);
      const finalY = -idx * itemHeight;

      const controls = animate(rawY, finalY, {
        type: 'spring',
        stiffness: 420,
        damping: 50,
        velocity,
      });

      controls.then(() => {
        if (options[idx] !== value) {
          console.log(`PickerWheel onChange: ${value} -> ${options[idx]}`);
          onChange(options[idx]);
        }
      });
    },
    [nearestIndex, itemHeight, rawY, options, onChange, value]
  );

  /* --------------------------------------------------------------------- */
  // Drag handlers
  const onDragStart = () => {
    console.log('PickerWheel drag start');
    setDrag(prev => ({ ...prev, isDragging: true }));
  };
  
  const onDrag = (_: PointerEvent, info: PanInfo) => {
    rawY.set(rawY.get() + info.delta.y);
  };
  
  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    console.log('PickerWheel drag end');
    setDrag(prev => ({ ...prev, isDragging: false }));

    const minY = -(options.length - 1) * itemHeight;
    const rubber = 0.4 * itemHeight;
    const clamped = clamp(rawY.get(), minY - rubber, rubber);

    // project momentum (0.2 multiplier tuned for mobile feel)
    const projected = clamped + info.velocity.y * 0.2;
    snapTo(projected, info.velocity.y);
  };

  /* --------------------------------------------------------------------- */
  // Wheel / trackpad scroll for desktop
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      rawY.set(rawY.get() - e.deltaY);
      snapTo(rawY.get(), -e.deltaY);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [rawY, snapTo]);

  /* --------------------------------------------------------------------- */
  // Styling helpers
  const centerTop = (height - itemHeight) / 2;
  const gradientH = itemHeight * 2; // fade height

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Picker wheel"
      className={`relative overflow-hidden select-none touch-pan-y ${className}`}
      style={{ height }}
    >
      {/* top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-white via-white/70 to-transparent dark:from-neutral-900 dark:via-neutral-900/70"
        style={{ height: gradientH }}
      />

      {/* bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white/70 to-transparent dark:from-neutral-900 dark:via-neutral-900/70"
        style={{ height: gradientH }}
      />

      {/* translucent selection lane (blurred) */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex justify-stretch"
        style={{ top: centerTop, height: itemHeight }}
        aria-hidden="true"
      >
        <div className="flex-1 backdrop-blur-sm bg-white/65 dark:bg-neutral-800/40 border-y border-neutral-300 dark:border-neutral-600" />
      </div>

      {/* scrollable list */}
      <motion.div
        drag="y"
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        style={{ y, top: centerTop }}
      >
        {options.map((opt, i) => (
          <PickerItem key={String(opt)} index={i} itemHeight={itemHeight} y={y} value={opt} />
        ))}
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
// Individual row
interface ItemProps {
  value: string | number;
  index: number;
  itemHeight: number;
  y: ReturnType<typeof useSpring>;
}

const PickerItem = React.memo<ItemProps>(({ value, index, itemHeight, y }) => {
  // Distance from centre (0 = centred)
  const d = useTransform(y, (latest) => Math.abs(index + latest / itemHeight));

  const opacity = useTransform(d, [0, 1, 2], [1, 0.55, 0.15]);
  const scale = useTransform(d, [0, 1.2], [1, 0.85]);
  const weight = useTransform(d, (dist) => (dist < 0.5 ? 600 : 400));

  return (
    <motion.div
      role="option"
      aria-selected={d.get() < 0.5}
      className="flex items-center justify-center h-full"
      style={{ height: itemHeight, opacity, scale }}
    >
      <motion.span style={{ fontWeight: weight }} className="text-lg text-neutral-900 dark:text-neutral-100">
        {value}
      </motion.span>
    </motion.div>
  );
});
PickerItem.displayName = 'PickerItem';

export default PickerWheel;
