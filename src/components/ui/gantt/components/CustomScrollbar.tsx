// Custom scrollbar component with ref-based drag tracking for smooth performance
// Supports both X and Y axes with matching visual style
// Features: smooth track clicks, native-like page scrolling, arrow buttons, optimized re-renders

'use client';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type RefObject,
} from 'react';

export interface CustomScrollbarProps {
  axis: 'x' | 'y';
  scrollRef: RefObject<HTMLElement | null>;
  sidebarOffset?: number; // For X-axis to skip sidebar area
  className?: string;
  /** Enable smooth scroll behavior for track clicks (default: true) */
  smoothScroll?: boolean;
  /** Scroll amount per arrow click in pixels (default: 60) */
  scrollStep?: number;
  /** Show arrow buttons (default: true) */
  showArrows?: boolean;
}

export const CustomScrollbar: FC<CustomScrollbarProps> = ({
  axis,
  scrollRef,
  sidebarOffset = 0,
  className,
  smoothScroll = true,
  scrollStep = 60,
  showArrows = true,
}) => {
  // Ref-based drag tracking for immediate responsiveness (no state lag)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ pointer: 0, scroll: 0 });
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const arrowIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we just clicked (to differentiate from drag end)
  const wasClickRef = useRef(false);

  // State only for visual feedback (can be slightly delayed)
  const [isHovering, setIsHovering] = useState(false);
  const [visualDragging, setVisualDragging] = useState(false);

  // Scroll metrics for thumb sizing and positioning
  const [thumbMetrics, setThumbMetrics] = useState({ size: 100, position: 0 });
  const [hasOverflow, setHasOverflow] = useState(false);

  // Track mount state for entrance animation
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate thumb metrics from scroll container
  const updateThumbMetrics = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const viewport = axis === 'x' ? el.clientWidth : el.clientHeight;
    const content = axis === 'x' ? el.scrollWidth : el.scrollHeight;
    const scroll = axis === 'x' ? el.scrollLeft : el.scrollTop;
    const maxScroll = content - viewport;

    const hasContentOverflow = content > viewport;
    setHasOverflow(hasContentOverflow);

    if (!hasContentOverflow) {
      setThumbMetrics({ size: 100, position: 0 });
      return;
    }

    // Thumb size as percentage (min 10% for usability)
    const thumbPercent = Math.max(10, (viewport / content) * 100);
    // Thumb position as percentage of available track space
    const scrollProgress = maxScroll > 0 ? scroll / maxScroll : 0;
    const thumbPosition = scrollProgress * (100 - thumbPercent);

    setThumbMetrics({ size: thumbPercent, position: thumbPosition });
  }, [axis, scrollRef]);

  // Sync thumb position with scroll via RAF
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateThumbMetrics);
    };

    // Initial calculation
    updateThumbMetrics();

    // Listen for scroll events
    el.addEventListener('scroll', handleScroll, { passive: true });

    // Also update on resize
    const resizeObserver = new ResizeObserver(() => {
      updateThumbMetrics();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollRef, updateThumbMetrics]);

  // Pointer down - start potential drag
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const el = scrollRef.current;
      if (!el) return;

      // Mark as potential click (will be cleared if drag occurs)
      wasClickRef.current = true;
      isDraggingRef.current = true;
      dragStartRef.current = {
        pointer: axis === 'x' ? e.clientX : e.clientY,
        scroll: axis === 'x' ? el.scrollLeft : el.scrollTop,
      };

      e.currentTarget.setPointerCapture(e.pointerId);
      setVisualDragging(true);
    },
    [axis, scrollRef]
  );

  // Pointer move - update scroll position directly from refs
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const pointerPos = axis === 'x' ? e.clientX : e.clientY;
      const pointerDelta = pointerPos - dragStartRef.current.pointer;

      // If we've moved more than 3px, this is a drag, not a click
      if (Math.abs(pointerDelta) > 3) {
        wasClickRef.current = false;
      }

      // Get track dimensions
      const trackSize = axis === 'x' ? track.clientWidth : track.clientHeight;
      const viewport = axis === 'x' ? el.clientWidth : el.clientHeight;
      const content = axis === 'x' ? el.scrollWidth : el.scrollHeight;
      const maxScroll = content - viewport;

      // Calculate scroll delta based on pointer movement relative to track
      // Account for thumb size to make dragging feel natural
      const thumbPercent = Math.max(10, (viewport / content) * 100);
      const availableTrack = trackSize * (1 - thumbPercent / 100);
      const scrollRatio = maxScroll / availableTrack;
      const scrollDelta = pointerDelta * scrollRatio;

      const newScroll = Math.max(
        0,
        Math.min(maxScroll, dragStartRef.current.scroll + scrollDelta)
      );

      if (axis === 'x') {
        el.scrollLeft = newScroll;
      } else {
        el.scrollTop = newScroll;
      }
    },
    [axis, scrollRef]
  );

  // Pointer up - end drag
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isDraggingRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setVisualDragging(false);
    },
    []
  );

  // Click on track - page scroll towards click position (like native scrollbar behavior)
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore if this was a drag operation
      if (!wasClickRef.current) return;

      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const rect = track.getBoundingClientRect();
      const clickPos =
        axis === 'x' ? e.clientX - rect.left : e.clientY - rect.top;
      const trackSize = axis === 'x' ? rect.width : rect.height;

      const viewport = axis === 'x' ? el.clientWidth : el.clientHeight;
      const content = axis === 'x' ? el.scrollWidth : el.scrollHeight;
      const currentScroll = axis === 'x' ? el.scrollLeft : el.scrollTop;
      const maxScroll = content - viewport;

      // Calculate thumb position to determine if click is before or after thumb
      const thumbPercent = Math.max(10, (viewport / content) * 100);
      const scrollProgress = maxScroll > 0 ? currentScroll / maxScroll : 0;
      const thumbStart = (scrollProgress * (100 - thumbPercent) / 100) * trackSize;
      const thumbEnd = thumbStart + (thumbPercent / 100) * trackSize;

      // Determine scroll direction based on click relative to thumb
      let newScroll: number;
      if (clickPos < thumbStart) {
        // Click before thumb - page up/left
        newScroll = Math.max(0, currentScroll - viewport * 0.9);
      } else if (clickPos > thumbEnd) {
        // Click after thumb - page down/right
        newScroll = Math.min(maxScroll, currentScroll + viewport * 0.9);
      } else {
        // Click on thumb - ignore (drag will handle this)
        return;
      }

      // Apply scroll with optional smooth behavior
      if (smoothScroll) {
        el.scrollTo({
          [axis === 'x' ? 'left' : 'top']: newScroll,
          behavior: 'smooth',
        });
      } else {
        if (axis === 'x') {
          el.scrollLeft = newScroll;
        } else {
          el.scrollTop = newScroll;
        }
      }
    },
    [axis, scrollRef, smoothScroll]
  );

  // Arrow scroll handler - scrolls by step amount in given direction
  const scrollByStep = useCallback(
    (direction: 'start' | 'end') => {
      const el = scrollRef.current;
      if (!el) return;

      const currentScroll = axis === 'x' ? el.scrollLeft : el.scrollTop;
      const maxScroll = axis === 'x'
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight;

      const delta = direction === 'start' ? -scrollStep : scrollStep;
      const newScroll = Math.max(0, Math.min(maxScroll, currentScroll + delta));

      if (smoothScroll) {
        el.scrollTo({
          [axis === 'x' ? 'left' : 'top']: newScroll,
          behavior: 'smooth',
        });
      } else {
        if (axis === 'x') {
          el.scrollLeft = newScroll;
        } else {
          el.scrollTop = newScroll;
        }
      }
    },
    [axis, scrollRef, scrollStep, smoothScroll]
  );

  // Arrow pointer down - start repeating scroll
  const handleArrowPointerDown = useCallback(
    (direction: 'start' | 'end') => {
      // Immediate scroll
      scrollByStep(direction);

      // Start repeating after initial delay
      const startRepeating = () => {
        arrowIntervalRef.current = setInterval(() => {
          scrollByStep(direction);
        }, 80); // Repeat every 80ms
      };

      // Initial delay before repeating (like native behavior)
      const initialTimeout = setTimeout(startRepeating, 300);

      // Store the initial timeout to clear it
      arrowIntervalRef.current = initialTimeout as unknown as NodeJS.Timeout;
    },
    [scrollByStep]
  );

  // Arrow pointer up - stop repeating scroll
  const handleArrowPointerUp = useCallback(() => {
    if (arrowIntervalRef.current) {
      clearTimeout(arrowIntervalRef.current);
      clearInterval(arrowIntervalRef.current);
      arrowIntervalRef.current = null;
    }
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (arrowIntervalRef.current) {
        clearTimeout(arrowIntervalRef.current);
        clearInterval(arrowIntervalRef.current);
      }
    };
  }, []);

  const isActive = isHovering || visualDragging;

  // Don't render if no overflow
  if (!hasOverflow) return null;

  // Common arrow button styles
  const arrowButtonClass = cn(
    'flex items-center justify-center rounded transition-all duration-150',
    'text-gray-400 dark:text-gray-500',
    'hover:text-gray-600 dark:hover:text-gray-300',
    'hover:bg-gray-200/50 dark:hover:bg-gray-700/50',
    'active:scale-90 active:bg-gray-300/50 dark:active:bg-gray-600/50',
    'select-none cursor-pointer w-3 h-3'
  );

  const iconSize = 10;

  return (
    <AnimatePresence>
      {isMounted && (
        <motion.div
          className={cn(
            'relative flex items-center',
            axis === 'x' ? 'h-3 w-full flex-row gap-0.5 px-0.5' : 'w-3 h-full flex-col gap-0.5 py-0.5',
            className
          )}
          style={axis === 'x' ? { paddingLeft: sidebarOffset + 2 } : undefined}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          initial={{ opacity: 0 }}
          animate={{
            opacity: isActive ? 1 : 0.5,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Start Arrow (Left/Up) */}
          {showArrows && (
            <motion.button
              type="button"
              className={arrowButtonClass}
              onPointerDown={(e) => {
                e.preventDefault();
                handleArrowPointerDown('start');
              }}
              onPointerUp={handleArrowPointerUp}
              onPointerLeave={handleArrowPointerUp}
              onPointerCancel={handleArrowPointerUp}
              whileTap={{ scale: 0.85 }}
              aria-label={axis === 'x' ? 'Scroll left' : 'Scroll up'}
            >
              {axis === 'x' ? (
                <ChevronLeft size={iconSize} strokeWidth={2.5} />
              ) : (
                <ChevronUp size={iconSize} strokeWidth={2.5} />
              )}
            </motion.button>
          )}

          {/* Track */}
          <div
            ref={trackRef}
            className={cn(
              'relative rounded-full cursor-pointer transition-all duration-150 flex-1',
              'bg-gray-300/40 dark:bg-gray-700/40 backdrop-blur-sm',
              isActive
                ? axis === 'x'
                  ? 'h-2.5 bg-gray-300/60 dark:bg-gray-700/60'
                  : 'w-2.5 bg-gray-300/60 dark:bg-gray-700/60'
                : axis === 'x'
                  ? 'h-2'
                  : 'w-2'
            )}
            onClick={handleTrackClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Thumb */}
            <motion.div
              className={cn(
                'absolute rounded-full',
                visualDragging
                  ? 'bg-gray-600 dark:bg-gray-300'
                  : 'bg-gray-400/90 dark:bg-gray-500/90 hover:bg-gray-500 dark:hover:bg-gray-400'
              )}
              style={
                axis === 'x'
                  ? {
                      width: `${thumbMetrics.size}%`,
                      left: `${thumbMetrics.position}%`,
                      top: 0,
                      bottom: 0,
                    }
                  : {
                      height: `${thumbMetrics.size}%`,
                      top: `${thumbMetrics.position}%`,
                      left: 0,
                      right: 0,
                    }
              }
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: visualDragging ? 1.05 : 1,
                opacity: 1,
              }}
              transition={{
                scale: { duration: 0.1 },
                opacity: { duration: 0.15 },
              }}
            />
          </div>

          {/* End Arrow (Right/Down) */}
          {showArrows && (
            <motion.button
              type="button"
              className={arrowButtonClass}
              onPointerDown={(e) => {
                e.preventDefault();
                handleArrowPointerDown('end');
              }}
              onPointerUp={handleArrowPointerUp}
              onPointerLeave={handleArrowPointerUp}
              onPointerCancel={handleArrowPointerUp}
              whileTap={{ scale: 0.85 }}
              aria-label={axis === 'x' ? 'Scroll right' : 'Scroll down'}
            >
              {axis === 'x' ? (
                <ChevronRight size={iconSize} strokeWidth={2.5} />
              ) : (
                <ChevronDown size={iconSize} strokeWidth={2.5} />
              )}
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
