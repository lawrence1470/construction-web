'use client';

import { memo } from 'react';
import { CalendarDays, Tag } from 'lucide-react';
import type { GanttFeature } from '@/components/ui/gantt';

export interface TimelineBarPopoverProps {
  feature: GanttFeature;
  group: string;
}

const TimelineBarPopover = memo(function TimelineBarPopover({
  feature,
  group,
}: TimelineBarPopoverProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDuration = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  return (
    <div className="space-y-3">
      {/* Header with task name and status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-[var(--text-primary)] leading-tight">
          {feature.name}
        </h3>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
          style={{
            backgroundColor: `${feature.status.color}20`,
            color: feature.status.color,
          }}
        >
          {feature.status.name}
        </span>
      </div>

      {/* Dates section */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-[var(--text-secondary)]">
        <CalendarDays className="w-3.5 h-3.5" />
        <span>
          {formatDate(feature.startAt)} - {formatDate(feature.endAt)}
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          ({getDuration(feature.startAt, feature.endAt)})
        </span>
      </div>

      {/* Group/Category */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-[var(--text-secondary)]">
        <Tag className="w-3.5 h-3.5" />
        <span>{group}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-[var(--border-color)]" />

      {/* Quick actions hint */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Drag to reschedule or resize from edges
      </p>
    </div>
  );
});

export default TimelineBarPopover;
