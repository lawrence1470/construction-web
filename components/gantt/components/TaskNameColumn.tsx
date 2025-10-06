'use client';

import React from 'react';
import { format } from 'date-fns';
import { GanttTask } from '../types/gantt.types';

interface TaskNameColumnProps {
  task: GanttTask;
  progress: number;
  width: number;
}

const TaskNameColumn: React.FC<TaskNameColumnProps> = ({
  task,
  progress,
  width,
}) => {
  return (
    <div
      className="p-3 bg-white"
      style={{
        width: `${width}px`
      }}
    >
      <div className="text-sm font-medium text-gray-800 truncate">
        {task.name}
      </div>
      {task.assignee && (
        <div className="text-xs text-gray-500 truncate mt-1">
          {task.assignee}
        </div>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-400">
          {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}
        </span>
        {progress > 0 && (
          <span className="text-xs font-medium text-gray-600">
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskNameColumn;
