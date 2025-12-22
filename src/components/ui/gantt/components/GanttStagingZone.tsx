'use client';

// Staging zone container for the Gantt chart
// Compact staging area where tasks are created and can be dragged into the timeline
// Tasks are displayed as compact chips that can be dragged to their target location

import { cn } from '@/lib/utils';
import { GripVertical, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { Button } from '@/components/ui/button';
import type { StagedTask } from '@/store/useStagingStore';

export interface GanttStagingZoneProps {
  stagedTasks: StagedTask[];
  onQuickAdd: () => void;
}

// Compact draggable chip for staged task
const StagedTaskChip: FC<{ task: StagedTask }> = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: {
      type: 'staged',
      task,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      data-staged-task
      data-staged-task-id={task.id}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
        'border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/30',
        'hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40',
        isDragging && 'opacity-50 border-blue-500 bg-blue-100 dark:bg-blue-800/50 shadow-lg z-50',
        !isDragging && 'cursor-grab'
      )}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 flex-shrink-0 text-blue-400" />
      <span className="text-blue-700 dark:text-blue-300 truncate max-w-[120px]">
        {task.name}
      </span>
    </motion.div>
  );
};

export const GanttStagingZone: FC<GanttStagingZoneProps> = ({
  stagedTasks,
  onQuickAdd,
}) => {
  return (
    <div
      data-staging-zone
      className={cn(
        'flex items-center gap-3 px-3 border-b-2 border-dashed border-blue-200 dark:border-blue-800',
        'bg-blue-50/30 dark:bg-blue-950/20'
      )}
      style={{ height: 'var(--gantt-row-height)' }}
    >
      {/* Quick Add button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex-shrink-0"
        onClick={onQuickAdd}
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs font-medium">Quick Add</span>
      </Button>

      {/* Staged tasks as compact chips */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        <AnimatePresence mode="popLayout">
          {stagedTasks.map((task) => (
            <StagedTaskChip key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {/* Empty state hint */}
        {stagedTasks.length === 0 && (
          <motion.p
            className="text-xs text-blue-400 dark:text-blue-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Click Quick Add to create a task, then drag it to the timeline
          </motion.p>
        )}
      </div>
    </div>
  );
};
