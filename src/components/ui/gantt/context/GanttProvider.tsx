// Gantt chart provider component with enhanced smooth scrolling
// Option D: Enhanced scroll physics with momentum and smooth animations

'use client';

import { cn } from '@/lib/utils';
import { differenceInMonths } from 'date-fns';
import { motion } from 'framer-motion';
import throttle from 'lodash.throttle';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  FC,
  ReactNode,
} from 'react';

import type { Range, TimelineData } from '../types';
import { createInitialTimelineData } from '../utils';
import { GanttContext } from './GanttContext';

// Re-export from Zustand store for backwards compatibility
export {
  useGanttDragging,
  useGanttScrollX,
  useGanttDropTarget,
} from '@/store/useGanttUIStore';
export type { DropTargetInfo } from '@/store/useGanttUIStore';

// Import for internal use
import { useGanttScrollX } from '@/store/useGanttUIStore';

export type GanttProviderProps = {
  range?: Range;
  zoom?: number;
  onAddItem?: (date: Date) => void;
  validDropRows?: number[]; // Row indices where items can be dropped
  children: ReactNode;
  className?: string;
};

export const GanttProvider: FC<GanttProviderProps> = ({
  zoom = 100,
  range = 'monthly',
  onAddItem,
  validDropRows,
  children,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData, setTimelineData] = useState<TimelineData>(
    createInitialTimelineData(new Date())
  );
  const [, setScrollX] = useGanttScrollX();
  const [sidebarWidth, setSidebarWidth] = useState(300);

  // Scroll fade indicator states
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Momentum scrolling state
  const velocityRef = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const lastScrollPos = useRef(0);
  const momentumRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom scrollbar state
  const [scrollProgress, setScrollProgress] = useState(0);
  const [maxScrollX, setMaxScrollX] = useState(0);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const [isHoveringScrollbar, setIsHoveringScrollbar] = useState(false);

  const headerHeight = 60;
  const rowHeight = 36;
  let columnWidth = 50;

  if (range === 'monthly') {
    columnWidth = 150;
  } else if (range === 'quarterly') {
    columnWidth = 100;
  }

  const cssVariables = {
    '--gantt-zoom': `${zoom}`,
    '--gantt-column-width': `${(zoom / 100) * columnWidth}px`,
    '--gantt-header-height': `${headerHeight}px`,
    '--gantt-row-height': `${rowHeight}px`,
    '--gantt-sidebar-width': `${sidebarWidth}px`,
  } as CSSProperties;

  // Update sidebar width after mount when DOM is ready
  useEffect(() => {
    if (scrollRef.current) {
      const sidebarElement = scrollRef.current.querySelector(
        '[data-roadmap-ui="gantt-sidebar"]'
      );
      setSidebarWidth(sidebarElement ? 300 : 0);
    }
  }, [children]);

  // Auto-scroll to today's position on mount
  useEffect(() => {
    if (scrollRef.current && timelineData.length > 0) {
      const today = new Date();
      const firstYear = timelineData[0]?.year ?? today.getFullYear();
      const timelineStart = new Date(firstYear, 0, 1);

      const monthsOffset = differenceInMonths(today, timelineStart);
      const adjustedColumnWidth = (zoom / 100) * columnWidth;
      const scrollPosition = Math.max(0, (monthsOffset - 1) * adjustedColumnWidth);

      setTimeout(() => {
        scrollRef.current?.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [timelineData, zoom, columnWidth]);

  // Update scroll indicators and progress
  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const threshold = 10;
    const max = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > threshold);
    setCanScrollRight(scrollLeft < max - threshold);
    setMaxScrollX(max);
    setScrollProgress(max > 0 ? scrollLeft / max : 0);
  }, []);

  // Momentum scrolling - apply physics after user releases scroll
  const applyMomentum = useCallback(() => {
    if (!scrollRef.current) return;

    const friction = 0.95;
    const minVelocity = 0.5;

    const step = () => {
      if (!scrollRef.current) return;

      velocityRef.current *= friction;

      if (Math.abs(velocityRef.current) < minVelocity) {
        momentumRef.current = null;
        return;
      }

      scrollRef.current.scrollLeft += velocityRef.current;
      momentumRef.current = requestAnimationFrame(step);
    };

    momentumRef.current = requestAnimationFrame(step);
  }, []);

  // Enhanced wheel handler with momentum tracking
  const handleWheel = useCallback((e: WheelEvent) => {
    // Don't prevent default - let native scroll happen
    // But track velocity for momentum

    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    const now = Date.now();
    const dt = Math.max(1, now - lastScrollTime.current);

    // Track horizontal velocity (including shift+scroll for horizontal)
    const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
    velocityRef.current = deltaX / dt * 16; // Normalize to ~60fps

    lastScrollTime.current = now;

    // Start momentum after scroll stops
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (Math.abs(velocityRef.current) > 2) {
        applyMomentum();
      }
    }, 50);
  }, [applyMomentum]);

  // Track scroll position - throttled for performance
  const handleScroll = useMemo(
    () =>
      throttle(() => {
        if (!scrollRef.current) return;

        const { scrollLeft } = scrollRef.current;
        setScrollX(scrollLeft);
        updateScrollState();

        // Track position changes for velocity calculation
        const now = Date.now();
        const dt = Math.max(1, now - lastScrollTime.current);
        const dx = scrollLeft - lastScrollPos.current;

        if (!isDraggingScrollbar) {
          velocityRef.current = dx / dt * 16;
        }

        lastScrollPos.current = scrollLeft;
        lastScrollTime.current = now;
      }, 16), // ~60fps throttle
    [setScrollX, updateScrollState, isDraggingScrollbar]
  );

  // Initialize and cleanup
  useEffect(() => {
    updateScrollState();

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      element.addEventListener('wheel', handleWheel, { passive: true });
    }

    return () => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
        element.removeEventListener('wheel', handleWheel);
      }
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, handleWheel, updateScrollState]);

  // Custom scrollbar drag handler
  const handleScrollbarDrag = useCallback((clientX: number, trackElement: HTMLDivElement) => {
    if (!scrollRef.current) return;

    const rect = trackElement.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, relativeX / rect.width));

    scrollRef.current.scrollLeft = progress * maxScrollX;
  }, [maxScrollX]);

  // Scrollbar pointer handlers
  const handleScrollbarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingScrollbar(true);

    // Cancel any momentum
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }

    const track = e.currentTarget;
    track.setPointerCapture(e.pointerId);
    handleScrollbarDrag(e.clientX, track);
  }, [handleScrollbarDrag]);

  const handleScrollbarPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrollbar) return;
    handleScrollbarDrag(e.clientX, e.currentTarget);
  }, [isDraggingScrollbar, handleScrollbarDrag]);

  const handleScrollbarPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingScrollbar(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // Calculate scrollbar thumb width
  const viewportWidth = scrollRef.current?.clientWidth ?? 0;
  const contentWidth = scrollRef.current?.scrollWidth ?? 0;
  const thumbWidthPercent = contentWidth > 0
    ? Math.max(10, (viewportWidth / contentWidth) * 100)
    : 100;
  const thumbLeftPercent = scrollProgress * (100 - thumbWidthPercent);

  return (
    <GanttContext.Provider
      value={{
        zoom,
        range,
        headerHeight,
        columnWidth,
        sidebarWidth,
        rowHeight,
        onAddItem,
        timelineData,
        placeholderLength: 2,
        ref: scrollRef,
        validDropRows,
      }}
    >
      <div className="relative h-full w-full">
        {/* Scroll fade indicator - Left */}
        <motion.div
          className={cn(
            'pointer-events-none absolute left-[var(--gantt-sidebar-width)] top-0 z-40 h-full w-16',
            'bg-gradient-to-r from-black/10 dark:from-black/30 to-transparent'
          )}
          style={{ '--gantt-sidebar-width': `${sidebarWidth}px` } as CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: canScrollLeft ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Scroll fade indicator - Right */}
        <motion.div
          className={cn(
            'pointer-events-none absolute right-0 top-0 z-40 h-full w-16',
            'bg-gradient-to-l from-black/10 dark:from-black/30 to-transparent'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: canScrollRight ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Main scroll container */}
        <div
          className={cn(
            'gantt relative grid h-full w-full flex-none select-none overflow-auto rounded-sm bg-secondary',
            // Hide native scrollbar with CSS
            'scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
            range,
            className
          )}
          style={{
            ...cssVariables,
            gridTemplateColumns: 'var(--gantt-sidebar-width) 1fr',
          }}
          ref={scrollRef}
        >
          {children}
        </div>

        {/* Custom horizontal scrollbar */}
        {maxScrollX > 0 && (
          <motion.div
            className="absolute bottom-1 z-50 mx-2 h-2"
            style={{ left: sidebarWidth, right: 4 }}
            onMouseEnter={() => setIsHoveringScrollbar(true)}
            onMouseLeave={() => setIsHoveringScrollbar(false)}
            initial={{ opacity: 0.4 }}
            animate={{
              opacity: isHoveringScrollbar || isDraggingScrollbar ? 1 : 0.4,
              height: isHoveringScrollbar || isDraggingScrollbar ? 10 : 8,
            }}
            transition={{ duration: 0.15 }}
          >
            {/* Track */}
            <div
              className="relative h-full w-full rounded-full bg-gray-300/50 dark:bg-gray-700/50 backdrop-blur-sm cursor-pointer"
              onPointerDown={handleScrollbarPointerDown}
              onPointerMove={handleScrollbarPointerMove}
              onPointerUp={handleScrollbarPointerUp}
              onPointerCancel={handleScrollbarPointerUp}
            >
              {/* Thumb */}
              <motion.div
                className={cn(
                  'absolute top-0 h-full rounded-full transition-colors',
                  isDraggingScrollbar
                    ? 'bg-gray-600 dark:bg-gray-300'
                    : 'bg-gray-400 dark:bg-gray-500 hover:bg-gray-500 dark:hover:bg-gray-400'
                )}
                style={{
                  width: `${thumbWidthPercent}%`,
                  left: `${thumbLeftPercent}%`,
                }}
                animate={{
                  scale: isDraggingScrollbar ? 1.05 : 1,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </GanttContext.Provider>
  );
};
