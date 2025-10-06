import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  addWeeks,
  addMonths,
  addYears,
  subWeeks,
  subMonths,
  subYears,
  isWeekend,
  isToday,
  isSameDay,
  isSameMonth,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ViewType, DateRange, TimelineHeader } from '../types/gantt.types';

// Get the start and end dates for the current view period
export const getViewDateRange = (
  date: Date,
  viewType: ViewType
): DateRange => {
  switch (viewType) {
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }), // Monday as start of week
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date),
      };
  }
};

// Navigate to the next period
export const navigateForward = (date: Date, viewType: ViewType): Date => {
  switch (viewType) {
    case 'week':
      return addWeeks(date, 1);
    case 'month':
      return addMonths(date, 1);
    case 'year':
      return addYears(date, 1);
  }
};

// Navigate to the previous period
export const navigateBackward = (date: Date, viewType: ViewType): Date => {
  switch (viewType) {
    case 'week':
      return subWeeks(date, 1);
    case 'month':
      return subMonths(date, 1);
    case 'year':
      return subYears(date, 1);
  }
};

// Generate timeline headers for week view
export const getWeekHeaders = (startDate: Date, endDate: Date): TimelineHeader[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.map(date => ({
    label: format(date, 'EEE dd'),
    date,
    isWeekend: isWeekend(date),
    isToday: isToday(date),
  }));
};

// Generate timeline headers for month view with month grouping
export const getMonthHeaders = (startDate: Date, endDate: Date): TimelineHeader[] => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.map(date => ({
    label: format(date, 'd'),
    date,
    isWeekend: isWeekend(date),
    isToday: isToday(date),
  }));
};

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

// Generate timeline headers for year view
export const getYearHeaders = (startDate: Date, endDate: Date): TimelineHeader[] => {
  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  return months.map(date => ({
    label: format(date, 'MMM'),
    date,
    isWeekend: false,
    isToday: isSameMonth(date, new Date()),
  }));
};

// Calculate the position and width of a task bar
export const calculateTaskPosition = (
  taskStart: Date,
  taskEnd: Date,
  viewStart: Date,
  viewEnd: Date,
  viewType: ViewType
) => {
  // Ensure task dates are within view bounds
  const effectiveStart = taskStart < viewStart ? viewStart : taskStart;
  const effectiveEnd = taskEnd > viewEnd ? viewEnd : taskEnd;

  let totalUnits: number;
  let startOffset: number;
  let duration: number;

  switch (viewType) {
    case 'week':
    case 'month':
      totalUnits = differenceInDays(viewEnd, viewStart) + 1;
      startOffset = differenceInDays(effectiveStart, viewStart);
      duration = differenceInDays(effectiveEnd, effectiveStart) + 1;
      break;
    case 'year':
      totalUnits = differenceInMonths(viewEnd, viewStart) + 1;
      startOffset = differenceInMonths(effectiveStart, viewStart);
      duration = differenceInMonths(effectiveEnd, effectiveStart) + 1;
      break;
  }

  const left = (startOffset / totalUnits) * 100;
  const width = (duration / totalUnits) * 100;

  return {
    left: `${left}%`,
    width: `${width}%`,
    isVisible: width > 0 && left < 100 && left + width > 0,
  };
};

// Format date range for display
export const formatDateRange = (
  startDate: Date,
  endDate: Date,
  viewType: ViewType
): string => {
  switch (viewType) {
    case 'week':
      if (isSameMonth(startDate, endDate)) {
        return `${format(startDate, 'd')} - ${format(endDate, 'd MMM yyyy')}`;
      }
      return `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM yyyy')}`;
    case 'month':
      return format(startDate, 'MMMM yyyy');
    case 'year':
      return format(startDate, 'yyyy');
  }
};

// Get weeks in a month for grid layout
export const getWeeksInMonth = (date: Date): Date[][] => {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

  return weeks.map(weekStart => {
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    });
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