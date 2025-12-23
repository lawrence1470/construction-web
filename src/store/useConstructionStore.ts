'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { GanttFeature, GanttStatus } from '@/components/ui/gantt/types';

// ============================================================================
// TYPES
// ============================================================================

type FeatureId = string;
type GroupName = string;

interface ConstructionState {
  // ========== DOMAIN DATA ==========
  features: GanttFeature[];
  visualRowMap: Record<FeatureId, number>;

  // ========== METADATA ==========
  groups: GroupName[];
  statuses: Record<string, GanttStatus>;

  // ========== ACTIONS ==========
  // Feature CRUD
  addFeature: (feature: GanttFeature) => void;
  updateFeature: (id: FeatureId, updates: Partial<GanttFeature>) => void;
  removeFeature: (id: FeatureId) => void;

  // Feature movement (drag/drop)
  moveFeature: (id: FeatureId, startAt: Date, endAt: Date, targetRow?: number) => void;
  updateVisualRow: (id: FeatureId, rowIndex: number) => void;

  // Batch operations
  updateMultipleFeatures: (updates: Array<{ id: FeatureId; changes: Partial<GanttFeature> }>) => void;
  reorderGroup: (groupName: GroupName, featureIds: FeatureId[]) => void;

  // Initialization
  initializeFeatures: (features: GanttFeature[]) => void;
}

interface ConstructionSelectors {
  // Group-based queries
  getFeaturesByGroup: (groupName: GroupName) => GanttFeature[];
  getAllGroupedFeatures: () => Record<GroupName, GanttFeature[]>;

  // Feature queries
  getFeatureById: (id: FeatureId) => GanttFeature | undefined;
  getFeaturesByStatus: (statusId: string) => GanttFeature[];

  // Visual/layout queries
  getVisualRow: (id: FeatureId) => number | undefined;
  getTotalRows: () => number;
  getFlatFeaturesWithIndex: () => Array<{ feature: GanttFeature; rowIndex: number; group: GroupName }>;
}

// ============================================================================
// DEFAULT DATA
// ============================================================================

const DEFAULT_GROUPS: GroupName[] = [
  'Foundation & Site Work',
  'Structural Work',
  'MEP (Mechanical, Electrical, Plumbing)',
  'Finishing & Inspection',
];

// Define statuses as strongly typed constants
const COMPLETED_STATUS: GanttStatus = { id: 'completed', name: 'Completed', color: '#10b981' };
const IN_PROGRESS_STATUS: GanttStatus = { id: 'in-progress', name: 'In Progress', color: '#3b82f6' };
const PLANNED_STATUS: GanttStatus = { id: 'planned', name: 'Planned', color: '#6b7280' };

const DEFAULT_STATUSES: Record<string, GanttStatus> = {
  completed: COMPLETED_STATUS,
  'in-progress': IN_PROGRESS_STATUS,
  planned: PLANNED_STATUS,
};

