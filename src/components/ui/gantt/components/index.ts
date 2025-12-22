// Gantt chart component exports
export {
  // New TimelineBar naming
  GanttTimelineBarItem,
  GanttTimelineBarCard,
  GanttTimelineBarDragHelper,
  type GanttTimelineBarProps,
  type GanttTimelineBarCardProps,
  type GanttTimelineBarDragHelperProps,
  // Backwards compatibility aliases
  GanttFeatureItem,
  GanttFeatureItemCard,
  GanttFeatureDragHelper,
  type GanttFeatureItemProps,
  type GanttFeatureItemCardProps,
  type GanttFeatureDragHelperProps,
} from './GanttFeatureItem';

// Staging zone components
export { GanttStagingZone, type GanttStagingZoneProps } from './GanttStagingZone';

// Custom scrollbar component
export { CustomScrollbar, type CustomScrollbarProps } from './CustomScrollbar';

// Droppable row component for DnD targeting
export { GanttDroppableRow, type GanttDroppableRowProps } from './GanttDroppableRow';
