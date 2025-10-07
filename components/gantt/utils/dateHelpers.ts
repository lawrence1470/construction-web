import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isWeekend,
  isToday,
  differenceInDays,
} from 'date-fns';
import { TimelineHeader } from '../types/gantt.types';

// Generate month groups with day headers for multi-month view
export interface MonthGroup {
  month: Date;
  label: string;
  days: TimelineHeader[];
}

export const getMonthGroupedHeaders = (startDate: Date, endDate: Date): MonthGroup[] => {
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  return months.map(month => {
    const monthStart = month < startDate ? startDate : startOfMonth(month);
    const monthEnd = endOfMonth(month) > endDate ? endDate : endOfMonth(month);

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return {
      month,
      label: format(month, 'MMMM yyyy'),
      days: days.map(date => ({
        label: format(date, 'd'),
        date,
        isWeekend: isWeekend(date),
        isToday: isToday(date),
      })),
    };
  });
};


// Check if a task overlaps with the current view period
export const isTaskInView = (
  taskStart: Date,
  taskEnd: Date,
  viewStart: Date,
  viewEnd: Date
): boolean => {
  return taskStart <= viewEnd && taskEnd >= viewStart;
};

// Calculate task progress based on current date
export const calculateProgress = (
  startDate: Date,
  endDate: Date,
  progress?: number
): number => {
  if (progress !== undefined) return progress;

  const now = new Date();
  if (now < startDate) return 0;
  if (now > endDate) return 100;

  const total = differenceInDays(endDate, startDate);
  const elapsed = differenceInDays(now, startDate);

  return Math.round((elapsed / total) * 100);
};

// Get color based on task status
export const getTaskColor = (
  progress: number,
  endDate: Date,
  customColor?: string
): string => {
  if (customColor) return customColor;

  const now = new Date();
  const isOverdue = now > endDate && progress < 100;

  if (isOverdue) return '#ef4444'; // red
  if (progress === 100) return '#10b981'; // green
  if (progress > 0) return '#3b82f6'; // blue
  return '#6b7280'; // gray
};