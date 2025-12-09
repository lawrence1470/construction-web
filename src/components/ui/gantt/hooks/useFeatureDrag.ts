'use client';

import { useCallback, useState, useMemo } from 'react';
import { MouseSensor, useSensor } from '@dnd-kit/core';
import { useMouse } from '@uidotdev/usehooks';
import { addDays } from 'date-fns';
import type { GanttContextProps } from '../types';
import { getDifferenceIn, getInnerDifferenceIn, getDateByMousePosition, getAddRange } from '../utils';

export type UseFeatureDragOptions = {
  featureId: string;
  initialStartAt: Date;
  initialEndAt: Date | null;
  ganttContext: GanttContextProps;
  rowIndex?: number;
  visualRow?: number;
  validDropRows?: number[];
  onMove?: (id: string, startDate: Date, endDate: Date | null, targetRow?: number) => void;
};

export type UseFeatureDragReturn = {
  startAt: Date;
  endAt: Date | null;
  isDragging: boolean;
  verticalOffset: number;
  currentVisualRow: number;
  mouseSensor: ReturnType<typeof useSensor>;
  handleItemDragStart: () => void;
  handleItemDragMove: () => void;
  handleLeftDragMove: (scrollX: number) => void;
  handleRightDragMove: (scrollX: number) => void;
  onDragEnd: () => void;
  setDropTarget: (target: { rowIndex: number; width: number; offset: number } | null) => void;
};

export const useFeatureDrag = ({
  featureId,
  initialStartAt,
  initialEndAt,
  ganttContext,
  rowIndex = 0,
  visualRow,
  validDropRows,
  onMove,
}: UseFeatureDragOptions) => {
  const [mousePosition] = useMouse<HTMLDivElement>();
  const [startAt, setStartAt] = useState<Date>(initialStartAt);
  const [endAt, setEndAt] = useState<Date | null>(initialEndAt);
  const [previousMouseX, setPreviousMouseX] = useState(0);
  const [previousMouseY, setPreviousMouseY] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(initialStartAt);
  const [previousEndAt, setPreviousEndAt] = useState(initialEndAt);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ rowIndex: number; width: number; offset: number } | null>(null);

  const currentVisualRow = visualRow ?? rowIndex;
  const addRange = useMemo(() => getAddRange(ganttContext.range), [ganttContext.range]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const findNearestValidRow = useCallback((targetRow: number): number => {
    if (!validDropRows || validDropRows.length === 0) {
      return targetRow;
    }
    const firstRow = validDropRows[0];
    if (firstRow === undefined) return targetRow;

    let nearestRow = firstRow;
    let minDistance = Math.abs(targetRow - nearestRow);
    for (const validRow of validDropRows) {
      const distance = Math.abs(targetRow - validRow);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRow = validRow;
      }
    }
    return nearestRow;
  }, [validDropRows]);

  const handleItemDragStart = useCallback(() => {
    setPreviousMouseX(mousePosition.x);
    setPreviousMouseY(mousePosition.y);
    setPreviousStartAt(startAt);
    setPreviousEndAt(endAt);
    setIsDragging(true);
  }, [mousePosition.x, mousePosition.y, startAt, endAt]);

  const handleItemDragMove = useCallback(() => {
    const currentDate = getDateByMousePosition(ganttContext, mousePosition.x);
    const originalDate = getDateByMousePosition(ganttContext, previousMouseX);
    const delta =
      ganttContext.range === 'daily'
        ? getDifferenceIn(ganttContext.range)(currentDate, originalDate)
        : getInnerDifferenceIn(ganttContext.range)(currentDate, originalDate);
    const newStartDate = addDays(previousStartAt, delta);
    const newEndDate = previousEndAt ? addDays(previousEndAt, delta) : null;

    const yDelta = mousePosition.y - previousMouseY;
    setVerticalOffset(yDelta);

    const rowHeight = ganttContext.rowHeight;
    const rowsMoved = Math.round(yDelta / rowHeight);
    const rawTargetRow = currentVisualRow + rowsMoved;
    const targetRow = findNearestValidRow(rawTargetRow);

    setStartAt(newStartDate);
    setEndAt(newEndDate);
  }, [
    ganttContext,
    mousePosition.x,
    mousePosition.y,
    previousMouseX,
    previousMouseY,
    previousStartAt,
    previousEndAt,
    currentVisualRow,
    findNearestValidRow,
  ]);

  const handleLeftDragMove = useCallback((scrollX: number) => {
    const ganttRect = ganttContext.ref?.current?.getBoundingClientRect();
    const x = mousePosition.x - (ganttRect?.left ?? 0) + scrollX - ganttContext.sidebarWidth;
    const newStartAt = getDateByMousePosition(ganttContext, x);
    setStartAt(newStartAt);
  }, [ganttContext, mousePosition.x]);

  const handleRightDragMove = useCallback((scrollX: number) => {
    const ganttRect = ganttContext.ref?.current?.getBoundingClientRect();
    const x = mousePosition.x - (ganttRect?.left ?? 0) + scrollX - ganttContext.sidebarWidth;
    const newEndAt = getDateByMousePosition(ganttContext, x);
    setEndAt(newEndAt);
  }, [ganttContext, mousePosition.x]);

  const onDragEnd = useCallback(() => {
    const rowHeight = ganttContext.rowHeight;
    const rowsMoved = Math.round(verticalOffset / rowHeight);
    const rawTargetRow = currentVisualRow + rowsMoved;
    const targetRow = findNearestValidRow(rawTargetRow);

    setVerticalOffset(0);
    setIsDragging(false);
    setDropTarget(null);

    onMove?.(featureId, startAt, endAt, targetRow);
  }, [
    ganttContext.rowHeight,
    verticalOffset,
    currentVisualRow,
    findNearestValidRow,
    onMove,
    featureId,
    startAt,
    endAt,
  ]);

  return {
    startAt,
    endAt,
    isDragging,
    verticalOffset,
    currentVisualRow,
    mouseSensor,
    handleItemDragStart,
    handleItemDragMove,
    handleLeftDragMove,
    handleRightDragMove,
    onDragEnd,
    setDropTarget,
    addRange,
  };
};
