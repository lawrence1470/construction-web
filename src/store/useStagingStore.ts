// Staging store for Gantt chart task staging zone
// Manages ephemeral staged tasks before they're dropped into the main timeline

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { addDays } from 'date-fns';
import type { GanttStatus } from '@/components/ui/gantt/types';

export interface StagedTask {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
}

interface StagingState {
  stagedTasks: StagedTask[];

  // Actions
  addStagedTask: (startAt: Date, status: GanttStatus) => string;
  removeStagedTask: (id: string) => void;
  updateStagedTask: (id: string, updates: Partial<Omit<StagedTask, 'id'>>) => void;
  clearAllStagedTasks: () => void;
}

export const useStagingStore = create<StagingState>()(
  devtools(
    (set, get) => ({
      stagedTasks: [],

      addStagedTask: (startAt: Date, status: GanttStatus) => {
        const id = `staged-${Date.now()}`;
        const newTask: StagedTask = {
          id,
          name: 'New Task',
          startAt,
          endAt: addDays(startAt, 7), // Default 7-day duration
          status,
        };

        set(
          (state) => ({
            stagedTasks: [...state.stagedTasks, newTask],
          }),
          undefined,
          'addStagedTask'
        );

        return id;
      },

      removeStagedTask: (id: string) => {
        set(
          (state) => ({
            stagedTasks: state.stagedTasks.filter((task) => task.id !== id),
          }),
          undefined,
          'removeStagedTask'
        );
      },

      updateStagedTask: (id: string, updates: Partial<Omit<StagedTask, 'id'>>) => {
        set(
          (state) => ({
            stagedTasks: state.stagedTasks.map((task) =>
              task.id === id ? { ...task, ...updates } : task
            ),
          }),
          undefined,
          'updateStagedTask'
        );
      },

      clearAllStagedTasks: () => {
        set({ stagedTasks: [] }, undefined, 'clearAllStagedTasks');
      },
    }),
    { name: 'staging-store' }
  )
);

// Selector hooks for optimized re-renders
export const useStagedTasks = () => useStagingStore((state) => state.stagedTasks);

// Actions are stable references from the store, so we can access them directly
// This avoids the infinite loop caused by returning a new object from a selector
export const useStagingActions = () => {
  const store = useStagingStore.getState();
  return {
    addStagedTask: store.addStagedTask,
    removeStagedTask: store.removeStagedTask,
    updateStagedTask: store.updateStagedTask,
    clearAllStagedTasks: store.clearAllStagedTasks,
  };
};
