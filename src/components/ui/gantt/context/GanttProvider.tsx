// Gantt chart provider component with horizontal scrolling and timeline management
// Extracted from components/ui/gantt.tsx

'use client';

import { cn } from '@/lib/utils';
import { differenceInMonths } from 'date-fns';
import throttle from 'lodash.throttle';
import {
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
  const [sidebarWidth, setSidebarWidth] = useState(300); // Default to 300, will update after mount

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
  }, [children]); // Re-check when children change

  // Auto-scroll to today's position on mount
  useEffect(() => {
    if (scrollRef.current && timelineData.length > 0) {
      const today = new Date();
      const firstYear = timelineData[0]?.year ?? today.getFullYear();
      const timelineStart = new Date(firstYear, 0, 1);

      // Calculate the offset in months from timeline start to today
      const monthsOffset = differenceInMonths(today, timelineStart);

      // Calculate scroll position (subtract 1 month to show some context before today)
      const adjustedColumnWidth = (zoom / 100) * columnWidth;
      const scrollPosition = Math.max(0, (monthsOffset - 1) * adjustedColumnWidth);

      // Scroll to today with a small delay to ensure DOM is ready
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [timelineData, zoom, columnWidth]);

  // Track scroll position only - memoize the throttled function properly
  const handleScroll = useMemo(
    () =>
      throttle(() => {
        if (!scrollRef.current) {
          return;
        }
        setScrollX(scrollRef.current.scrollLeft);
      }, 100),
    [setScrollX]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

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
      <div
        className={cn(
          'gantt relative grid h-full w-full flex-none select-none overflow-auto rounded-sm bg-secondary',
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
    </GanttContext.Provider>
  );
};
