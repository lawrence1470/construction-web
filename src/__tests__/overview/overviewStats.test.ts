import { describe, it, expect } from "vitest";
import { computeOverviewStats, type OverviewTask } from "@/lib/utils/overviewStats";

// Fixed "now": a Wednesday at noon
const NOW = new Date("2026-07-01T12:00:00");

function task(overrides: Partial<OverviewTask> & { id: string }): OverviewTask {
  return { name: overrides.id, percentDone: 0, endDate: null, ...overrides };
}

describe("computeOverviewStats", () => {
  it("returns zeroed stats and 8 empty buckets for no tasks", () => {
    const stats = computeOverviewStats([], NOW);
    expect(stats.taskCount).toBe(0);
    expect(stats.completedCount).toBe(0);
    expect(stats.inProgressCount).toBe(0);
    expect(stats.overdueCount).toBe(0);
    expect(stats.completionPercent).toBe(0);
    expect(stats.weekly).toHaveLength(8);
    expect(stats.weekly.every((w) => w.scheduled === 0 && w.completed === 0)).toBe(true);
    expect(stats.upcoming).toEqual([]);
  });

  it("counts completed (>=100), in progress (>0), and averages percentDone", () => {
    const stats = computeOverviewStats(
      [
        task({ id: "a", percentDone: 100 }),
        task({ id: "b", percentDone: 50 }),
        task({ id: "c", percentDone: 0 }),
        task({ id: "d", percentDone: 100 }),
      ],
      NOW,
    );
    expect(stats.taskCount).toBe(4);
    expect(stats.completedCount).toBe(2);
    expect(stats.inProgressCount).toBe(1);
    expect(stats.completionPercent).toBe(Math.round(250 / 4));
  });

  it("marks incomplete tasks ending before today as overdue, but not completed ones", () => {
    const yesterday = new Date("2026-06-30T09:00:00");
    const today = new Date("2026-07-01T09:00:00");
    const stats = computeOverviewStats(
      [
        task({ id: "late", percentDone: 40, endDate: yesterday }),
        task({ id: "done-late", percentDone: 100, endDate: yesterday }),
        task({ id: "due-today", percentDone: 10, endDate: today }),
      ],
      NOW,
    );
    expect(stats.overdueCount).toBe(1);
  });

  it("buckets scheduled finishes into rolling weeks ending today", () => {
    const stats = computeOverviewStats(
      [
        // Today → last bucket
        task({ id: "today", percentDone: 100, endDate: new Date("2026-07-01T08:00:00") }),
        // 6 days ago → still the last bucket (rolling 7-day window)
        task({ id: "recent", percentDone: 0, endDate: new Date("2026-06-25T08:00:00") }),
        // 10 days ago → second-to-last bucket
        task({ id: "lastweek", percentDone: 100, endDate: new Date("2026-06-21T08:00:00") }),
        // Far outside the 8-week window → not bucketed
        task({ id: "ancient", percentDone: 100, endDate: new Date("2025-01-01T08:00:00") }),
        // Future → not bucketed
        task({ id: "future", percentDone: 0, endDate: new Date("2026-08-01T08:00:00") }),
      ],
      NOW,
    );
    const last = stats.weekly[7]!;
    const prev = stats.weekly[6]!;
    expect(last.scheduled).toBe(2);
    expect(last.completed).toBe(1);
    expect(prev.scheduled).toBe(1);
    expect(prev.completed).toBe(1);
    const total = stats.weekly.reduce((sum, w) => sum + w.scheduled, 0);
    expect(total).toBe(3);
  });

  it("lists upcoming incomplete tasks sorted by due date, capped at 5", () => {
    const tasks: OverviewTask[] = [
      task({ id: "t3", percentDone: 0, endDate: new Date("2026-07-10") }),
      task({ id: "t1", percentDone: 20, endDate: new Date("2026-07-02") }),
      task({ id: "t2", percentDone: 0, endDate: new Date("2026-07-05") }),
      task({ id: "done", percentDone: 100, endDate: new Date("2026-07-03") }),
      task({ id: "past", percentDone: 0, endDate: new Date("2026-06-01") }),
      task({ id: "t4", percentDone: 0, endDate: new Date("2026-07-12") }),
      task({ id: "t5", percentDone: 0, endDate: new Date("2026-07-14") }),
      task({ id: "t6", percentDone: 0, endDate: new Date("2026-07-20") }),
    ];
    const stats = computeOverviewStats(tasks, NOW);
    expect(stats.upcoming.map((t) => t.id)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
  });
});
