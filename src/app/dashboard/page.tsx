'use client';

import { useState, useCallback, memo, useMemo } from 'react';
import { Calendar, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { useSession } from '@/lib/auth-client';
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
import { GanttStagingRow } from '@/components/gantt/GanttStagingRow';
import TimelineBarPopover from '@/components/gantt/TimelineBarPopover';

// Zustand store imports
import {
  useGroupedFeaturesWithRows,
  useFeatureActions,
  useGroups,
  useStatuses,
} from '@/store/hooks';
import {
  useStagedTasks,
  useStagingActions,
  type StagedTask,
} from '@/store/useStagingStore';

// Memoized feature row component to prevent unnecessary re-renders
interface GanttFeatureRowProps {
  feature: GanttFeature;
  rowIndex: number;
  totalRows: number;
  group: string;
  onMove: (id: string, startAt: Date, endAt: Date | null, targetRow?: number) => void;
  onCoverImageChange: (featureId: string, coverImage: string | undefined) => void;
  onDelete: (featureId: string) => void;
}

const GanttFeatureRow = memo(function GanttFeatureRow({
  feature,
  rowIndex,
  totalRows,
  group,
  onMove,
  onCoverImageChange,
  onDelete,
}: GanttFeatureRowProps) {
  const popoverContent = useMemo(
    () => <TimelineBarPopover feature={feature} group={group} onCoverImageChange={onCoverImageChange} onDelete={onDelete} />,
    [feature, group, onCoverImageChange, onDelete]
  );

  return (
    <div className="flex relative overflow-visible">
      <GanttFeatureItem
        onMove={onMove}
        rowIndex={rowIndex}
        totalRows={totalRows}
        groupName={group}
        popoverContent={popoverContent}
        {...feature}
      />
    </div>
  );
});

export default function DashboardPage() {
  // Auth session for user info
  const { data: session } = useSession();

  // Zustand state - features, groups, statuses from store
  const { grouped: groupedFeatures, flatList: allFeaturesWithIndex, totalRows } = useGroupedFeaturesWithRows();
  const { add: addFeature, move: moveFeature, update: updateFeature, remove: removeFeature } = useFeatureActions();
  const groups = useGroups();
  const statuses = useStatuses();

  // Staging zone state
  const stagedTasks = useStagedTasks();
  const { addStagedTask, removeStagedTask } = useStagingActions();

  // Local UI state - stays as useState
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Get user's first name from session
  const userName = useMemo(() => {
    if (!session?.user?.name) return '';
    return session.user.name.split(' ')[0];
  }, [session?.user?.name]);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleMoveFeature = useCallback((
    id: string,
    startAt: Date,
    endAt: Date | null,
    targetRow?: number
  ) => {
    if (!endAt) return;
    moveFeature(id, startAt, endAt, targetRow);
  }, [moveFeature]);

  const handleCoverImageChange = useCallback((featureId: string, coverImage: string | undefined) => {
    updateFeature(featureId, { coverImage });
  }, [updateFeature]);

  const handleDeleteFeature = useCallback((featureId: string) => {
    removeFeature(featureId);
  }, [removeFeature]);

  // Handler for adding tasks directly from month header buttons (Option A)
  const handleAddToMonth = useCallback((startAt: Date, endAt: Date) => {
    const plannedStatus = statuses['planned'];
    if (!plannedStatus) return;

    // Create a new task spanning the full month
    const newFeature: GanttFeature = {
      id: `task-${Date.now()}`,
      name: 'New Task',
      startAt,
      endAt,
      status: plannedStatus,
      group: groups[0] ?? 'Default',
    };

    addFeature(newFeature);
  }, [statuses, groups, addFeature]);

  // Staging zone handlers
  const handleQuickAdd = useCallback(() => {
    // Get a visible date (current date or start of timeline)
    const visibleDate = new Date();
    const plannedStatus = statuses['planned'];
    if (!plannedStatus) return; // Safety check
    addStagedTask(visibleDate, plannedStatus);
  }, [addStagedTask, statuses]);

  const handleStagedItemDrop = useCallback(
    (stagedTask: StagedTask, startAt: Date, endAt: Date, targetRow: number) => {
      // Find the target row's feature - this is the EXISTING feature we want to schedule
      const targetFeatureEntry = allFeaturesWithIndex.find((f) => f.rowIndex === targetRow);

      if (targetFeatureEntry) {
        // UPDATE the existing feature with the dropped dates
        // This "connects" the staged task to the existing row by scheduling it
        updateFeature(targetFeatureEntry.feature.id, {
          startAt,
          endAt,
        });
        removeStagedTask(stagedTask.id);
      }
    },
    [allFeaturesWithIndex, updateFeature, removeStagedTask]
  );

  return (
    <LayoutWrapper>
      {/* Greeting Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-[var(--text-primary)] mb-1">{greeting}{userName ? `, ${userName}` : ''}!</h1>
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
            range="monthly"
            zoom={100}
            validDropRows={allFeaturesWithIndex
              .filter(f => !f.feature.startAt && !f.feature.endAt)
              .map(f => f.rowIndex)}
            className="h-full border rounded-2xl"
            enableStaging={true}
            stagingZone={
              <GanttStagingRow
                stagedTasks={stagedTasks}
                onQuickAdd={handleQuickAdd}
                isFullscreen={isFullscreen}
              />
            }
            onStagedItemDrop={handleStagedItemDrop}
          >
            <GanttTaskColumn
              groupedFeatures={groupedFeatures}
              isFullscreen={isFullscreen}
            />
            <GanttTimeline>
              <GanttHeader onAddToMonth={handleAddToMonth} />
              <GanttRowGrid
                totalRows={totalRows}
                taskRowIndices={allFeaturesWithIndex.map(f => f.rowIndex)}
                enableDroppableRows={true}
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
                        // Only render timeline bar if feature has dates scheduled
                        if (!feature.startAt || !feature.endAt) {
                          return null;
                        }

                        return (
                          <GanttFeatureRow
                            key={feature.id}
                            feature={feature}
                            rowIndex={rowIndex}
                            totalRows={totalRows}
                            group={group}
                            onMove={handleMoveFeature}
                            onCoverImageChange={handleCoverImageChange}
                            onDelete={handleDeleteFeature}
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

    </LayoutWrapper>
  );
}
