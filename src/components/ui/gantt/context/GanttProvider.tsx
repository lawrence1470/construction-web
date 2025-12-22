// Gantt chart provider component with custom scrollbars
// Redesigned: Native scroll physics + gutter-based custom scrollbars for X and Y

'use client';

import { cn } from '@/lib/utils';
import { differenceInMonths, addDays } from 'date-fns';
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

  // Scroll fade indicator states
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
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
    setCanScrollRight(scrollLeft < max - threshold);
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
    console.group('[Staging] Drag Start');
    console.log('Active ID:', active.id);
    console.log('Active data:', active.data.current);
    console.log('Is staged item:', typeof active.id === 'string' && active.id.startsWith('staged-'));

    // Reset the drop target ref at drag start
    lastValidDropRef.current = null;

    // Check if drag started from staging zone (ID starts with 'staged-')
    if (typeof active.id === 'string' && active.id.startsWith('staged-')) {
      const task = active.data.current?.task as StagedTask | undefined;
      console.log('Staged task:', task);
      if (task) {
        setActiveDraggedTask(task);
        console.log('Set active dragged task');
      }
    }
    console.groupEnd();
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

  // Handle drag end - calculate drop position based on mouse position in timeline
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, activatorEvent } = event;
    console.group('[Staging] Drag End - Deep Debug');
    console.log('Active ID:', active.id);

    // *** CRITICAL: Read store value BEFORE clearing it ***
    // This captures the exact drop target that was shown to the user
    const storeDropTarget = useGanttUIStore.getState().dropTarget;
    console.log('📍 Captured store dropTarget before clearing:', storeDropTarget);

    setActiveDraggedTask(null);
    setDropTarget(null); // Clear the drop indicator

    // Only handle staged items being dropped
    if (typeof active.id !== 'string' || !active.id.startsWith('staged-')) {
      console.log('Not a staged item, skipping');
      console.groupEnd();
      return;
    }

    const task = active.data.current?.task as StagedTask | undefined;
    console.log('Task:', task);
    console.log('Has onStagedItemDrop:', !!onStagedItemDrop);
    console.log('Has scrollRef.current:', !!scrollRef.current);

    if (!task || !onStagedItemDrop || !scrollRef.current) {
      console.log('Missing required data, aborting');
      console.groupEnd();
      return;
    }

    // Get the current mouse position from the activator event
    // For pointer events, we can get the final position from the event
    const pointerEvent = activatorEvent as PointerEvent | MouseEvent | undefined;
    if (!pointerEvent) {
      console.log('No pointer event, aborting');
      console.groupEnd();
      return;
    }

    // Get container bounds
    const containerRect = scrollRef.current.getBoundingClientRect();

    // DEBUG: Log all DOM element positions for clarity
    console.group('📐 DOM Layout Analysis');
    console.log('scrollRef (container):', {
      top: containerRect.top,
      left: containerRect.left,
      width: containerRect.width,
      height: containerRect.height,
      bottom: containerRect.bottom,
    });

    // Find staging zone (should be ABOVE the container)
    const stagingZone = document.querySelector('[data-staging-zone]');
    if (stagingZone) {
      const stagingRect = stagingZone.getBoundingClientRect();
      console.log('Staging zone [data-staging-zone]:', {
        top: stagingRect.top,
        bottom: stagingRect.bottom,
        height: stagingRect.height,
        'containerRect.top - stagingRect.bottom': containerRect.top - stagingRect.bottom,
        message: 'Gap between staging zone bottom and container top',
      });
    } else {
      console.log('No staging zone found (enableStaging might be false)');
    }

    // Find actual row elements by looking for Gantt sidebar items
    const sidebarItems = scrollRef.current.querySelectorAll('[data-roadmap-ui="gantt-sidebar"] > div:last-child > div > div:last-child > div');
    console.log(`Found ${sidebarItems.length} potential sidebar rows`);

    // Try to find items in the feature list area
    const featureListItems = scrollRef.current.querySelectorAll('.absolute');
    console.log(`Found ${featureListItems.length} absolutely positioned elements (potential feature items)`);

    // Log the expected row boundaries based on headerHeight and rowHeight
    console.log('Expected layout based on config:', {
      headerHeight,
      rowHeight,
      'Row 0 start (from container top)': headerHeight,
      'Row 1 start (from container top)': headerHeight + rowHeight,
      'Row 2 start (from container top)': headerHeight + (2 * rowHeight),
      'Row 3 start (from container top)': headerHeight + (3 * rowHeight),
    });
    console.groupEnd();

    // Calculate mouse position relative to the timeline area
    // Use the delta to calculate final position
    const delta = event.delta;
    const initialX = (pointerEvent as PointerEvent).clientX ?? 0;
    const initialY = (pointerEvent as PointerEvent).clientY ?? 0;
    const finalX = initialX + delta.x;
    const finalY = initialY + delta.y;

    console.group('🖱️ Mouse Position Calculation');
    console.log('Initial position (drag start):', { initialX, initialY });
    console.log('Delta (movement):', delta);
    console.log('Final position (drop):', { finalX, finalY });
    console.groupEnd();

    console.group('📊 Coordinate Calculation');
    // Calculate position relative to the timeline (accounting for sidebar and scroll)
    const timelineX = finalX - containerRect.left - sidebarWidth + scrollX;
    console.log('timelineX calculation:', {
      finalX,
      'containerRect.left': containerRect.left,
      sidebarWidth,
      scrollX,
      formula: 'finalX - containerRect.left - sidebarWidth + scrollX',
      result: timelineX,
    });

    // Key insight: The scroll container (scrollRef) starts BELOW the staging zone
    // because staging zone is rendered above it in the DOM (lines 456-458)
    // So containerRect.top is already AFTER the staging zone
    // We only need to subtract the header which is INSIDE the scroll container
    // ALSO: Account for vertical scroll position (scrollTop)
    const scrollTop = scrollRef.current.scrollTop;
    const positionInContainer = finalY - containerRect.top;
    const timelineY = positionInContainer - headerHeight + scrollTop;

    console.log('timelineY calculation:', {
      finalY,
      'containerRect.top': containerRect.top,
      'positionInContainer': positionInContainer,
      headerHeight,
      scrollTop,
      formula: '(finalY - containerRect.top) - headerHeight + scrollTop',
      result: timelineY,
    });

    // Check if drop is outside the timeline area (above header or outside container)
    // If timelineY is negative, the drop is in the header or above the container
    if (timelineY < 0) {
      console.log('❌ Drop cancelled: position is above the timeline rows (timelineY < 0)');
      console.log('   Keeping task in staging zone');
      console.groupEnd();
      return;
    }

    // Also check if the drop is outside the container horizontally or vertically
    if (finalY < containerRect.top || finalY > containerRect.bottom ||
        finalX < containerRect.left || finalX > containerRect.right) {
      console.log('❌ Drop cancelled: position is outside the container bounds');
      console.log('   Keeping task in staging zone');
      console.groupEnd();
      return;
    }

    // *** KEY FIX: Use storeDropTarget captured at the START of handleDragEnd ***
    // We captured it before calling setDropTarget(null), so it has the exact value
    // that was shown to the user in the visual indicator

    // Fallback to ref if store was null (edge case)
    const savedDropInfo = lastValidDropRef.current;

    // Priority: Zustand store > ref > calculated
    const targetRow = storeDropTarget?.rowIndex
      ?? savedDropInfo?.targetRow
      ?? Math.max(0, Math.floor(timelineY / rowHeight));
    const finalTimelineX = storeDropTarget?.offset
      ?? savedDropInfo?.timelineX
      ?? timelineX;

    console.log('🎯 Drop Position Resolution:', {
      'From Zustand store (visual indicator source)': storeDropTarget,
      'From handleDragMove ref (backup)': savedDropInfo,
      'Fallback calculated row': Math.floor(timelineY / rowHeight),
      'Fallback calculated timelineX': timelineX,
      'FINAL targetRow': targetRow,
      'FINAL timelineX': finalTimelineX,
      'Source used': storeDropTarget ? 'ZUSTAND_STORE' : savedDropInfo ? 'REF' : 'CALCULATED',
    });

    // Clear the ref now that we've used it
    lastValidDropRef.current = null;
    console.groupEnd();

    // Additional sanity check: log what row heights would mean
    console.group('🎯 Row Position Reference');
    console.log('Expected row positions from container top:');
    for (let i = 0; i < 5; i++) {
      const rowTop = headerHeight + (i * rowHeight);
      const rowBottom = rowTop + rowHeight;
      console.log(`  Row ${i}: ${rowTop}px - ${rowBottom}px (relative to scroll container)`);
    }
    console.log(`Mouse positionInContainer: ${positionInContainer}px`);
    console.log(`Mouse timelineY (after header): ${timelineY}px`);
    console.groupEnd();

    // Snap to full month boundaries (1st to last day of the month)
    // Use the finalTimelineX from the ref to ensure date matches what user saw
    const { startAt: newStartAt, endAt: newEndAt } = getMonthBoundsByMousePosition(
      { timelineData, columnWidth, zoom, range },
      finalTimelineX
    );
    console.log('Snapped to month:', {
      startAt: newStartAt.toISOString(),
      endAt: newEndAt.toISOString(),
      month: newStartAt.toLocaleString('default', { month: 'long', year: 'numeric' }),
    });

    console.log('Valid drop rows:', validDropRows);

    // Call the callback with the calculated values
    console.log('✅ Calling onStagedItemDrop:', {
      taskId: task.id,
      taskName: task.name,
      newStartAt: newStartAt.toISOString(),
      newEndAt: newEndAt.toISOString(),
      targetRow,
    });

    onStagedItemDrop(task, newStartAt, newEndAt, targetRow);
    console.log('Drop complete');
    console.groupEnd();
  }, [onStagedItemDrop, columnWidth, zoom, rowHeight, validDropRows, sidebarWidth, headerHeight, scrollX, timelineData, range, setDropTarget]);

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
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="relative flex h-full w-full flex-col">
          {/* Staging zone slot - rendered above main chart */}
          {enableStaging && stagingZone && (
            <div style={cssVariables}>{stagingZone}</div>
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
