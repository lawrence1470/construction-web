'use client';

import { useState } from 'react';
import { addDays, addWeeks, addMonths } from 'date-fns';
import GanttContainer from '@/components/gantt/GanttContainer';
import { GanttTask, GanttGroup } from '@/components/gantt/types/gantt.types';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export default function Home() {
  // Sample construction project data
  const today = new Date();

  const constructionTasks: GanttTask[] = [
    // Foundation Phase
    {
      id: '1',
      name: 'Site Preparation',
      startDate: today,
      endDate: addDays(today, 7),
      progress: 100,
      assignee: 'Site Crew A',
      color: '#10b981',
    },
    {
      id: '2',
      name: 'Excavation',
      startDate: addDays(today, 3),
      endDate: addDays(today, 10),
      progress: 85,
      assignee: 'Excavation Team',
      color: '#3b82f6',
    },
    {
      id: '3',
      name: 'Foundation Pour',
      startDate: addDays(today, 11),
      endDate: addDays(today, 14),
      progress: 0,
      assignee: 'Concrete Team',
      dependencies: ['2'],
    },
    // Structural Phase
    {
      id: '4',
      name: 'Steel Framework',
      startDate: addDays(today, 15),
      endDate: addDays(today, 28),
      progress: 0,
      assignee: 'Steel Workers',
      dependencies: ['3'],
    },
    {
      id: '5',
      name: 'Concrete Floors',
      startDate: addDays(today, 20),
      endDate: addWeeks(today, 4),
      progress: 0,
      assignee: 'Concrete Team',
      dependencies: ['4'],
    },
    // MEP Phase
    {
      id: '6',
      name: 'Electrical Rough-In',
      startDate: addWeeks(today, 4),
      endDate: addWeeks(today, 6),
      progress: 0,
      assignee: 'Electrical Team',
      color: '#eab308',
    },
    {
      id: '7',
      name: 'Plumbing Installation',
      startDate: addWeeks(today, 4),
      endDate: addWeeks(today, 6),
      progress: 0,
      assignee: 'Plumbing Team',
      color: '#06b6d4',
    },
    {
      id: '8',
      name: 'HVAC Installation',
      startDate: addWeeks(today, 5),
      endDate: addWeeks(today, 7),
      progress: 0,
      assignee: 'HVAC Team',
      color: '#8b5cf6',
    },
    // Finishing Phase
    {
      id: '9',
      name: 'Insulation & Drywall',
      startDate: addWeeks(today, 7),
      endDate: addWeeks(today, 9),
      progress: 0,
      assignee: 'Drywall Team',
    },
    {
      id: '10',
      name: 'Flooring',
      startDate: addWeeks(today, 9),
      endDate: addWeeks(today, 10),
      progress: 0,
      assignee: 'Flooring Team',
    },
    {
      id: '11',
      name: 'Painting',
      startDate: addWeeks(today, 9),
      endDate: addWeeks(today, 11),
      progress: 0,
      assignee: 'Painting Team',
    },
    {
      id: '12',
      name: 'Final Inspections',
      startDate: addWeeks(today, 11),
      endDate: addWeeks(today, 12),
      progress: 0,
      assignee: 'Inspector',
      color: '#ef4444',
    },
  ];

  const constructionGroups: GanttGroup[] = [
    {
      id: 'foundation',
      name: 'Foundation & Site Work',
      tasks: constructionTasks.slice(0, 3),
    },
    {
      id: 'structure',
      name: 'Structural Work',
      tasks: constructionTasks.slice(3, 5),
    },
    {
      id: 'mep',
      name: 'MEP (Mechanical, Electrical, Plumbing)',
      tasks: constructionTasks.slice(5, 8),
    },
    {
      id: 'finishing',
      name: 'Finishing & Inspection',
      tasks: constructionTasks.slice(8, 12),
    },
  ];

  const handleTaskClick = (task: GanttTask) => {
    console.log('Task clicked:', task);
    alert(`Task: ${task.name}\nProgress: ${task.progress || 0}%\nAssignee: ${task.assignee || 'Unassigned'}`);
  };

  const handleTaskUpdate = (task: GanttTask) => {
    console.log('Task updated:', task);
  };

  return (
    <LayoutWrapper>
      <div className="p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Construction Project Timeline
            </h1>
            <p className="text-gray-600">
              Track and manage your construction project schedule with interactive Gantt charts
            </p>
          </div>

          {/* Gantt Chart */}
          <div className="bg-white rounded-lg shadow-lg" style={{ height: '600px' }}>
            <GanttContainer
              groups={constructionGroups}
              tasks={constructionTasks}
              currentView="month"
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
              showWeekends={true}
              showToday={true}
            />
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-500"></div>
                <span className="text-gray-600">Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-gray-600">Critical/Overdue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
