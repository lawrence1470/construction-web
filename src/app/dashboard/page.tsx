'use client';

import { useState } from 'react';
import { addDays, addWeeks } from 'date-fns';
import { Calendar, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import StatsCards from '@/components/dashboard/StatsCards';
import ProjectsList from '@/components/dashboard/ProjectsList';
import TeamActivity from '@/components/dashboard/TeamActivity';
import {
  GanttProvider,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureItem,
  GanttToday,
  GanttRowGrid,
  GanttDropZoneIndicator,
  type GanttFeature,
  type GanttStatus,
} from '@/components/ui/gantt';
import GanttTaskColumn from '@/components/gantt/GanttTaskColumn';
import AddTaskModal, { type NewTaskData } from '@/components/gantt/AddTaskModal';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EyeIcon, LinkIcon, TrashIcon } from 'lucide-react';

export default function DashboardPage() {
  const today = new Date();

  // Define statuses
  const completedStatus: GanttStatus = { id: 'completed', name: 'Completed', color: '#10b981' };
  const inProgressStatus: GanttStatus = { id: 'in-progress', name: 'In Progress', color: '#3b82f6' };
  const plannedStatus: GanttStatus = { id: 'planned', name: 'Planned', color: '#6b7280' };

  // Group names for organization
  const groupNames = [
    'Foundation & Site Work',
    'Structural Work',
    'MEP (Mechanical, Electrical, Plumbing)',
    'Finishing & Inspection',
  ];

  // Sample construction project data converted to new format
  const initialFeatures: GanttFeature[] = [
    // Foundation Phase
    {
      id: '1',
      name: 'Site Preparation',
      startAt: today,
      endAt: addDays(today, 7),
      status: completedStatus,
      group: 'Foundation & Site Work',
    },
    {
      id: '2',
      name: 'Excavation',
      startAt: addDays(today, 3),
      endAt: addDays(today, 10),
      status: inProgressStatus,
      group: 'Foundation & Site Work',
    },
    {
      id: '3',
      name: 'Foundation Pour',
      startAt: addDays(today, 11),
      endAt: addDays(today, 14),
      status: plannedStatus, // Planned
      group: 'Foundation & Site Work',
    },
    // Structural Phase
    {
      id: '4',
      name: 'Steel Framework',
      startAt: addDays(today, 15),
      endAt: addDays(today, 28),
      status: plannedStatus,
      group: 'Structural Work',
    },
    {
      id: '5',
      name: 'Concrete Floors',
      startAt: addDays(today, 20),
      endAt: addWeeks(today, 4),
      status: plannedStatus,
      group: 'Structural Work',
    },
    // MEP Phase
    {
      id: '6',
      name: 'Electrical Rough-In',
      startAt: addWeeks(today, 4),
      endAt: addWeeks(today, 6),
      status: plannedStatus,
      group: 'MEP (Mechanical, Electrical, Plumbing)',
    },
    {
      id: '7',
      name: 'Plumbing Installation',
      startAt: addWeeks(today, 4),
      endAt: addWeeks(today, 6),
      status: plannedStatus,
      group: 'MEP (Mechanical, Electrical, Plumbing)',
    },
    {
      id: '8',
      name: 'HVAC Installation',
      startAt: addWeeks(today, 5),
      endAt: addWeeks(today, 7),
      status: plannedStatus,
      group: 'MEP (Mechanical, Electrical, Plumbing)',
    },
    // Finishing Phase
    {
      id: '9',
      name: 'Insulation & Drywall',
      startAt: addWeeks(today, 7),
      endAt: addWeeks(today, 9),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
    {
      id: '10',
      name: 'Flooring',
      startAt: addWeeks(today, 9),
      endAt: addWeeks(today, 10),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
    {
      id: '11',
      name: 'Painting',
      startAt: addWeeks(today, 9),
      endAt: addWeeks(today, 11),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
    {
      id: '12',
      name: 'Final Inspections',
      startAt: addWeeks(today, 11),
      endAt: addWeeks(today, 12),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
  ];

  const [features, setFeatures] = useState(() => initialFeatures);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Track visual row positions for each feature (allows cards to be on different rows than their natural position)
  const [visualRowMap, setVisualRowMap] = useState<Record<string, number>>({});

  // Group features by their group property
  const groupedFeatures: Record<string, GanttFeature[]> = groupNames.reduce(
    (acc, groupName) => {
      acc[groupName] = features.filter((f) => f.group === groupName);
      return acc;
    },
    {} as Record<string, GanttFeature[]>
  );

  // Create a flat list of all features with their row indices
  // No group header rows anymore - groups are in a separate column
  const allFeaturesWithIndex = Object.entries(groupedFeatures).flatMap(
    ([group, groupFeatures], groupIndex) => {
      const previousGroupsFeatures = Object.values(groupedFeatures)
        .slice(0, groupIndex)
        .reduce((sum, g) => sum + g.length, 0);

      return groupFeatures.map((feature, indexInGroup) => ({
        feature,
        rowIndex: previousGroupsFeatures + indexInGroup,
        group,
      }));
    }
  );

  const totalRows = allFeaturesWithIndex.length;

  const handleViewFeature = (id: string) => {
    const feature = features.find((f) => f.id === id);
    if (feature) {
      alert(`Task: ${feature.name}\nStatus: ${feature.status.name}`);
    }
  };

  const handleCopyLink = (id: string) => {
    // Copy link to clipboard
    navigator.clipboard.writeText(`${window.location.origin}/task/${id}`);
  };

  const handleRemoveFeature = (id: string) => {
    setFeatures((prev) => prev.filter((feature) => feature.id !== id));
  };

  const handleMoveFeature = (
    id: string,
    startAt: Date,
    endAt: Date | null,
    targetRow?: number
  ) => {
    if (!endAt) return;

    // Update dates
    setFeatures((prev) =>
      prev.map((feature) =>
        feature.id === id ? { ...feature, startAt, endAt } : feature
      )
    );

    // Update visual row position if target row is specified
    if (targetRow !== undefined) {
      setVisualRowMap((prev) => ({
        ...prev,
        [id]: targetRow,
      }));
    }
  };

  const handleAddFeature = (date: Date) => {
    setSelectedDate(date);
    setAddTaskModalOpen(true);
  };

  const handleAddTask = (taskData: NewTaskData) => {
    // Map status ID to full status object
    const statusMap: Record<string, GanttStatus> = {
      'completed': completedStatus,
      'in-progress': inProgressStatus,
      'planned': plannedStatus,
    };

    const newFeature: GanttFeature = {
      id: `task-${Date.now()}`,
      name: taskData.name,
      startAt: taskData.startAt,
      endAt: taskData.endAt,
      status: statusMap[taskData.statusId] ?? plannedStatus,
      group: taskData.group,
    };

    setFeatures((prev) => [...prev, newFeature]);
  };

  return (
    <LayoutWrapper>
      {/* Greeting Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-800 mb-1">Good morning, Alex!</h1>
        <p className="text-gray-500">Let&apos;s build something great today.</p>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Fullscreen Overlay Background */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          />
        )}
      </AnimatePresence>

      {/* Gantt Chart Section */}
      <div
        className={`
          bg-white rounded-3xl p-6 overflow-hidden min-w-0
          ${isFullscreen
            ? 'fixed inset-4 z-50 shadow-2xl'
            : 'relative mt-6'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className={`font-medium text-gray-800 ${isFullscreen ? 'text-2xl' : 'text-xl'}`}>
                Project Timeline
              </h2>
              <p className="text-sm text-gray-500">Track your construction schedule</p>
            </div>
          </div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 hover:scale-110 active:scale-90 transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-gray-600" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Gantt Chart - Preserved functionality */}
        <div
          className="overflow-hidden min-w-0 w-full"
          style={{
            height: isFullscreen ? 'calc(100vh - 140px)' : 400,
          }}
        >
          <GanttProvider
            onAddItem={handleAddFeature}
            range="monthly"
            zoom={100}
            validDropRows={allFeaturesWithIndex.map(f => f.rowIndex)}
            className="h-full border rounded-2xl"
          >
            <GanttTaskColumn
              groupedFeatures={groupedFeatures}
              onSelectItem={handleViewFeature}
              isFullscreen={isFullscreen}
            />
            <GanttTimeline>
              <GanttHeader />
              <GanttRowGrid
                totalRows={totalRows}
                taskRowIndices={allFeaturesWithIndex.map(f => f.rowIndex)}
              />
              <GanttDropZoneIndicator />
              <GanttFeatureList>
                {Object.entries(groupedFeatures).map(([group, groupFeatures], groupIndex) => {
                  // Calculate the starting row index for this group (no group header rows)
                  const previousGroupsFeatures = Object.values(groupedFeatures)
                    .slice(0, groupIndex)
                    .reduce((sum, g) => sum + g.length, 0);
                  const groupStartRow = previousGroupsFeatures;

                  return (
                    <GanttFeatureListGroup key={group}>
                      {groupFeatures.map((feature, indexInGroup) => {
                        const rowIndex = groupStartRow + indexInGroup;
                        return (
                          <div className="flex relative overflow-visible" key={feature.id}>
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleViewFeature(feature.id)}
                                >
                                  <GanttFeatureItem
                                    onMove={handleMoveFeature}
                                    rowIndex={rowIndex}
                                    visualRow={visualRowMap[feature.id] ?? rowIndex}
                                    totalRows={totalRows}
                                    groupName={group}
                                    {...feature}
                                  />
                                </button>
                              </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              className="flex items-center gap-2"
                              onClick={() => handleViewFeature(feature.id)}
                            >
                              <EyeIcon size={16} className="text-muted-foreground" />
                              View task
                            </ContextMenuItem>
                            <ContextMenuItem
                              className="flex items-center gap-2"
                              onClick={() => handleCopyLink(feature.id)}
                            >
                              <LinkIcon size={16} className="text-muted-foreground" />
                              Copy link
                            </ContextMenuItem>
                            <ContextMenuItem
                              className="flex items-center gap-2 text-destructive"
                              onClick={() => handleRemoveFeature(feature.id)}
                            >
                              <TrashIcon size={16} />
                              Remove from timeline
                            </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          </div>
                        );
                      })}
                    </GanttFeatureListGroup>
                  );
                })}
              </GanttFeatureList>
              <GanttToday />
            </GanttTimeline>
          </GanttProvider>
        </div>
      </div>

      {/* Projects and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ProjectsList />
        <TeamActivity />
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        open={addTaskModalOpen}
        onOpenChange={setAddTaskModalOpen}
        defaultDate={selectedDate}
        groupNames={groupNames}
        onAddTask={handleAddTask}
      />
    </LayoutWrapper>
  );
}
