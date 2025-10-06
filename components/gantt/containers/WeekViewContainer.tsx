'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { GanttTask, GanttGroup } from '../types/gantt.types';
import { getViewDateRange, navigateForward, navigateBackward, formatDateRange } from '../utils/dateHelpers';
import WeekView from '../views/WeekView';

interface WeekViewContainerProps {
  tasks?: GanttTask[];
  groups?: GanttGroup[];
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  showWeekends?: boolean;
  showToday?: boolean;
  readOnly?: boolean;
}

const WeekViewContainer: React.FC<WeekViewContainerProps> = ({
  tasks = [],
  groups = [],
  onTaskClick,
  onTaskUpdate,
  showWeekends = true,
  showToday = true,
  readOnly = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateRange = useMemo(() => {
    return getViewDateRange(currentDate, 'week');
  }, [currentDate]);

  const handleNavigateBack = () => {
    setCurrentDate(navigateBackward(currentDate, 'week'));
  };

  const handleNavigateForward = () => {
    setCurrentDate(navigateForward(currentDate, 'week'));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* View Label */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-semibold text-gray-800">Week View</span>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-gray-800">
            {formatDateRange(dateRange.start, dateRange.end, 'week')}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNavigateBack}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
            >
              Today
            </button>
            <button
              onClick={handleNavigateForward}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Task Count */}
        <div className="text-sm text-gray-500">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Week View */}
      <div className="flex-1 overflow-auto">
        <WeekView
          tasks={tasks}
          groups={groups}
          startDate={dateRange.start}
          endDate={dateRange.end}
          onTaskClick={onTaskClick}
          onTaskUpdate={onTaskUpdate}
          showWeekends={showWeekends}
          showToday={showToday}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

export default WeekViewContainer;
