'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { addDays, addWeeks } from 'date-fns';
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

// Generate initial features
const createInitialFeatures = (): GanttFeature[] => {
  const today = new Date();
  const completedStatus = COMPLETED_STATUS;
  const inProgressStatus = IN_PROGRESS_STATUS;
  const plannedStatus = PLANNED_STATUS;

  return [
    // Foundation Phase
    {
      id: '1',
      name: 'Site Preparation',
      startAt: today,
      endAt: addDays(today, 7),
      status: completedStatus,
      group: 'Foundation & Site Work',
    },
    {
      id: '2',
      name: 'Excavation',
      startAt: addDays(today, 3),
      endAt: addDays(today, 10),
      status: inProgressStatus,
      group: 'Foundation & Site Work',
    },
    {
      id: '3',
      name: 'Foundation Pour',
      startAt: addDays(today, 11),
      endAt: addDays(today, 14),
      status: plannedStatus,
      group: 'Foundation & Site Work',
    },
    // Structural Phase
    {
      id: '4',
      name: 'Steel Framework',
      startAt: addDays(today, 15),
      endAt: addDays(today, 28),
      status: plannedStatus,
      group: 'Structural Work',
    },
    {
      id: '5',
      name: 'Concrete Floors',
      startAt: addDays(today, 20),
      endAt: addWeeks(today, 4),
      status: plannedStatus,
      group: 'Structural Work',
    },
    // MEP Phase
    {
      id: '6',
      name: 'Electrical Rough-In',
      startAt: addWeeks(today, 4),
      endAt: addWeeks(today, 6),
      status: plannedStatus,
      group: 'MEP (Mechanical, Electrical, Plumbing)',
    },
    {
      id: '7',
      name: 'Plumbing Installation',
      startAt: addWeeks(today, 4),
      endAt: addWeeks(today, 6),
      status: plannedStatus,
      group: 'MEP (Mechanical, Electrical, Plumbing)',
    },
    {
      id: '8',
      name: 'HVAC Installation',
      startAt: addWeeks(today, 5),
      endAt: addWeeks(today, 7),
      status: plannedStatus,
      group: 'MEP (Mechanical, Electrical, Plumbing)',
    },
    // Finishing Phase
    {
      id: '9',
      name: 'Insulation & Drywall',
      startAt: addWeeks(today, 7),
      endAt: addWeeks(today, 9),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
    {
      id: '10',
      name: 'Flooring',
      startAt: addWeeks(today, 9),
      endAt: addWeeks(today, 10),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
    {
      id: '11',
      name: 'Painting',
      startAt: addWeeks(today, 9),
      endAt: addWeeks(today, 11),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
    {
      id: '12',
      name: 'Final Inspections',
      startAt: addWeeks(today, 11),
      endAt: addWeeks(today, 12),
      status: plannedStatus,
      group: 'Finishing & Inspection',
    },
  ];
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useConstructionStore = create<ConstructionState & ConstructionSelectors>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        features: createInitialFeatures(),
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
      }
    ),
    { name: 'ConstructionStore' }
  )
);

// Export types for external use
export type { ConstructionState, ConstructionSelectors, FeatureId, GroupName };
