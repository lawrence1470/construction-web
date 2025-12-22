'use client';

import {
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  type GanttFeature,
} from '@/components/ui/gantt';
import { GanttSidebarStagingZone } from './GanttSidebarStagingZone';
import type { StagedTask } from '@/store/useStagingStore';

export interface GanttTaskColumnProps {
  groupedFeatures: Record<string, GanttFeature[]>;
  onSelectItem?: (id: string) => void;
  isFullscreen?: boolean;
  stagedTasks?: StagedTask[];
  onQuickAdd?: () => void;
}

export default function GanttTaskColumn({
  groupedFeatures,
  onSelectItem,
  isFullscreen = false,
  stagedTasks = [],
  onQuickAdd,
}: GanttTaskColumnProps) {
  return (
    <GanttSidebar className={isFullscreen ? 'h-full flex flex-col' : ''} isFullscreen={isFullscreen}>
      {/* Sidebar Staging Zone (Option E) */}
      {onQuickAdd && (
        <GanttSidebarStagingZone
          stagedTasks={stagedTasks}
          onQuickAdd={onQuickAdd}
          isFullscreen={isFullscreen}
        />
      )}

      {Object.entries(groupedFeatures).map(([group, features]) => (
        <GanttSidebarGroup key={group} name={group} taskCount={features.length} isFullscreen={isFullscreen}>
          {features.map((feature) => (
            <GanttSidebarItem
              key={feature.id}
              feature={feature}
              onSelectItem={onSelectItem}
              isFullscreen={isFullscreen}
            />
          ))}
        </GanttSidebarGroup>
      ))}
    </GanttSidebar>
  );
}
