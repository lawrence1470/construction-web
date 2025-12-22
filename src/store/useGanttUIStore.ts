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

// Drag source tracking for cross-zone drag-and-drop
export type DragSource = 'staging' | 'timeline' | null;

interface GanttUIState {
  // UI State (not persisted - transient during user interaction)
  dragging: boolean;
  scrollX: number;
  scrollY: number;
  dropTarget: DropTargetInfo;
  dragSource: DragSource;
  draggedItemId: string | null;

  // Actions
  setDragging: (dragging: boolean) => void;
  setScrollX: (scrollX: number) => void;
  setScrollY: (scrollY: number) => void;
  setDropTarget: (dropTarget: DropTargetInfo) => void;
  startDrag: (source: DragSource, itemId: string) => void;
  endDrag: () => void;
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
      scrollY: 0,
      dropTarget: null,
      dragSource: null,
      draggedItemId: null,

      // Actions
      setDragging: (dragging) => set({ dragging }),
      setScrollX: (scrollX) => set({ scrollX }),
      setScrollY: (scrollY) => set({ scrollY }),
      setDropTarget: (dropTarget) => set({ dropTarget }),
      startDrag: (source, itemId) =>
        set({ dragging: true, dragSource: source, draggedItemId: itemId }),
      endDrag: () =>
        set({ dragging: false, dragSource: null, draggedItemId: null }),
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

export const useGanttScrollY = (): [number, (scrollY: number) => void] => {
  const scrollY = useGanttUIStore((state) => state.scrollY);
  const setScrollY = useGanttUIStore((state) => state.setScrollY);
  return [scrollY, setScrollY];
};

export const useGanttDragSource = (): DragSource => {
  return useGanttUIStore((state) => state.dragSource);
};

export const useGanttDraggedItemId = (): string | null => {
  return useGanttUIStore((state) => state.draggedItemId);
};

export const useGanttDragActions = () => {
  const startDrag = useGanttUIStore((state) => state.startDrag);
  const endDrag = useGanttUIStore((state) => state.endDrag);
  return { startDrag, endDrag };
};
