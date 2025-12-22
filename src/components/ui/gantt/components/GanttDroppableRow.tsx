'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { FC } from 'react';

export type GanttDroppableRowProps = {
  rowIndex: number;
  rowHeight: number;
  className?: string;
};

/**
 * A droppable row zone for the Gantt chart.
 * Uses dnd-kit's useDroppable hook for proper collision detection.
 * The row ID is formatted as 'droppable-row-{rowIndex}' for parsing in onDragEnd.
 */
export const GanttDroppableRow: FC<GanttDroppableRowProps> = ({
  rowIndex,
  rowHeight,
  className,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-row-${rowIndex}`,
    data: {
      type: 'row',
      rowIndex,
    },
  });

  return (
    <div
      ref={setNodeRef}
      data-droppable-row={rowIndex}
      className={cn(
        'absolute left-0 w-full transition-colors duration-150',
        isOver && 'bg-blue-50/50 dark:bg-blue-900/20',
        className
      )}
      style={{
        top: rowIndex * rowHeight,
        height: rowHeight,
      }}
    />
  );
};
