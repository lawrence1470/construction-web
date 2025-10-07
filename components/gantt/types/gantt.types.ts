// Type definitions for the Gantt chart components

export interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress?: number; // 0-100 percentage
  color?: string;
  dependencies?: string[]; // IDs of dependent tasks
  assignee?: string;
  description?: string;
}

export interface GanttGroup {
  id: string;
  name: string;
  tasks: GanttTask[];
  collapsed?: boolean;
}

export interface GanttContainerProps {
  tasks?: GanttTask[];
  groups?: GanttGroup[];
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  showWeekends?: boolean;
  showToday?: boolean;
  readOnly?: boolean;
}

export interface ViewProps {
  tasks: GanttTask[];
  groups?: GanttGroup[];
  startDate: Date;
  endDate: Date;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (task: GanttTask) => void;
  showWeekends?: boolean;
  showToday?: boolean;
  readOnly?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimelineHeader {
  label: string;
  date: Date;
  isWeekend?: boolean;
  isToday?: boolean;
}