'use client';

import React from 'react';
import { format, getMonth } from 'date-fns';
import { ViewProps } from '../types/gantt.types';
import {
  getYearHeaders,
  calculateTaskPosition,
  isTaskInView,
  getTaskColor,
  calculateProgress,
} from '../utils/dateHelpers';

const YearView: React.FC<ViewProps> = ({
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
  const headers = getYearHeaders(startDate, endDate);

  // Get all tasks (from groups or direct tasks)
  const allTasks = groups && groups.length > 0
    ? groups.flatMap(group => group.tasks)
    : tasks;

  // Filter tasks that are visible in the current view
  const visibleTasks = allTasks.filter(task =>
    isTaskInView(task.startDate, task.endDate, startDate, endDate)
  );

  // Group headers by quarters for better visualization
  const quarters = [
    { label: 'Q1', months: [0, 1, 2] },
    { label: 'Q2', months: [3, 4, 5] },
    { label: 'Q3', months: [6, 7, 8] },
    { label: 'Q4', months: [9, 10, 11] },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Year and Month Headers */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* Year Header */}
        <div className="flex">
          <div className="w-64 shrink-0 p-3 border-r border-gray-200 bg-gray-50">
            <div className="font-semibold text-sm text-gray-700">Tasks</div>
          </div>
          <div className="flex-1 p-2 text-center bg-gray-50">
            <div className="font-semibold text-lg text-gray-800">
              {format(startDate, 'yyyy')}
            </div>
          </div>
        </div>

        {/* Quarter Headers */}
        <div className="flex">
          <div className="w-64 shrink-0 border-r border-gray-200" />
          <div className="flex-1 flex">
            {quarters.map((quarter, qIndex) => {
              const quarterMonths = headers.filter(h =>
                quarter.months.includes(getMonth(h.date))
              );
              return quarterMonths.length > 0 ? (
                <div
                  key={qIndex}
                  className="flex-1 flex flex-col border-r border-gray-200"
                >
                  <div className="p-1 text-center bg-gray-100 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-600">
                      {quarter.label}
                    </span>
                  </div>
                  <div className="flex">
                    {quarterMonths.map((header, index) => (
                      <div
                        key={`${qIndex}-${index}`}
                        className={`flex-1 p-2 text-center border-r border-gray-200 ${
                          header.isToday && showToday ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className={`text-xs font-semibold ${
                          header.isToday && showToday ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          {header.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
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
                  <div className="text-xs text-gray-500 mt-1">
                    {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex-1 relative h-12">
                  {/* Group timeline background */}
                  <div className="absolute inset-0 flex">
                    {headers.map((header, index) => (
                      <div
                        key={index}
                        className={`flex-1 border-r border-gray-200 ${
                          header.isToday && showToday ? 'bg-blue-50' : 'bg-gray-50'
                        }`}
                      />
                    ))}
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
            No tasks in this year
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
      'year'
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
              {format(task.startDate, 'MMM yyyy')} - {format(task.endDate, 'MMM yyyy')}
            </span>
            {progress > 0 && (
              <span className="text-xs font-medium text-gray-600">
                {progress}%
              </span>
            )}
          </div>
        </div>

        {/* Task Bar */}
        <div className="flex-1 relative h-16">
          {/* Timeline background */}
          <div className="absolute inset-0 flex">
            {headers.map((header, index) => (
              <div
                key={index}
                className={`flex-1 border-r border-gray-200 ${
                  header.isToday && showToday ? 'bg-blue-50' : 'bg-white'
                }`}
              />
            ))}
          </div>

          {/* Task bar */}
          {position.isVisible && (
            <div
              className="absolute top-4 h-8 rounded-md shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] flex items-center overflow-hidden"
              style={{
                left: position.left,
                width: position.width,
                backgroundColor: color,
                opacity: 0.9,
              }}
              onClick={() => onTaskClick?.(task)}
              title={`${task.name}\n${format(task.startDate, 'MMM d, yyyy')} - ${format(task.endDate, 'MMM d, yyyy')}\nProgress: ${progress}%`}
            >
              {/* Progress bar */}
              {progress > 0 && progress < 100 && (
                <div
                  className="absolute inset-y-0 left-0 bg-black bg-opacity-20"
                  style={{ width: `${progress}%` }}
                />
              )}

              {/* Task name and duration */}
              <div className="px-2 flex items-center gap-1 relative z-10">
                <span className="text-xs text-white font-medium truncate">
                  {task.name}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default YearView;