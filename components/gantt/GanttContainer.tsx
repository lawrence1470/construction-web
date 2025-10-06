'use client';

import React, { useState } from 'react';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { ViewType, GanttContainerProps } from './types/gantt.types';
import WeekViewContainer from './containers/WeekViewContainer';
import MonthViewContainer from './containers/MonthViewContainer';
import YearViewContainer from './containers/YearViewContainer';

const GanttContainer: React.FC<GanttContainerProps> = ({
  tasks = [],
  groups = [],
  currentView: initialView = 'month',
  onTaskClick,
  onTaskUpdate,
  onViewChange,
  showWeekends = true,
  showToday = true,
  readOnly = false,
}) => {
  const [currentView, setCurrentView] = useState<ViewType>(initialView);

  // Handle view change
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    onViewChange?.(view);
  };

  // Render the appropriate view container
  const renderView = () => {
    const viewProps = {
      tasks,
      groups,
      onTaskClick,
      onTaskUpdate,
      showWeekends,
      showToday,
      readOnly,
    };

    switch (currentView) {
      case 'week':
        return <WeekViewContainer {...viewProps} />;
      case 'month':
        return <MonthViewContainer {...viewProps} />;
      case 'year':
        return <YearViewContainer {...viewProps} />;
      default:
        return <MonthViewContainer {...viewProps} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Selector */}
      <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
        <button
          onClick={() => handleViewChange('week')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            currentView === 'week'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Week
        </button>
        <button
          onClick={() => handleViewChange('month')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            currentView === 'month'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Month
        </button>
        <button
          onClick={() => handleViewChange('year')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            currentView === 'year'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          Year
        </button>
      </div>

      {/* View Container */}
      <div className="flex-1">
        {renderView()}
      </div>
    </div>
  );
};

export default GanttContainer;