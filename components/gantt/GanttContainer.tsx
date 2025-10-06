'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { ViewType, GanttContainerProps } from './types/gantt.types';
import { getViewDateRange, navigateForward, navigateBackward, formatDateRange } from './utils/dateHelpers';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import YearView from './views/YearView';

const GanttContainer: React.FC<GanttContainerProps> = ({
  tasks = [],
  groups = [],
  startDate: initialStartDate,
  endDate: initialEndDate,
  currentView: initialView = 'month',
  onTaskClick,
  onTaskUpdate,
  onViewChange,
  showWeekends = true,
  showToday = true,
  readOnly = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<ViewType>(initialView);

  // Calculate the date range based on the current view
  const dateRange = useMemo(() => {
    if (initialStartDate && initialEndDate) {
      return { start: initialStartDate, end: initialEndDate };
    }
    return getViewDateRange(currentDate, currentView);
  }, [currentDate, currentView, initialStartDate, initialEndDate]);

  // Handle view change
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    onViewChange?.(view);
  };

  // Handle navigation
  const handleNavigateBack = () => {
    setCurrentDate(navigateBackward(currentDate, currentView));
  };

  const handleNavigateForward = () => {
    setCurrentDate(navigateForward(currentDate, currentView));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Render the appropriate view
  const renderView = () => {
    const viewProps = {
      tasks,
      groups,
      startDate: dateRange.start,
      endDate: dateRange.end,
      onTaskClick,
      onTaskUpdate,
      showWeekends,
      showToday,
      readOnly,
    };

    switch (currentView) {
      case 'week':
        return <WeekView {...viewProps} />;
      case 'month':
        return <MonthView {...viewProps} />;
      case 'year':
        return <YearView {...viewProps} />;
      default:
        return <MonthView {...viewProps} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* View Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewChange('week')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'week'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Week
          </button>
          <button
            onClick={() => handleViewChange('month')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'month'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => handleViewChange('year')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'year'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            Year
          </button>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          {/* Current Period Display */}
          <div className="text-lg font-semibold text-gray-800">
            {formatDateRange(dateRange.start, dateRange.end, currentView)}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleNavigateBack}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              aria-label="Previous period"
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
              aria-label="Next period"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Gantt Chart View */}
      <div className="flex-1 overflow-auto">
        {renderView()}
      </div>
    </div>
  );
};

export default GanttContainer;