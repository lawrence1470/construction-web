'use client';

import { cn } from '@/lib/utils';
import {
  DndContext,
  MouseSensor,
  useDraggable,
  useSensor,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useThrottledMouse } from '../hooks/useThrottledMouse';
import { addDays } from 'date-fns';
import { motion } from 'framer-motion';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FC, ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { GanttTimelineBar, GanttFeature } from '../types';
import {
  getDifferenceIn,
  getInnerDifferenceIn,
  getAddRange,
  getDateByMousePosition,
  getOffset,
  getWidth,
} from '../utils';
import { GanttContext, useGanttDragging, useGanttScrollX, useGanttDropTarget } from '../context';

// ============================================
// GanttTimelineBarDragHelper - Resize handles
// ============================================

export type GanttTimelineBarDragHelperProps = {
  timelineBarId: GanttTimelineBar['id'];
  direction: 'left' | 'right';
  date: Date | null;
};

// Backwards compatibility alias
export type GanttFeatureDragHelperProps = GanttTimelineBarDragHelperProps;

export const GanttTimelineBarDragHelper: FC<GanttTimelineBarDragHelperProps> = ({
  direction,
  timelineBarId,
  date,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `timeline-bar-drag-helper-${direction}-${timelineBarId}`,
  });

  const isPressed = Boolean(attributes['aria-pressed']);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  // Memoize date formatting
  const formattedDate = useMemo(() => {
    if (!date) return null;
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }, [date]);

  return (
    <div
      className={cn(
        'group -translate-y-1/2 !cursor-col-resize absolute top-1/2 z-[3] h-full w-6 rounded-md outline-none',
        direction === 'left' ? '-left-2.5' : '-right-2.5'
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          '-translate-y-1/2 absolute top-1/2 h-[80%] w-1 rounded-sm bg-gray-500 opacity-0 transition-all',
          direction === 'left' ? 'left-2.5' : 'right-2.5',
          direction === 'left' ? 'group-hover:left-0' : 'group-hover:right-0',
          isPressed && (direction === 'left' ? 'left-0' : 'right-0'),
          'group-hover:opacity-100',
          isPressed && 'opacity-100'
        )}
      />
      {formattedDate && (
        <div
          className={cn(
            '-translate-x-1/2 absolute top-10 hidden whitespace-nowrap rounded-lg border border-gray-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-card)] px-2 py-1 text-gray-900 dark:text-[var(--text-primary)] text-xs group-hover:block',
            isPressed && 'block'
          )}
        >
          {formattedDate}
        </div>
      )}
    </div>
  );
};

// Backwards compatibility alias for the component
export const GanttFeatureDragHelper = GanttTimelineBarDragHelper;

// ============================================
// GanttTimelineBarCard - Draggable card wrapper
// ============================================

export type GanttTimelineBarCardProps = Pick<GanttTimelineBar, 'id'> & {
  children?: ReactNode;
  popoverContent?: ReactNode;
  popoverOpen?: boolean;
  onPopoverOpenChange?: (open: boolean) => void;
};

// Backwards compatibility alias
export type GanttFeatureItemCardProps = GanttTimelineBarCardProps;

