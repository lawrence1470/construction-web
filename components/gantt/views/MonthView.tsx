'use client';

import React from 'react';
import { format, isSameMonth } from 'date-fns';
import { ViewProps } from '../types/gantt.types';
import {
  getMonthHeaders,
  calculateTaskPosition,
  isTaskInView,
  getTaskColor,
  calculateProgress,
  getWeeksInMonth,
} from '../utils/dateHelpers';

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
  const headers = getMonthHeaders(startDate, endDate);
  const weeks = getWeeksInMonth(startDate);

  // Filter headers if not showing weekends
  const filteredHeaders = showWeekends
    ? headers
    : headers.filter(h => !h.isWeekend);

  // Get all tasks (from groups or direct tasks)
  const allTasks = groups && groups.length > 0
    ? groups.flatMap(group => group.tasks)
    : tasks;

  // Filter tasks that are visible in the current view
  const visibleTasks = allTasks.filter(task =>
    isTaskInView(task.startDate, task.endDate, startDate, endDate)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Month and Week Headers */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* Month Header */}
        <div className="flex">
          <div className="w-64 shrink-0 p-3 border-r border-gray-200 bg-gray-50">
            <div className="font-semibold text-sm text-gray-700">Tasks</div>
          </div>
          <div className="flex-1 p-2 text-center bg-gray-50">
            <div className="font-semibold text-lg text-gray-800">
              {format(startDate, 'MMMM yyyy')}
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="flex">
          <div className="w-64 shrink-0 border-r border-gray-200" />
          <div className="flex-1 flex">
            {filteredHeaders.map((header, index) => {
              const isInMonth = isSameMonth(header.date, startDate);
              return (
                <div
                  key={index}
                  className={`flex-1 p-2 text-center border-r border-gray-200 ${
                    header.isWeekend ? 'bg-gray-100' : 'bg-white'
                  } ${header.isToday && showToday ? 'bg-blue-50' : ''} ${
                    !isInMonth ? 'opacity-50' : ''
                  }`}
                  style={{ minWidth: '30px' }}
                >
                  <div className="text-xs font-medium text-gray-500">
                    {format(header.date, 'EEE')[0]}
                  </div>
                  <div className={`text-xs font-semibold ${
                    header.isToday && showToday ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {header.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Rows and Timeline */}
      <div className="flex-1 overflow-y-auto">
        {groups && groups.length > 0 ? (
          // Render with groups
          groups.map(group => (
            <div key={group.id} className="border-b border-gray-200">
              {/* Group Header */}
              <div className="flex bg-gray-50">
                <div className="w-64 shrink-0 p-3 border-r border-gray-200">
                  <div className="font-semibold text-sm text-gray-700">
                    {group.name}
                  </div>
                </div>
                <div className="flex-1 relative h-10">
                  {/* Group timeline background */}
                  <div className="absolute inset-0 flex">
                    {filteredHeaders.map((header, index) => {
                      const isInMonth = isSameMonth(header.date, startDate);
                      return (
                        <div
                          key={index}
                          className={`flex-1 border-r border-gray-200 ${
                            header.isWeekend ? 'bg-gray-100' : 'bg-gray-50'
                          } ${header.isToday && showToday ? 'bg-blue-50' : ''} ${
                            !isInMonth ? 'opacity-50' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
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
            No tasks in this month
          </div>
        )}
      </div>
    </div>
  );

  function renderTaskRow(task: any) {
    const position = calculateTaskPosition(
      task.startDate,
      task.endDate,
      startDate,
      endDate,
      'month'
    );

    const progress = calculateProgress(task.startDate, task.endDate, task.progress);
    const color = getTaskColor(progress, task.endDate, task.color);

    return (
      <div key={task.id} className="flex hover:bg-gray-50 transition-colors">
        {/* Task Name */}
        <div className="w-64 shrink-0 p-3 border-r border-gray-200">
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

        {/* Task Bar */}
        <div className="flex-1 relative h-14">
          {/* Timeline background */}
          <div className="absolute inset-0 flex">
            {filteredHeaders.map((header, index) => {
              const isInMonth = isSameMonth(header.date, startDate);
              return (
                <div
                  key={index}
                  className={`flex-1 border-r border-gray-200 ${
                    header.isWeekend ? 'bg-gray-50' : 'bg-white'
                  } ${header.isToday && showToday ? 'bg-blue-50' : ''} ${
                    !isInMonth ? 'bg-gray-50 opacity-30' : ''
                  }`}
                />
              );
            })}
          </div>

          {/* Task bar */}
          {position.isVisible && (
            <div
              className="absolute top-3 h-8 rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] flex items-center overflow-hidden"
              style={{
                left: position.left,
                width: position.width,
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
              <span className="px-2 text-xs text-white font-medium truncate relative z-10">
                {task.name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default MonthView;