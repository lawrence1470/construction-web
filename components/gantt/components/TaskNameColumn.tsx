'use client';

import React from 'react';
import { format } from 'date-fns';
import { GanttTask } from '../types/gantt.types';

interface TaskNameColumnProps {
  task: GanttTask;
  progress: number;
  width: number;
  level?: number;
}

const TaskNameColumn: React.FC<TaskNameColumnProps> = ({
  task,
  progress,
  width,
  level = 0,
}) => {
  return (
    <div
      className="h-full bg-white flex flex-col justify-center overflow-hidden"
      style={{
        width: `${width}px`,
        paddingLeft: `${12 + level * 24}px`,
        paddingRight: '12px',
        paddingTop: '0',
        paddingBottom: '0'
      }}
    >
      <div className="text-sm font-semibold text-gray-800 truncate leading-snug mb-0.5">
        {task.name}
      </div>
      {task.assignee && (
        <div className="text-[11px] text-gray-500 truncate leading-none mb-0.5">
          {task.assignee}
        </div>
      )}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] text-gray-400 truncate">
          {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}
        </span>
        {progress > 0 && (
          <span className="text-[11px] font-medium text-gray-600 flex-shrink-0">
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskNameColumn;
