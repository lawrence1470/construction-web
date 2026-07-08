/**
 * Pure computation for the project Overview dashboard. Kept separate from the
 * tRPC router so the bucket/count logic is unit-testable without a DB.
 *
 * "Completed" matches project.list's definition: percentDone >= 100.
 * "Behind schedule" = incomplete AND scheduled to end before the start of today.
 * Weekly buckets are rolling 7-day windows ending today (server timezone) —
 * they feed the stat-card sparklines, so relative shape matters more than
 * calendar-week alignment.
 */

export interface OverviewTask {
  id: string;
  name: string;
  percentDone: number;
  endDate: Date | null;
}

export interface WeeklyBucket {
  /** ISO date (yyyy-mm-dd) of the last day in the bucket */
  weekEnd: string;
  /** Tasks scheduled to finish inside this window */
  scheduled: number;
  /** Completed tasks whose scheduled finish falls inside this window */
  completed: number;
}

export interface OverviewStats {
  taskCount: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  /** Average percentDone across all tasks, rounded (matches project.list) */
  completionPercent: number;
  weekly: WeeklyBucket[];
  upcoming: Array<{ id: string; name: string; endDate: Date; percentDone: number }>;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const BUCKET_COUNT = 8;

function startOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function computeOverviewStats(tasks: OverviewTask[], now: Date): OverviewStats {
  let completedCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;
  let percentSum = 0;

  const todayStart = startOfDay(now);

  for (const t of tasks) {
    percentSum += t.percentDone;
    if (t.percentDone >= 100) {
      completedCount += 1;
    } else if (t.percentDone > 0) {
      inProgressCount += 1;
    }
    if (t.percentDone < 100 && t.endDate && t.endDate.getTime() < todayStart) {
      overdueCount += 1;
    }
  }

  // Buckets cover (bucketsStart, todayEnd]: bucket i ends at
  // todayEnd - (BUCKET_COUNT - 1 - i) weeks. The last bucket ends today.
  const todayEnd = todayStart + DAY_MS; // exclusive upper bound
  const bucketsStart = todayEnd - BUCKET_COUNT * WEEK_MS;
  const weekly: WeeklyBucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => {
    const end = new Date(todayEnd - (BUCKET_COUNT - 1 - i) * WEEK_MS - DAY_MS);
    return {
      weekEnd: end.toISOString().slice(0, 10),
      scheduled: 0,
      completed: 0,
    };
  });

  for (const t of tasks) {
    if (!t.endDate) continue;
    const ts = t.endDate.getTime();
    if (ts < bucketsStart || ts >= todayEnd) continue;
    const index = Math.floor((ts - bucketsStart) / WEEK_MS);
    const bucket = weekly[index];
    if (!bucket) continue;
    bucket.scheduled += 1;
    if (t.percentDone >= 100) bucket.completed += 1;
  }

  const upcoming = tasks
    .filter(
      (t): t is OverviewTask & { endDate: Date } =>
        t.percentDone < 100 && t.endDate !== null && t.endDate.getTime() >= todayStart,
    )
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 5)
    .map((t) => ({ id: t.id, name: t.name, endDate: t.endDate, percentDone: t.percentDone }));

  return {
    taskCount: tasks.length,
    completedCount,
    inProgressCount,
    overdueCount,
    completionPercent: tasks.length > 0 ? Math.round(percentSum / tasks.length) : 0,
    weekly,
    upcoming,
  };
}