export const GanttTimelineBarCard: FC<GanttTimelineBarCardProps> = ({
  id,
  children,
  popoverContent,
  popoverOpen,
  onPopoverOpenChange,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes['aria-pressed']);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);

  // Set dragging on pointer down (before 10px threshold) to prevent add helper flash
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    setDragging(true);
    listeners?.onPointerDown?.(e as unknown as PointerEvent);
  }, [setDragging, listeners]);

  // Track if we've actually dragged (moved more than a small threshold)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerDownPos.current && !hasDragged.current) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      if (dx > 5 || dy > 5) {
        hasDragged.current = true;
      }
    }
  }, []);

  // Handle click - only open popover if we didn't drag
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!hasDragged.current && popoverContent && onPopoverOpenChange) {
      e.stopPropagation();
      onPopoverOpenChange(true);
    }
    pointerDownPos.current = null;
  }, [popoverContent, onPopoverOpenChange]);

  // Clear dragging on pointer up if drag wasn't activated
  useEffect(() => {
    const handlePointerUp = () => {
      // Only clear if not actually dragging (aria-pressed handles the drag case)
      if (!isPressed) {
        setDragging(false);
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isPressed, setDragging]);

  // Also sync with isPressed for when drag is active
  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  const cardContent = (
    <div className="gantt-card-hover-wrapper">
      <Card className={cn(
        'h-full w-full rounded-md bg-white dark:bg-[var(--bg-card)] p-2 text-xs shadow-sm',
        'transition-all duration-200 ease-out',
        'hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]',
        'active:scale-[0.98]',
        isPressed && 'bg-gray-50 dark:bg-[var(--bg-hover)]'
      )}>
        <div
          className={cn(
            'flex h-full w-full items-center justify-between gap-2 text-left',
            isPressed ? 'cursor-grabbing' : 'cursor-grab'
          )}
          {...attributes}
          {...listeners}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          ref={setNodeRef}
        >
          {children}
        </div>
      </Card>
    </div>
  );

  // If popover content is provided, wrap in Popover
  if (popoverContent) {
    return (
      <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
        <PopoverTrigger asChild>
          {cardContent}
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-auto p-0"
        >
          {popoverContent}
        </PopoverContent>
      </Popover>
    );
  }

  return cardContent;
};

// Backwards compatibility alias for the card component
export const GanttFeatureItemCard = GanttTimelineBarCard;

// ============================================
// GanttTimelineBar - Main timeline bar component
// ============================================

export type GanttTimelineBarProps = GanttTimelineBar & {
  onMove?: (id: string, startDate: Date, endDate: Date | null, targetRow?: number) => void;
  rowIndex?: number;
  visualRow?: number;
  totalRows?: number;
  groupName?: string;
  staggerIndex?: number;
  children?: ReactNode;
  className?: string;
  popoverContent?: ReactNode;
};

// Backwards compatibility alias
export type GanttFeatureItemProps = GanttTimelineBarProps;

export const GanttTimelineBarItem: FC<GanttTimelineBarProps> = ({
  onMove,
  children,
  className,
  rowIndex,
  visualRow,
  totalRows,
  groupName,
  staggerIndex = 0,
  popoverContent,
  ...feature
}) => {
  const [scrollX] = useGanttScrollX();
  const [, setDropTarget] = useGanttDropTarget();
  const [, setGlobalDragging] = useGanttDragging();
  const gantt = useContext(GanttContext);
  const [mousePosition] = useThrottledMouse<HTMLDivElement>();

  // State
  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);
  const [previousMouseX, setPreviousMouseX] = useState(0);
  const [previousMouseY, setPreviousMouseY] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(startAt);
  const [previousEndAt, setPreviousEndAt] = useState(endAt);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Memoized calculations
  const timelineStartDate = useMemo(() => {
    const timelineYear = gantt.timelineData.at(0)?.year ?? new Date().getFullYear();
    return new Date(timelineYear, 0, 1);
  }, [gantt.timelineData]);

  const width = useMemo(
    () => getWidth(startAt, endAt, gantt),
    [startAt, endAt, gantt]
  );

  const offset = useMemo(
    () => getOffset(startAt, timelineStartDate, gantt),
    [startAt, timelineStartDate, gantt]
  );

  const addRange = useMemo(
    () => getAddRange(gantt.range),
    [gantt.range]
  );

  // Visual row calculations
  const currentVisualRow = visualRow ?? rowIndex ?? 0;
  const naturalRow = rowIndex ?? 0;
  const visualRowOffset = useMemo(
    () => (currentVisualRow - naturalRow) * gantt.rowHeight,
    [currentVisualRow, naturalRow, gantt.rowHeight]
  );

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  // Find nearest valid drop row - memoized callback
  const findNearestValidRow = useCallback((targetRow: number): number => {
    if (!gantt.validDropRows || gantt.validDropRows.length === 0) {
      return targetRow;
    }
    const firstRow = gantt.validDropRows[0];
    if (firstRow === undefined) return targetRow;

    let nearestRow = firstRow;
    let minDistance = Math.abs(targetRow - nearestRow);
    for (const validRow of gantt.validDropRows) {
      const distance = Math.abs(targetRow - validRow);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRow = validRow;
      }
    }
    return nearestRow;
  }, [gantt.validDropRows]);

  // Drag handlers - memoized
  const handleItemDragStart = useCallback(() => {
    setPreviousMouseX(mousePosition.x);
    setPreviousMouseY(mousePosition.y);
    setPreviousStartAt(startAt);
    setPreviousEndAt(endAt);
    setIsDragging(true);
    setGlobalDragging(true);
  }, [mousePosition.x, mousePosition.y, startAt, endAt, setGlobalDragging]);

  const handleItemDragMove = useCallback(() => {
    const currentDate = getDateByMousePosition(gantt, mousePosition.x);
    const originalDate = getDateByMousePosition(gantt, previousMouseX);
    const delta =
      gantt.range === 'daily'
        ? getDifferenceIn(gantt.range)(currentDate, originalDate)
        : getInnerDifferenceIn(gantt.range)(currentDate, originalDate);
    const newStartDate = addDays(previousStartAt, delta);
    const newEndDate = previousEndAt ? addDays(previousEndAt, delta) : null;

    // Track vertical movement
    const yDelta = mousePosition.y - previousMouseY;
    setVerticalOffset(yDelta);

    // Calculate target row and snap to nearest valid row
    const rowHeight = gantt.rowHeight;
    const rowsMoved = Math.round(yDelta / rowHeight);
    const rawTargetRow = currentVisualRow + rowsMoved;
    const targetRow = findNearestValidRow(rawTargetRow);
    const newWidth = getWidth(newStartDate, newEndDate, gantt);
    const newOffset = getOffset(newStartDate, timelineStartDate, gantt);
    setDropTarget({ rowIndex: targetRow, width: newWidth, offset: newOffset });

    setStartAt(newStartDate);
    setEndAt(newEndDate);
  }, [
    gantt,
    mousePosition.x,
    mousePosition.y,
    previousMouseX,
    previousMouseY,
    previousStartAt,
    previousEndAt,
    currentVisualRow,
    findNearestValidRow,
    timelineStartDate,
    setDropTarget,
  ]);

  const onDragEnd = useCallback(() => {
    const rowHeight = gantt.rowHeight;
    const rowsMoved = Math.round(verticalOffset / rowHeight);
    const rawTargetRow = currentVisualRow + rowsMoved;
    const targetRow = findNearestValidRow(rawTargetRow);

    setVerticalOffset(0);
    setIsDragging(false);
    setGlobalDragging(false);
    setDropTarget(null);

    onMove?.(feature.id, startAt, endAt, targetRow);
  }, [
    gantt.rowHeight,
    verticalOffset,
    currentVisualRow,
    findNearestValidRow,
    setDropTarget,
    setGlobalDragging,
    onMove,
    feature.id,
    startAt,
    endAt,
  ]);

  const handleLeftDragMove = useCallback(() => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newStartAt = getDateByMousePosition(gantt, x);
    setStartAt(newStartAt);
  }, [gantt, mousePosition.x, scrollX]);

  const handleRightDragMove = useCallback(() => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newEndAt = getDateByMousePosition(gantt, x);
    setEndAt(newEndAt);
  }, [gantt, mousePosition.x, scrollX]);

  // Total vertical offset = base visual offset + current drag offset
  const totalVerticalOffset = visualRowOffset + (isDragging ? verticalOffset : 0);

  // Memoize the fallback end date for right drag helper
  const rightDragHelperDate = useMemo(
    () => endAt ?? addRange(startAt, 2),
    [endAt, addRange, startAt]
  );

  return (
    <div
      data-feature-item
      data-feature-id={feature.id}
      data-feature-row={rowIndex}
      className={cn('relative flex w-max min-w-full py-0.5', className)}
      style={{ height: 'var(--gantt-row-height)' }}
    >
      <DndContext
        id={`dnd-unified-${feature.id}`}
        sensors={[mouseSensor]}
        onDragStart={(event) => {
          const activeId = String(event.active.id);
          // Only trigger item drag start for card drags, not resize handles
          if (activeId === feature.id) {
            handleItemDragStart();
          }
        }}
        onDragMove={(event) => {
          const activeId = String(event.active.id);
          if (activeId === `timeline-bar-drag-helper-left-${feature.id}`) {
            handleLeftDragMove();
          } else if (activeId === `timeline-bar-drag-helper-right-${feature.id}`) {
            handleRightDragMove();
          } else if (activeId === feature.id) {
            handleItemDragMove();
          }
        }}
        onDragEnd={onDragEnd}
      >
        <motion.div
          className="pointer-events-auto absolute top-0.5"
          style={{
            height: 'calc(var(--gantt-row-height) - 4px)',
            width: Math.round(width),
            left: Math.round(offset),
            zIndex: isDragging ? 50 : 1,
          }}
          initial={false}
          animate={{
            y: totalVerticalOffset,
            scale: isDragging ? 1.02 : 1,
          }}
          transition={{
            y: { duration: isDragging ? 0 : 0.2, ease: 'easeOut' },
            scale: { type: 'spring', stiffness: 300, damping: 25 }
          }}
        >
          {onMove && (
            <GanttTimelineBarDragHelper
              direction="left"
              timelineBarId={feature.id}
              date={startAt}
            />
          )}
          <GanttTimelineBarCard
            id={feature.id}
            popoverContent={popoverContent}
            popoverOpen={popoverOpen}
            onPopoverOpenChange={setPopoverOpen}
          >
            {children ?? (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttTimelineBarCard>
          {onMove && (
            <GanttTimelineBarDragHelper
              direction="right"
              timelineBarId={feature.id}
              date={rightDragHelperDate}
            />
          )}
        </motion.div>
      </DndContext>
    </div>
  );
};

// Backwards compatibility alias for the main component
export const GanttFeatureItem = GanttTimelineBarItem;
