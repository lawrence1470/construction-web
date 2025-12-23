// Core type definitions for Gantt chart components
// Extracted from components/ui/gantt.tsx

export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttTimelineBar = {
  id: string;
  name: string;
  startAt?: Date | null; // Optional - unscheduled issues won't have dates
  endAt?: Date | null;   // Optional - unscheduled issues won't have dates
  status: GanttStatus;
  group?: string;
  coverImage?: string; // Base64 data URL or blob URL for cover image
  progress?: number; // 0-100 percentage, auto-calculated if not set
};

// Backwards compatibility alias
export type GanttFeature = GanttTimelineBar;

export type GanttMarkerProps = {
  id: string;
  date: Date;
  label: string;
};

export type Range = 'daily' | 'monthly' | 'quarterly';

export type TimelineData = {
  year: number;
  quarters: {
    months: {
      days: number;
    }[];
  }[];
}[];
