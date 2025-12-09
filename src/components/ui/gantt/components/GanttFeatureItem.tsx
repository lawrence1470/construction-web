'use client';

import { cn } from '@/lib/utils';
import {
  DndContext,
  MouseSensor,
  useDraggable,
  useSensor,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useMouse } from '@uidotdev/usehooks';
import { addDays } from 'date-fns';
import { motion } from 'framer-motion';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FC, ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import type { GanttFeature } from '../types';
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
// GanttFeatureDragHelper - Resize handles
// ============================================

export type GanttFeatureDragHelperProps = {
  featureId: GanttFeature['id'];
  direction: 'left' | 'right';
  date: Date | null;
};

export const GanttFeatureDragHelper: FC<GanttFeatureDragHelperProps> = ({
  direction,
  featureId,
  date,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `feature-drag-helper-${featureId}`,
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

// ============================================
// GanttFeatureItemCard - Draggable card wrapper
// ============================================

export type GanttFeatureItemCardProps = Pick<GanttFeature, 'id'> & {
  children?: ReactNode;
};

export const GanttFeatureItemCard: FC<GanttFeatureItemCardProps> = ({
  id,
  children,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes['aria-pressed']);

  // Set dragging on pointer down (before 10px threshold) to prevent add helper flash
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    listeners?.onPointerDown?.(e as unknown as PointerEvent);
  }, [setDragging, listeners]);

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

  return (
    <motion.div
      whileHover={{
        scale: 1.02,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={cn(
        'h-full w-full rounded-md bg-white dark:bg-[var(--bg-card)] p-2 text-xs shadow-sm transition-colors',
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
          ref={setNodeRef}
        >
          {children}
        </div>
      </Card>
    </motion.div>
  );
};

// ============================================
// GanttFeatureItem - Main feature item component
// ============================================

export type GanttFeatureItemProps = GanttFeature & {
  onMove?: (id: string, startDate: Date, endDate: Date | null, targetRow?: number) => void;
  rowIndex?: number;
  visualRow?: number;
  totalRows?: number;
  groupName?: string;
  staggerIndex?: number;
  children?: ReactNode;
  className?: string;
};

export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({
  onMove,
  children,
  className,
  rowIndex,
  visualRow,
  totalRows,
  groupName,
  staggerIndex = 0,
  ...feature
}) => {
  const [scrollX] = useGanttScrollX();
  const [, setDropTarget] = useGanttDropTarget();
  const [, setGlobalDragging] = useGanttDragging();
  const gantt = useContext(GanttContext);
  const [mousePosition] = useMouse<HTMLDivElement>();

  // State
  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);
  const [previousMouseX, setPreviousMouseX] = useState(0);
  const [previousMouseY, setPreviousMouseY] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(startAt);
  const [previousEndAt, setPreviousEndAt] = useState(endAt);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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
      className={cn('relative flex w-max min-w-full py-0.5', className)}
      style={{ height: 'var(--gantt-row-height)' }}
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
          <DndContext
            id={`dnd-left-${feature.id}`}
            sensors={[mouseSensor]}
            modifiers={[restrictToHorizontalAxis]}
            onDragMove={handleLeftDragMove}
            onDragEnd={onDragEnd}
          >
            <GanttFeatureDragHelper
              direction="left"
              featureId={feature.id}
              date={startAt}
            />
          </DndContext>
        )}
        <DndContext
          id={`dnd-item-${feature.id}`}
          sensors={[mouseSensor]}
          onDragStart={handleItemDragStart}
          onDragMove={handleItemDragMove}
          onDragEnd={onDragEnd}
        >
          <GanttFeatureItemCard id={feature.id}>
            {children ?? (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttFeatureItemCard>
        </DndContext>
        {onMove && (
          <DndContext
            id={`dnd-right-${feature.id}`}
            sensors={[mouseSensor]}
            modifiers={[restrictToHorizontalAxis]}
            onDragMove={handleRightDragMove}
            onDragEnd={onDragEnd}
          >
            <GanttFeatureDragHelper
              direction="right"
              featureId={feature.id}
              date={rightDragHelperDate}
            />
          </DndContext>
        )}
      </motion.div>
    </div>
  );
};
