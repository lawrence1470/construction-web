'use client';

// Sidebar staging zone for quick task creation
// Tasks can be added here and then dragged horizontally to the timeline

import { cn } from '@/lib/utils';
import { GripVertical, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { Button } from '@/components/ui/button';
import type { StagedTask } from '@/store/useStagingStore';

export interface GanttSidebarStagingZoneProps {
  stagedTasks: StagedTask[];
  onQuickAdd: () => void;
  isFullscreen?: boolean;
}

// Compact draggable chip for staged task in sidebar
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
        'flex items-center gap-1 px-2 py-0.5 rounded text-xs',
        'border border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/30',
        'hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40',
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
      <span className="text-blue-700 dark:text-blue-300 truncate max-w-[80px]">
        {task.name}
      </span>
    </motion.div>
  );
};

export const GanttSidebarStagingZone: FC<GanttSidebarStagingZoneProps> = ({
  stagedTasks,
  onQuickAdd,
  isFullscreen = false,
}) => {
  return (
    <div
      data-staging-zone
      className={cn(
        'flex flex-col gap-1 px-2 py-2 border-b-2 border-dashed border-blue-200 dark:border-blue-800',
        'bg-blue-50/50 dark:bg-blue-950/30'
      )}
    >
      {/* Quick Add button and label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Staging
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 gap-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          onClick={onQuickAdd}
        >
          <Plus className="h-3 w-3" />
          <span className="text-xs">Add</span>
        </Button>
      </div>

      {/* Staged tasks as compact chips */}
      <div className="flex flex-wrap gap-1 min-h-[24px]">
        <AnimatePresence mode="popLayout">
          {stagedTasks.map((task) => (
            <StagedTaskChip key={task.id} task={task} />
          ))}
        </AnimatePresence>

        {/* Empty state hint */}
        {stagedTasks.length === 0 && (
          <motion.p
            className="text-xs text-blue-400 dark:text-blue-500 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Click Add, then drag to timeline →
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default GanttSidebarStagingZone;
