'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useConstructionStore } from '../useConstructionStore';
import type { GanttFeature, GanttStatus } from '@/components/ui/gantt/types';

type GroupName = string;

// Return types for hooks
interface GroupedFeaturesWithRows {
  grouped: Record<GroupName, GanttFeature[]>;
  flatList: Array<{ feature: GanttFeature; rowIndex: number; group: GroupName }>;
  totalRows: number;
}

/**
 * Hook to get all grouped features with visual row mapping
 * Select raw state and derive computed values with useMemo to avoid SSR hydration issues
 */
export function useGroupedFeaturesWithRows(): GroupedFeaturesWithRows {
  // Select stable state references only
  const { features, groups } = useConstructionStore(
    useShallow((state) => ({
      features: state.features,
      groups: state.groups,
    }))
  );

  // Derive computed values with useMemo for stable references
  return useMemo(() => {
    // Group features by group name
    const grouped = groups.reduce(
      (acc, groupName) => {
        acc[groupName] = features.filter((f) => f.group === groupName);
        return acc;
      },
      {} as Record<GroupName, GanttFeature[]>
    );

    // Create flat list with row indices
    const flatList = Object.entries(grouped).flatMap(
      ([group, groupFeatures], groupIndex) => {
        const previousGroupsFeatures = Object.values(grouped)
          .slice(0, groupIndex)
          .reduce((sum, g) => sum + g.length, 0);

        return groupFeatures.map((feature, indexInGroup) => ({
          feature,
          rowIndex: previousGroupsFeatures + indexInGroup,
          group,
        }));
      }
    );

    return {
      grouped,
      flatList,
      totalRows: features.length,
    };
  }, [features, groups]);
}

/**
 * Hook to get a single feature by ID
 * Only re-renders when the specific feature changes
 */
export function useFeature(id: string): GanttFeature | undefined {
  return useConstructionStore((state) => state.getFeatureById(id));
}

/**
 * Hook to get features by group name
 */
export function useFeaturesByGroup(groupName: string): GanttFeature[] {
  return useConstructionStore((state) => state.getFeaturesByGroup(groupName));
}

/**
 * Hook to get features by status
 */
export function useFeaturesByStatus(statusId: string): GanttFeature[] {
  return useConstructionStore((state) => state.getFeaturesByStatus(statusId));
}

/**
 * Hook to get available groups
 */
export function useGroups(): GroupName[] {
  return useConstructionStore((state) => state.groups);
}

/**
 * Hook to get available statuses
 */
export function useStatuses(): Record<string, GanttStatus> {
  return useConstructionStore((state) => state.statuses);
}
