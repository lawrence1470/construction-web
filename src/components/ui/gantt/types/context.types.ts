// Context-related type definitions for Gantt chart
// Extracted from components/ui/gantt.tsx

import type { RefObject } from 'react';
import type { Range, TimelineData } from './core.types';

export type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  onAddItem: ((date: Date) => void) | undefined;
  placeholderLength: number;
  timelineData: TimelineData;
  ref: RefObject<HTMLDivElement | null> | null;
  validDropRows?: number[]; // Row indices where items can be dropped (task rows only)
};
