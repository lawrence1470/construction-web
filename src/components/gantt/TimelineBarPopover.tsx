'use client';

import { memo } from 'react';
import type { GanttFeature } from '@/components/ui/gantt';
import { SplitViewModal } from './document-modal/variants/SplitViewModal';
import { earthworkCategory } from './document-modal/mockData';

export interface TimelineBarPopoverProps {
  feature: GanttFeature;
  group: string;
  onCoverImageChange?: (featureId: string, coverImage: string | undefined) => void;
  onDelete?: (featureId: string) => void;
}

const TimelineBarPopover = memo(function TimelineBarPopover({
  feature,
  group,
  onCoverImageChange,
  onDelete,
}: TimelineBarPopoverProps) {
  return (
    <SplitViewModal
      category={earthworkCategory}
      feature={feature}
      group={group}
      onCoverImageChange={onCoverImageChange}
      onDelete={onDelete}
    />
  );
});

export default TimelineBarPopover;
