'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { GanttTask, GanttGroup } from '../types/gantt.types';
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
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Calculate date range to show entire year
  const dateRange = useMemo(() => {
    const start = new Date(currentYear, 0, 1); // January 1st
    const end = new Date(currentYear, 11, 31); // December 31st
    return { start, end };
  }, [currentYear]);

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentYear(parseInt(event.target.value));
  };

  const handleToday = () => {
    setCurrentYear(new Date().getFullYear());
  };

  // Generate year options (current year +/- 5 years)
  const currentYearNow = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYearNow - 5 + i);

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

        {/* Year Selection */}
        <div className="flex items-center gap-3">
          <select
            value={currentYear}
            onChange={handleYearChange}
            className="text-lg font-semibold text-gray-800 bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            onClick={handleToday}
            className="px-3 py-1 rounded hover:bg-gray-100 transition-colors text-sm font-medium text-gray-600"
          >
            Today
          </button>
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
