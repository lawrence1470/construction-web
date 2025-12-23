'use client';

// Staging zone that appears visually outside the Gantt chart but remains in the DnD context
// Contains an "Add" button and staged task chips that can be dragged into the timeline

import { cn } from '@/lib/utils';
import { GripVertical, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { Button } from '@/components/ui/button';
import type { StagedTask } from '@/store/useStagingStore';

export interface GanttStagingRowProps {
  stagedTasks: StagedTask[];
  onQuickAdd: () => void;
  isFullscreen?: boolean;
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
        zIndex: 100,
      }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      data-staged-task
      data-staged-task-id={task.id}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs',
        'border border-dashed border-blue-300 dark:border-blue-600',
        'bg-white dark:bg-blue-900/40',
        'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50',
        'shadow-sm',
        isDragging && 'opacity-50 border-blue-500 bg-blue-100 dark:bg-blue-800/50 shadow-lg',
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
      <span className="text-blue-700 dark:text-blue-300 truncate max-w-[100px] font-medium">
        {task.name}
      </span>
    </motion.div>
  );
};

export const GanttStagingRow: FC<GanttStagingRowProps> = ({
  stagedTasks,
  onQuickAdd,
  isFullscreen = false,
}) => {
  return (
    <div
      data-staging-zone
      className={cn(
        'flex items-center gap-3 px-3 py-2',
        'bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent',
        'border-b border-blue-100 dark:border-blue-900/50',
        isFullscreen && 'py-3'
      )}
    >
      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'h-7 px-3 gap-1.5',
          'border-blue-200 dark:border-blue-700',
          'text-blue-600 dark:text-blue-400',
          'hover:bg-blue-100 dark:hover:bg-blue-900/50',
          'hover:border-blue-300 dark:hover:border-blue-600',
          'flex-shrink-0'
        )}
        onClick={onQuickAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Quick Add</span>
      </Button>

      {/* Divider */}
      <div className="h-5 w-px bg-blue-200 dark:bg-blue-800 flex-shrink-0" />

      {/* Staged tasks as compact chips */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 py-0.5">
        <AnimatePresence mode="popLayout">
          {stagedTasks.map((task) => (
            <StagedTaskChip key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {/* Empty state hint */}
        {stagedTasks.length === 0 && (
          <motion.span
            className="text-xs text-blue-400 dark:text-blue-500 italic whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Click &quot;Quick Add&quot; to create tasks, then drag them to the timeline below
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default GanttStagingRow;
