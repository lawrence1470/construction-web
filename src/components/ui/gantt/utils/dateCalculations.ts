// Date calculation utilities for Gantt chart
// Extracted from components/ui/gantt.tsx

import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import type { Range, TimelineData, GanttContextProps } from '../types';

export const getsDaysIn = (range: Range) => {
  // For when range is daily
  let fn = (_date: Date) => 1;

  if (range === 'monthly' || range === 'quarterly') {
    fn = getDaysInMonth;
  }

  return fn;
};

export const getDifferenceIn = (range: Range) => {
  let fn = differenceInDays;

  if (range === 'monthly' || range === 'quarterly') {
    fn = differenceInMonths;
  }

  return fn;
};

export const getInnerDifferenceIn = (range: Range) => {
  let fn = differenceInHours;

  if (range === 'monthly' || range === 'quarterly') {
    fn = differenceInDays;
  }

  return fn;
};

export const getStartOf = (range: Range) => {
  let fn = startOfDay;

  if (range === 'monthly' || range === 'quarterly') {
    fn = startOfMonth;
  }

  return fn;
};

export const getEndOf = (range: Range) => {
  let fn = endOfDay;

  if (range === 'monthly' || range === 'quarterly') {
    fn = endOfMonth;
  }

  return fn;
};

export const getAddRange = (range: Range) => {
  let fn = addDays;

  if (range === 'monthly' || range === 'quarterly') {
    fn = addMonths;
  }

  return fn;
};

export const getDateByMousePosition = (
  context: Pick<GanttContextProps, 'timelineData' | 'columnWidth' | 'zoom' | 'range'>,
  mouseX: number
) => {
  const firstTimelineData = context.timelineData[0];
  if (!firstTimelineData) return new Date();
  const timelineStartDate = new Date(firstTimelineData.year, 0, 1);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const daysIn = getsDaysIn(context.range);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);
  const daysInMonth = daysIn(month);
  const pixelsPerDay = Math.round(columnWidth / daysInMonth);
  const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay);
  const actualDate = addDays(month, dayOffset);

  return actualDate;
};

// Get the month boundaries (1st to last day) for a position on the timeline
// Used for snap-to-month drop behavior
export const getMonthBoundsByMousePosition = (
  context: Pick<GanttContextProps, 'timelineData' | 'columnWidth' | 'zoom' | 'range'>,
  mouseX: number
): { startAt: Date; endAt: Date } => {
  const firstTimelineData = context.timelineData[0];
  if (!firstTimelineData) {
    const now = new Date();
    return { startAt: startOfMonth(now), endAt: endOfMonth(now) };
  }

  const timelineStartDate = new Date(firstTimelineData.year, 0, 1);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);

  return {
    startAt: startOfMonth(month),
    endAt: endOfMonth(month),
  };
};

export const createInitialTimelineData = (today: Date) => {
  const data: TimelineData = [];

  // Only show current year
  data.push(
    { year: today.getFullYear(), quarters: new Array(4).fill(null) }
  );

  for (const yearObj of data) {
    yearObj.quarters = new Array(4).fill(null).map((_, quarterIndex) => ({
      months: new Array(3).fill(null).map((_, monthIndex) => {
        const month = quarterIndex * 3 + monthIndex;
        return {
          days: getDaysInMonth(new Date(yearObj.year, month, 1)),
        };
      }),
    }));
  }

  return data;
};
