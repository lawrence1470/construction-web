'use client';

import React from 'react';
import { GanttContainerProps } from './types/gantt.types';
import MonthViewContainer from './containers/MonthViewContainer';

const GanttContainer: React.FC<GanttContainerProps> = ({
  tasks = [],
  groups = [],
  onTaskClick,
  onTaskUpdate,
  showWeekends = true,
  showToday = true,
  readOnly = false,
}) => {
  return (
    <div className="flex flex-col h-full">
      <MonthViewContainer
        tasks={tasks}
        groups={groups}
        onTaskClick={onTaskClick}
        onTaskUpdate={onTaskUpdate}
        showWeekends={showWeekends}
        showToday={showToday}
        readOnly={readOnly}
      />
    </div>
  );
};

export default GanttContainer;