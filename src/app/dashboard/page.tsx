'use client';

import { useState, useCallback, memo } from 'react';
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

// Zustand store imports
import {
  useGroupedFeaturesWithRows,
  useFeatureActions,
  useGroups,
  useStatuses,
  useVisualRowMap,
} from '@/store/hooks';

// Memoized feature row component to prevent unnecessary re-renders
interface GanttFeatureRowProps {
  feature: GanttFeature;
  rowIndex: number;
  visualRow: number;
  totalRows: number;
  group: string;
  onView: (id: string) => void;
  onCopyLink: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, startAt: Date, endAt: Date | null, targetRow?: number) => void;
}

const GanttFeatureRow = memo(function GanttFeatureRow({
  feature,
  rowIndex,
  visualRow,
  totalRows,
  group,
  onView,
  onCopyLink,
  onRemove,
  onMove,
}: GanttFeatureRowProps) {
  return (
    <div className="flex relative overflow-visible">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={() => onView(feature.id)}
          >
            <GanttFeatureItem
              onMove={onMove}
              rowIndex={rowIndex}
              visualRow={visualRow}
              totalRows={totalRows}
              groupName={group}
              {...feature}
            />
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="flex items-center gap-2"
            onClick={() => onView(feature.id)}
          >
            <EyeIcon size={16} className="text-muted-foreground" />
            View task
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2"
            onClick={() => onCopyLink(feature.id)}
          >
            <LinkIcon size={16} className="text-muted-foreground" />
            Copy link
          </ContextMenuItem>
          <ContextMenuItem
            className="flex items-center gap-2 text-destructive"
            onClick={() => onRemove(feature.id)}
          >
            <TrashIcon size={16} />
            Remove from timeline
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
});

export default function DashboardPage() {
  // Zustand state - features, groups, statuses from store
  const { grouped: groupedFeatures, flatList: allFeaturesWithIndex, totalRows } = useGroupedFeaturesWithRows();
  const { add: addFeature, remove: removeFeature, move: moveFeature } = useFeatureActions();
  const groups = useGroups();
  const statuses = useStatuses();
  const visualRowMap = useVisualRowMap();

  // Local UI state - stays as useState
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Memoized callbacks to prevent unnecessary re-renders
  const handleViewFeature = useCallback((id: string) => {
    const featureEntry = allFeaturesWithIndex.find((f) => f.feature.id === id);
    if (featureEntry) {
      alert(`Task: ${featureEntry.feature.name}\nStatus: ${featureEntry.feature.status.name}`);
    }
  }, [allFeaturesWithIndex]);

  const handleCopyLink = useCallback((id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/task/${id}`);
  }, []);

  const handleRemoveFeature = useCallback((id: string) => {
    removeFeature(id);
  }, [removeFeature]);

  const handleMoveFeature = useCallback((
    id: string,
    startAt: Date,
    endAt: Date | null,
    targetRow?: number
  ) => {
    if (!endAt) return;
    moveFeature(id, startAt, endAt, targetRow);
  }, [moveFeature]);

  const handleAddFeature = useCallback((date: Date) => {
    setSelectedDate(date);
    setAddTaskModalOpen(true);
  }, []);

  const handleAddTask = useCallback((taskData: NewTaskData) => {
    // Get status from store, fallback to planned status
    const status = statuses[taskData.statusId] || statuses['planned'];
    if (!status) return; // Safety check - should never happen with default data

    const newFeature: GanttFeature = {
      id: `task-${Date.now()}`,
      name: taskData.name,
      startAt: taskData.startAt,
      endAt: taskData.endAt,
      status,
      group: taskData.group,
    };

    addFeature(newFeature);
  }, [statuses, addFeature]);

  return (
    <LayoutWrapper>
      {/* Greeting Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-[var(--text-primary)] mb-1">Good morning, Alex!</h1>
        <p className="text-gray-500 dark:text-[var(--text-secondary)]">Let&apos;s build something great today.</p>
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
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsFullscreen(false)}
          />
        )}
      </AnimatePresence>

      {/* Gantt Chart Section */}
      <div
        className={`
          bg-white dark:bg-[var(--bg-card)] rounded-3xl p-6 overflow-hidden min-w-0 transition-colors duration-300
          ${isFullscreen
            ? 'fixed inset-4 z-50 shadow-2xl'
            : 'relative mt-6'
          }
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className={`font-medium text-gray-800 dark:text-[var(--text-primary)] ${isFullscreen ? 'text-2xl' : 'text-xl'}`}>
                Project Timeline
              </h2>
              <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">Track your construction schedule</p>
            </div>
          </div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-10 h-10 bg-gray-100 dark:bg-[var(--bg-input)] rounded-2xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-90 transition-all cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
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
                          <GanttFeatureRow
                            key={feature.id}
                            feature={feature}
                            rowIndex={rowIndex}
                            visualRow={visualRowMap[feature.id] ?? rowIndex}
                            totalRows={totalRows}
                            group={group}
                            onView={handleViewFeature}
                            onCopyLink={handleCopyLink}
                            onRemove={handleRemoveFeature}
                            onMove={handleMoveFeature}
                          />
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
        groupNames={groups}
        onAddTask={handleAddTask}
      />
    </LayoutWrapper>
  );
}
