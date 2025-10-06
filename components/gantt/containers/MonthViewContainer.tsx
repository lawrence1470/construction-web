'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { GanttTask, GanttGroup } from '../types/gantt.types';
import { formatDateRange } from '../utils/dateHelpers';
import MonthView from '../views/MonthView';

interface MonthViewContainerProps {
  tasks?: GanttTask[];
  groups?: GanttGroup[];
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  showWeekends?: boolean;
  showToday?: boolean;
  readOnly?: boolean;
  monthsToShow?: number; // Number of months to display in the scrollable view
}

const MonthViewContainer: React.FC<MonthViewContainerProps> = ({
  tasks = [],
  groups = [],
  onTaskClick,
  onTaskUpdate,
  showWeekends = true,
  showToday = true,
  readOnly = false,
  monthsToShow = 3, // Default to showing 3 months
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate date range to show multiple months
  const dateRange = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, Math.floor(monthsToShow / 2)));
    const end = endOfMonth(addMonths(currentDate, Math.ceil(monthsToShow / 2) - 1));
    return { start, end };
  }, [currentDate, monthsToShow]);

  const handleNavigateBack = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNavigateForward = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format date range display
  const dateRangeText = useMemo(() => {
    if (format(dateRange.start, 'yyyy') === format(dateRange.end, 'yyyy')) {
      if (format(dateRange.start, 'MM') === format(dateRange.end, 'MM')) {
        return format(dateRange.start, 'MMMM yyyy');
      }
      return `${format(dateRange.start, 'MMM')} - ${format(dateRange.end, 'MMM yyyy')}`;
    }
    return `${format(dateRange.start, 'MMM yyyy')} - ${format(dateRange.end, 'MMM yyyy')}`;
  }, [dateRange]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* View Label */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-semibold text-gray-800">Month View</span>
          <span className="text-xs text-gray-500 font-normal">
            (Scroll horizontally to view timeline)
          </span>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-gray-800">
            {dateRangeText}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNavigateBack}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              aria-label="Previous month"
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
              aria-label="Next month"
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

      {/* Month View */}
      <div className="flex-1 overflow-auto">
        <MonthView
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

export default MonthViewContainer;
