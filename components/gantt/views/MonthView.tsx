'use client';

import React, { useRef, useEffect } from 'react';
import { format, startOfDay, differenceInDays } from 'date-fns';
import { ViewProps } from '../types/gantt.types';
import {
  getMonthGroupedHeaders,
  isTaskInView,
  getTaskColor,
  calculateProgress,
  type MonthGroup,
} from '../utils/dateHelpers';
import TaskNameColumn from '../components/TaskNameColumn';
import { GANTT_LAYOUT } from '../constants/layout';

const {
  DAY_WIDTH,
  TASK_NAME_WIDTH,
  TASK_ROW_HEIGHT,
  GROUP_HEADER_HEIGHT,
  HEADER_HEIGHT,
  MONTH_HEADER_HEIGHT,
  DAY_HEADER_HEIGHT,
} = GANTT_LAYOUT;

const MonthView: React.FC<ViewProps> = ({
  tasks,
  groups,
  startDate,
  endDate,
  onTaskClick,
  onTaskUpdate,
  showWeekends,
  showToday,
  readOnly,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get month-grouped headers for multi-month display
  const monthGroups = getMonthGroupedHeaders(startDate, endDate);

  // Flatten all days and filter weekends if needed
  const allDays = monthGroups.flatMap(group => group.days);
  const filteredDays = showWeekends
    ? allDays
    : allDays.filter(d => !d.isWeekend);

  // Get all tasks (from groups or direct tasks)
  const allTasks = groups && groups.length > 0
    ? groups.flatMap(group => group.tasks)
    : tasks;

  // Filter tasks that are visible in the current view
  const visibleTasks = allTasks.filter(task =>
    isTaskInView(task.startDate, task.endDate, startDate, endDate)
  );

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current && showToday) {
      const todayIndex = filteredDays.findIndex(d => d.isToday);
      if (todayIndex !== -1) {
        const scrollPosition = todayIndex * DAY_WIDTH - TASK_NAME_WIDTH;
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, []);

  const taskListRef = useRef<HTMLDivElement>(null);

  // Sync scroll between task names and timeline
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const taskList = taskListRef.current;

    if (!scrollContainer || !taskList) return;

    const handleScroll = () => {
      taskList.scrollTop = scrollContainer.scrollTop;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Fixed Left Column for Task Names */}
      <div
        ref={taskListRef}
        className="flex-shrink-0 border-r border-gray-200 bg-white overflow-y-hidden overflow-x-hidden z-30"
        style={{ width: `${TASK_NAME_WIDTH}px` }}
      >
        {/* Task Header */}
        <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
          <div
            className="flex flex-col justify-end"
            style={{
              height: `${HEADER_HEIGHT}px`,
              paddingLeft: '12px',
              paddingRight: '12px',
              paddingBottom: '12px'
            }}
          >
            <div className="font-semibold text-sm text-gray-700">Tasks</div>
          </div>
        </div>

        {/* Task Names */}
        {groups && groups.length > 0 ? (
          groups.map(group => (
            <div key={group.id}>
              {/* Group Header */}
              <div
                className="bg-gray-50 border-b border-gray-200 flex items-center"
                style={{
                  height: `${GROUP_HEADER_HEIGHT}px`,
                  paddingLeft: '12px',
                  paddingRight: '12px'
                }}
              >
                <div className="font-semibold text-sm text-gray-700">
                  {group.name}
                </div>
              </div>
              {/* Group Tasks */}
              {group.tasks
                .filter(task => isTaskInView(task.startDate, task.endDate, startDate, endDate))
                .map(task => {
                  const progress = calculateProgress(task.startDate, task.endDate, task.progress);
                  return (
                    <div
                      key={task.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      style={{ height: `${TASK_ROW_HEIGHT}px` }}
                    >
                      <TaskNameColumn
                        task={task}
                        progress={progress}
                        width={TASK_NAME_WIDTH}
                      />
                    </div>
                  );
                })}
            </div>
          ))
        ) : (
          visibleTasks.map(task => {
            const progress = calculateProgress(task.startDate, task.endDate, task.progress);
            return (
              <div
                key={task.id}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ height: `${TASK_ROW_HEIGHT}px` }}
              >
                <TaskNameColumn
                  task={task}
                  progress={progress}
                  width={TASK_NAME_WIDTH}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Scrollable Timeline Section */}
      <div className="flex-1 overflow-auto scrollbar-hide" ref={scrollContainerRef}>
        {/* Headers - Sticky within scroll container */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          {/* Month Headers Row */}
          <div className="flex">
            {/* Month Headers */}
            <div className="flex">
              {monthGroups.map((monthGroup, monthIndex) => {
                const visibleDays = showWeekends
                  ? monthGroup.days
                  : monthGroup.days.filter(d => !d.isWeekend);

                if (visibleDays.length === 0) return null;

                return (
                  <div
                    key={monthIndex}
                    className="border-r-2 border-gray-300"
                    style={{ width: `${visibleDays.length * DAY_WIDTH}px` }}
                  >
                    <div
                      className="text-center bg-gray-50 border-b border-gray-200 flex items-center justify-center"
                      style={{
                        height: `${MONTH_HEADER_HEIGHT}px`,
                        padding: '8px'
                      }}
                    >
                      <div className="font-semibold text-sm text-gray-800">
                        {monthGroup.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Headers Row */}
          <div className="flex">
            {/* Day Headers */}
            <div className="flex">
              {filteredDays.map((day, index) => (
                <div
                  key={index}
                  className={`shrink-0 text-center border-r border-gray-200 flex flex-col items-center justify-center ${
                    day.isWeekend ? 'bg-gray-100' : 'bg-white'
                  } ${day.isToday && showToday ? 'bg-blue-50' : ''}`}
                  style={{
                    width: `${DAY_WIDTH}px`,
                    height: `${DAY_HEADER_HEIGHT}px`,
                    padding: '8px'
                  }}
                >
                  <div className="text-xs font-medium text-gray-500">
                    {format(day.date, 'EEE')[0]}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      day.isToday && showToday ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {day.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows and Timeline */}
        {groups && groups.length > 0 ? (
          // Render with groups
          groups.map(group => (
            <div key={group.id} className="border-b border-gray-200">
              {/* Group Header */}
              <div className="flex bg-gray-50">
                {/* Group Timeline */}
                <div className="flex relative z-10" style={{ height: `${GROUP_HEADER_HEIGHT}px` }}>
                  {filteredDays.map((day, index) => (
                    <div
                      key={index}
                      className={`shrink-0 border-r border-gray-200 ${
                        day.isWeekend ? 'bg-gray-100' : 'bg-gray-50'
                      } ${day.isToday && showToday ? 'bg-blue-50' : ''}`}
                      style={{ width: `${DAY_WIDTH}px` }}
                    />
                  ))}
                </div>
              </div>

              {/* Group Tasks */}
              {group.tasks
                .filter(task => isTaskInView(task.startDate, task.endDate, startDate, endDate))
                .map(task => renderTaskRow(task))}
            </div>
          ))
        ) : (
          // Render without groups
          visibleTasks.map(task => renderTaskRow(task))
        )}

        {/* Empty state */}
        {visibleTasks.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No tasks in this period
          </div>
        )}
      </div>
    </div>
  );

  function renderTaskRow(task: any) {
    const progress = calculateProgress(task.startDate, task.endDate, task.progress);
    const color = getTaskColor(progress, task.endDate, task.color);

    // Calculate position based on fixed-width days
    const taskStartDay = startOfDay(task.startDate);
    const taskEndDay = startOfDay(task.endDate);
    const viewStartDay = startOfDay(startDate);

    // Find which columns the task occupies
    let startColumn = -1;
    let endColumn = -1;

    filteredDays.forEach((day, index) => {
      const dayDate = startOfDay(day.date);
      if (taskStartDay <= dayDate && startColumn === -1) {
        startColumn = index;
      }
      if (taskEndDay >= dayDate) {
        endColumn = index;
      }
    });

    // If task doesn't overlap with any displayed days, don't render
    if (startColumn === -1 || endColumn === -1) {
      return null;
    }

    const columnSpan = endColumn - startColumn + 1;

    // Calculate fixed-width positioning (perfect pixel alignment)
    const leftPosition = startColumn * DAY_WIDTH;
    const barWidth = columnSpan * DAY_WIDTH;

    return (
      <div key={task.id} className="hover:bg-gray-50 transition-colors" style={{ height: `${TASK_ROW_HEIGHT}px` }}>
        {/* Task Timeline */}
        <div
          className="relative z-10"
          style={{
            height: `${TASK_ROW_HEIGHT}px`,
            width: `${filteredDays.length * DAY_WIDTH}px`,
            isolation: 'isolate'
          }}
        >
          {/* Timeline background with day grid */}
          <div className="absolute inset-0 flex z-0">
            {filteredDays.map((day, index) => (
              <div
                key={index}
                className={`shrink-0 border-r border-gray-200 ${
                  day.isWeekend ? 'bg-gray-50' : 'bg-white'
                } ${day.isToday && showToday ? 'bg-blue-50' : ''}`}
                style={{ width: `${DAY_WIDTH}px` }}
              />
            ))}
          </div>

          {/* Task bar - perfectly aligned with day columns */}
          <div
            className="absolute top-3 h-8 rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] flex items-center overflow-hidden z-10"
            style={{
              left: `${leftPosition}px`,
              width: `${barWidth}px`,
              backgroundColor: color,
              opacity: 0.9,
            }}
            onClick={() => onTaskClick?.(task)}
            title={`${task.name}\n${format(task.startDate, 'MMM d')} - ${format(task.endDate, 'MMM d')}\nProgress: ${progress}%`}
          >
            {/* Progress bar */}
            {progress > 0 && progress < 100 && (
              <div
                className="absolute inset-y-0 left-0 bg-black bg-opacity-20"
                style={{ width: `${progress}%` }}
              />
            )}

            {/* Task name (only show if bar is wide enough) */}
            {barWidth >= 60 && (
              <span className="px-2 text-xs text-white font-medium truncate relative z-10">
                {task.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
};

export default MonthView;