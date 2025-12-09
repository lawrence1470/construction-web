'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type DropTargetInfo = {
  rowIndex: number;
  width: number;
  offset: number;
} | null;

interface GanttUIState {
  // UI State (not persisted - transient during user interaction)
  dragging: boolean;
  scrollX: number;
  dropTarget: DropTargetInfo;

  // Actions
  setDragging: (dragging: boolean) => void;
  setScrollX: (scrollX: number) => void;
  setDropTarget: (dropTarget: DropTargetInfo) => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useGanttUIStore = create<GanttUIState>()(
  devtools(
    (set) => ({
      // Initial state
      dragging: false,
      scrollX: 0,
      dropTarget: null,

      // Actions
      setDragging: (dragging) => set({ dragging }),
      setScrollX: (scrollX) => set({ scrollX }),
      setDropTarget: (dropTarget) => set({ dropTarget }),
    }),
    { name: 'GanttUIStore' }
  )
);

// ============================================================================
// HOOK-STYLE SELECTORS (for backwards compatibility with existing code)
// These mimic the jotai useAtom return signature: [value, setValue]
// ============================================================================

export const useGanttDragging = (): [boolean, (dragging: boolean) => void] => {
  const dragging = useGanttUIStore((state) => state.dragging);
  const setDragging = useGanttUIStore((state) => state.setDragging);
  return [dragging, setDragging];
};

export const useGanttScrollX = (): [number, (scrollX: number) => void] => {
  const scrollX = useGanttUIStore((state) => state.scrollX);
  const setScrollX = useGanttUIStore((state) => state.setScrollX);
  return [scrollX, setScrollX];
};

export const useGanttDropTarget = (): [DropTargetInfo, (dropTarget: DropTargetInfo) => void] => {
  const dropTarget = useGanttUIStore((state) => state.dropTarget);
  const setDropTarget = useGanttUIStore((state) => state.setDropTarget);
  return [dropTarget, setDropTarget];
};
