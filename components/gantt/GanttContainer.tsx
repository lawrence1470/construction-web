'use client';

import React, { useState } from 'react';
import { ViewType, GanttContainerProps } from './types/gantt.types';
import WeekViewContainer from './containers/WeekViewContainer';
import MonthViewContainer from './containers/MonthViewContainer';

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
      default:
        return <MonthViewContainer {...viewProps} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Container */}
      <div className="flex-1">
        {renderView()}
      </div>
    </div>
  );
};

export default GanttContainer;