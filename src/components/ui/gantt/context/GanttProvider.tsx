// Gantt chart provider component with custom scrollbars
// Redesigned: Native scroll physics + gutter-based custom scrollbars for X and Y

'use client';

import { cn } from '@/lib/utils';
import { differenceInMonths } from 'date-fns';
import { motion } from 'framer-motion';
import throttle from 'lodash.throttle';
import { CustomScrollbar } from '../components/CustomScrollbar';
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
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';

import type { Range, TimelineData } from '../types';
import { createInitialTimelineData, getMonthBoundsByMousePosition } from '../utils';
import { GanttContext } from './GanttContext';
import type { StagedTask } from '@/store/useStagingStore';

// Re-export from Zustand store for backwards compatibility
export {
  useGanttDragging,
  useGanttScrollX,
  useGanttDropTarget,
} from '@/store/useGanttUIStore';
export type { DropTargetInfo } from '@/store/useGanttUIStore';

// Import for internal use
import { useGanttScrollX, useGanttScrollY, useGanttDropTarget, useGanttUIStore } from '@/store/useGanttUIStore';

export type GanttProviderProps = {
  range?: Range;
  zoom?: number;
  onAddItem?: (date: Date) => void;
  validDropRows?: number[]; // Row indices where items can be dropped
  children: ReactNode;
  className?: string;
  // Staging zone support
  enableStaging?: boolean;
  stagingZone?: ReactNode; // Slot for the staging zone component
  onStagedItemDrop?: (stagedTask: StagedTask, startAt: Date, endAt: Date, targetRow: number) => void;
};

