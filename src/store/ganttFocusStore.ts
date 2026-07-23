'use client';

import { create } from 'zustand';

/**
 * Carries a "focus this task in the Gantt" intent across the keep-alive project
 * surfaces. The Tree view sets it (then navigates to /gantt); BryntumGanttWrapper
 * consumes it once visible — scrolls the task into view and highlights it.
 *
 * A Zustand store (not a provider) is the codebase pattern for feature-scoped
 * state, and `getState()` lets the Gantt config's onLoadComplete closure read the
 * pending intent without a React subscription (avoids the first-load scroll race).
 */
interface GanttFocusStore {
  /** Task id (DB GanttTask.id) to scroll to + highlight, or null when nothing pending. */
  focusTaskId: string | null;
  /** Bumped on every request so re-requesting the same id re-fires the consumer effect. */
  requestId: number;
  requestFocus: (taskId: string) => void;
  clearFocus: () => void;
}

export const useGanttFocusStore = create<GanttFocusStore>((set) => ({
  focusTaskId: null,
  requestId: 0,
  requestFocus: (taskId) =>
    set((s) => ({ focusTaskId: taskId, requestId: s.requestId + 1 })),
  clearFocus: () => set({ focusTaskId: null }),
}));
