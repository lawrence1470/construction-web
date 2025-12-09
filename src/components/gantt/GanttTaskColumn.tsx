'use client';

import {
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  type GanttFeature,
} from '@/components/ui/gantt';

export interface GanttTaskColumnProps {
  groupedFeatures: Record<string, GanttFeature[]>;
  onSelectItem: (id: string) => void;
  isFullscreen?: boolean;
}

export default function GanttTaskColumn({
  groupedFeatures,
  onSelectItem,
  isFullscreen = false,
}: GanttTaskColumnProps) {
  return (
    <GanttSidebar className={isFullscreen ? 'h-full flex flex-col' : ''} isFullscreen={isFullscreen}>
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