export const GanttProvider: FC<GanttProviderProps> = ({
  zoom = 100,
  range = 'monthly',
  onAddItem,
  validDropRows,
  children,
  className,
  enableStaging = false,
  stagingZone,
  onStagedItemDrop,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData, setTimelineData] = useState<TimelineData>(
    createInitialTimelineData(new Date())
  );
  const [scrollX, setScrollX] = useGanttScrollX();
  const [, setDropTarget] = useGanttDropTarget();
  const [sidebarWidth, setSidebarWidth] = useState(300);

  // Drag-and-drop state for staging zone
  const [activeDraggedTask, setActiveDraggedTask] = useState<StagedTask | null>(null);

  // Store the last valid drop target info to ensure drop matches highlight exactly
  // This stores both row and timeline X so handleDragEnd uses the exact same values shown to user
  const lastValidDropRef = useRef<{ targetRow: number; timelineX: number } | null>(null);

  // Configure DnD sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Use standard rectIntersection - staging zone is now inside the same scroll container
  // so cross-container issues no longer exist
  const collisionDetection = rectIntersection;

  // Scroll fade indicator state (left side only)
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [, setScrollY] = useGanttScrollY();

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

  // Update scroll fade indicators
  const updateScrollIndicators = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const threshold = 10;
    const max = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > threshold);
  }, []);

  // Track scroll position - throttled for performance
  // Native browser physics handles momentum - we just track position
  const handleScroll = useMemo(
    () =>
      throttle(() => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollTop } = scrollRef.current;
        setScrollX(scrollLeft);
        setScrollY(scrollTop);
        updateScrollIndicators();
      }, 16), // ~60fps throttle
    [setScrollX, setScrollY, updateScrollIndicators]
  );

  // Initialize scroll tracking
  useEffect(() => {
    updateScrollIndicators();

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (element) {
        element.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll, updateScrollIndicators]);

  // Handle drag start from staging zone
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

    // Reset the drop target ref at drag start
    lastValidDropRef.current = null;

    // Check if drag started from staging zone (ID starts with 'staged-')
    if (typeof active.id === 'string' && active.id.startsWith('staged-')) {
      const task = active.data.current?.task as StagedTask | undefined;
      if (task) {
        setActiveDraggedTask(task);
      }
    }
  }, []);

  // Handle drag move - update drop target indicator in real-time
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, activatorEvent, delta } = event;

    // Only handle staged items
    if (typeof active.id !== 'string' || !active.id.startsWith('staged-')) {
      return;
    }

    if (!scrollRef.current) {
      return;
    }

    const task = active.data.current?.task as StagedTask | undefined;
    if (!task) {
      return;
    }

    const pointerEvent = activatorEvent as PointerEvent | MouseEvent | undefined;
    if (!pointerEvent) {
      return;
    }

    const containerRect = scrollRef.current.getBoundingClientRect();

    // Calculate current position
    const initialX = (pointerEvent as PointerEvent).clientX ?? 0;
    const initialY = (pointerEvent as PointerEvent).clientY ?? 0;
    const currentX = initialX + delta.x;
    const currentY = initialY + delta.y;

    // Check if outside container bounds - clear indicator and ref
    if (currentY < containerRect.top || currentY > containerRect.bottom ||
        currentX < containerRect.left || currentX > containerRect.right) {
      setDropTarget(null);
      lastValidDropRef.current = null;
      return;
    }

    // Calculate position relative to timeline
    const scrollTop = scrollRef.current.scrollTop;
    const positionInContainer = currentY - containerRect.top;
    const timelineY = positionInContainer - headerHeight + scrollTop;

    // If above the timeline rows (in header or higher), clear indicator and ref
    if (timelineY < 0) {
      setDropTarget(null);
      lastValidDropRef.current = null;
      return;
    }

    // Calculate target row
    const targetRow = Math.max(0, Math.floor(timelineY / rowHeight));

    // Calculate the X position for the drop indicator
    const timelineX = currentX - containerRect.left - sidebarWidth + scrollX;

    // Store both row AND timelineX in ref so handleDragEnd uses EXACT same values
    // This ensures the drop position matches exactly what the user saw highlighted
    lastValidDropRef.current = { targetRow, timelineX };
    const adjustedColumnWidth = (zoom / 100) * columnWidth;

    // Snap indicator to full column width (matches snap-to-month drop behavior)
    // Calculate which column the mouse is in
    const columnIndex = Math.floor(timelineX / adjustedColumnWidth);
    const snappedOffset = columnIndex * adjustedColumnWidth;

    // Update drop target indicator - show full column width
    setDropTarget({
      rowIndex: targetRow,
      offset: Math.max(0, snappedOffset),
      width: adjustedColumnWidth,
    });
  }, [columnWidth, headerHeight, rowHeight, scrollX, setDropTarget, sidebarWidth, zoom]);

  // Handle drag end - use dnd-kit's event.over for proper row targeting
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, activatorEvent } = event;

    // Clear drag state
    setActiveDraggedTask(null);
    setDropTarget(null);
    lastValidDropRef.current = null;

    // Only handle staged items being dropped
    if (typeof active.id !== 'string' || !active.id.startsWith('staged-')) {
      return;
    }

    const task = active.data.current?.task as StagedTask | undefined;

    if (!task || !onStagedItemDrop || !scrollRef.current) {
      return;
    }

    // Use event.over from dnd-kit's collision detection for proper row targeting
    let dndKitRow: number | undefined;

    if (over) {
      // Parse row index from droppable ID (format: "droppable-row-{index}")
      const overId = String(over.id);
      if (overId.startsWith('droppable-row-')) {
        dndKitRow = parseInt(overId.replace('droppable-row-', ''), 10);
      } else if (over.data.current?.rowIndex !== undefined) {
        // Fallback: check droppable data
        dndKitRow = over.data.current.rowIndex;
      }
    }

    // Fallback: If dnd-kit didn't detect a row, calculate from pointer position
    // This handles cases where cross-container collision detection fails
    if (dndKitRow === undefined) {
      const containerRect = scrollRef.current.getBoundingClientRect();
      const pointerEvent = activatorEvent as PointerEvent | MouseEvent | undefined;

      if (pointerEvent) {
        const delta = event.delta;
        const initialY = (pointerEvent as PointerEvent).clientY ?? 0;
        const currentY = initialY + delta.y;

        // Calculate position relative to timeline
        const scrollTop = scrollRef.current.scrollTop;
        const positionInContainer = currentY - containerRect.top;
        const timelineY = positionInContainer - headerHeight + scrollTop;

        // Only accept if inside the timeline area
        if (timelineY >= 0) {
          const calculatedRow = Math.floor(timelineY / rowHeight);

          // Validate this row exists in validDropRows
          if (validDropRows?.includes(calculatedRow)) {
            dndKitRow = calculatedRow;
          }
        }
      }
    }

    // If still no valid droppable row was detected, cancel the drop
    if (dndKitRow === undefined) {
      return;
    }

    // Calculate timeline X position for date snapping
    const pointerEvent = activatorEvent as PointerEvent | MouseEvent | undefined;
    if (!pointerEvent) {
      return;
    }

    const containerRect = scrollRef.current.getBoundingClientRect();
    const delta = event.delta;
    const initialX = (pointerEvent as PointerEvent).clientX ?? 0;
    const finalX = initialX + delta.x;
    const timelineX = finalX - containerRect.left - sidebarWidth + scrollX;

    // Snap to full month boundaries
    const { startAt: newStartAt, endAt: newEndAt } = getMonthBoundsByMousePosition(
      { timelineData, columnWidth, zoom, range },
      timelineX
    );

    onStagedItemDrop(task, newStartAt, newEndAt, dndKitRow);
  }, [onStagedItemDrop, columnWidth, zoom, sidebarWidth, scrollX, timelineData, range, setDropTarget, validDropRows, headerHeight, rowHeight]);

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
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="relative flex h-full w-full flex-col">
          {/* Staging zone - sticky left-0 keeps it static during horizontal scroll */}
          {enableStaging && stagingZone && (
            <div
              className="sticky left-0 flex-shrink-0 z-50 bg-white dark:bg-[var(--bg-card)] border-b border-gray-200 dark:border-gray-700 overflow-x-clip"
              style={cssVariables}
            >
              {stagingZone}
            </div>
          )}

          {/* Main area with gutter-based scrollbars */}
          <div className="flex flex-1 min-h-0">
            {/* Content column + X scrollbar gutter */}
            <div className="flex flex-1 flex-col min-w-0">
              {/* Scroll container with fade indicators */}
              <div className="relative flex-1 min-h-0">
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

                {/* Main scroll container - native scrolling with hidden scrollbars */}
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
              </div>

              {/* X-axis scrollbar gutter */}
              <CustomScrollbar
                axis="x"
                scrollRef={scrollRef}
                sidebarOffset={sidebarWidth}
              />
            </div>

            {/* Y-axis scrollbar column - aligns with content rows below header */}
            <div className="flex w-3 flex-col pb-3">
              {/* Header spacer to align scrollbar with content rows */}
              <div style={{ height: headerHeight }} className="flex-shrink-0" />
              {/* Y scrollbar - flex-1 fills remaining height minus X scrollbar gutter */}
              <CustomScrollbar
                axis="y"
                scrollRef={scrollRef}
                className="flex-1 min-h-0"
              />
            </div>
          </div>
        </div>

        {/* Drag overlay for visual feedback during drag */}
        <DragOverlay dropAnimation={null}>
          {activeDraggedTask && (
            <div
              className="rounded-md border-2 border-blue-500 bg-blue-100/90 dark:bg-blue-800/90 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-200 shadow-lg"
              style={{ width: 'auto', minWidth: 100 }}
            >
              {activeDraggedTask.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </GanttContext.Provider>
  );
};
