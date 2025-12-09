// Core type definitions for Gantt chart components
// Extracted from components/ui/gantt.tsx

export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
  group?: string;
};

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