// Sample unscheduled issues - shown in sidebar but no timeline bars
const DEFAULT_FEATURES: GanttFeature[] = [
  // Foundation & Site Work
  {
    id: 'task-1',
    name: 'Site Clearing & Grading',
    status: PLANNED_STATUS,
    group: 'Foundation & Site Work',
  },
  {
    id: 'task-2',
    name: 'Foundation Excavation',
    status: PLANNED_STATUS,
    group: 'Foundation & Site Work',
  },
  {
    id: 'task-3',
    name: 'Concrete Pouring',
    status: PLANNED_STATUS,
    group: 'Foundation & Site Work',
  },

  // Structural Work
  {
    id: 'task-4',
    name: 'Steel Frame Erection',
    status: PLANNED_STATUS,
    group: 'Structural Work',
  },
  {
    id: 'task-5',
    name: 'Roof Truss Installation',
    status: PLANNED_STATUS,
    group: 'Structural Work',
  },
  {
    id: 'task-6',
    name: 'Exterior Wall Framing',
    status: PLANNED_STATUS,
    group: 'Structural Work',
  },

  // MEP (Mechanical, Electrical, Plumbing)
  {
    id: 'task-7',
    name: 'Rough Plumbing',
    status: PLANNED_STATUS,
    group: 'MEP (Mechanical, Electrical, Plumbing)',
  },
  {
    id: 'task-8',
    name: 'Electrical Wiring',
    status: PLANNED_STATUS,
    group: 'MEP (Mechanical, Electrical, Plumbing)',
  },
  {
    id: 'task-9',
    name: 'HVAC Installation',
    status: PLANNED_STATUS,
    group: 'MEP (Mechanical, Electrical, Plumbing)',
  },

  // Finishing & Inspection
  {
    id: 'task-10',
    name: 'Drywall Installation',
    status: PLANNED_STATUS,
    group: 'Finishing & Inspection',
  },
  {
    id: 'task-11',
    name: 'Interior Painting',
    status: PLANNED_STATUS,
    group: 'Finishing & Inspection',
  },
  {
    id: 'task-12',
    name: 'Final Inspection',
    status: PLANNED_STATUS,
    group: 'Finishing & Inspection',
  },
];

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useConstructionStore = create<ConstructionState & ConstructionSelectors>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state - populated with sample construction tasks
        features: DEFAULT_FEATURES,
        visualRowMap: {},
        groups: DEFAULT_GROUPS,
        statuses: DEFAULT_STATUSES,

        // ========== ACTIONS ==========

        addFeature: (feature) =>
          set((state) => {
            state.features.push(feature);
          }),

        updateFeature: (id, updates) =>
          set((state) => {
            const feature = state.features.find((f) => f.id === id);
            if (feature) {
              Object.assign(feature, updates);
            }
          }),

        removeFeature: (id) =>
          set((state) => {
            state.features = state.features.filter((f) => f.id !== id);
            delete state.visualRowMap[id];
          }),

        moveFeature: (id, startAt, endAt, targetRow) =>
          set((state) => {
            const feature = state.features.find((f) => f.id === id);
            if (feature) {
              feature.startAt = startAt;
              feature.endAt = endAt;
            }
            if (targetRow !== undefined) {
              state.visualRowMap[id] = targetRow;
            }
          }),

        updateVisualRow: (id, rowIndex) =>
          set((state) => {
            state.visualRowMap[id] = rowIndex;
          }),

        updateMultipleFeatures: (updates) =>
          set((state) => {
            updates.forEach(({ id, changes }) => {
              const feature = state.features.find((f) => f.id === id);
              if (feature) {
                Object.assign(feature, changes);
              }
            });
          }),

        reorderGroup: (groupName, featureIds) =>
          set((state) => {
            const groupFeatures = state.features.filter((f) => f.group === groupName);
            const reordered = featureIds
              .map((id) => groupFeatures.find((f) => f.id === id))
              .filter(Boolean) as GanttFeature[];

            const otherFeatures = state.features.filter((f) => f.group !== groupName);
            state.features = [...otherFeatures, ...reordered];
          }),

        initializeFeatures: (features) =>
          set((state) => {
            state.features = features;
          }),

        // ========== SELECTORS ==========

        getFeaturesByGroup: (groupName) => {
          return get().features.filter((f) => f.group === groupName);
        },

        getAllGroupedFeatures: () => {
          const { features, groups } = get();
          return groups.reduce(
            (acc, groupName) => {
              acc[groupName] = features.filter((f) => f.group === groupName);
              return acc;
            },
            {} as Record<GroupName, GanttFeature[]>
          );
        },

        getFeatureById: (id) => {
          return get().features.find((f) => f.id === id);
        },

        getFeaturesByStatus: (statusId) => {
          return get().features.filter((f) => f.status.id === statusId);
        },

        getVisualRow: (id) => {
          return get().visualRowMap[id];
        },

        getTotalRows: () => {
          return get().features.length;
        },

        getFlatFeaturesWithIndex: () => {
          const { groups } = get();
          const groupedFeatures = get().getAllGroupedFeatures();

          return Object.entries(groupedFeatures).flatMap(
            ([group, groupFeatures], groupIndex) => {
              const previousGroupsFeatures = Object.values(groupedFeatures)
                .slice(0, groupIndex)
                .reduce((sum, g) => sum + g.length, 0);

              return groupFeatures.map((feature, indexInGroup) => ({
                feature,
                rowIndex: previousGroupsFeatures + indexInGroup,
                group,
              }));
            }
          );
        },
      })),
      {
        name: 'construction-storage',
        partialize: (state) => ({
          features: state.features,
          visualRowMap: state.visualRowMap,
        }),
        // Rehydrate dates from localStorage (JSON serializes them as strings)
        onRehydrateStorage: () => (state) => {
          if (state?.features) {
            state.features = state.features.map((feature) => ({
              ...feature,
              // Only convert to Date if value exists (unscheduled issues have no dates)
              startAt: feature.startAt ? new Date(feature.startAt) : undefined,
              endAt: feature.endAt ? new Date(feature.endAt) : undefined,
            }));
          }
        },
      }
    ),
    { name: 'ConstructionStore' }
  )
);

// Export types for external use
export type { ConstructionState, ConstructionSelectors, FeatureId, GroupName };
