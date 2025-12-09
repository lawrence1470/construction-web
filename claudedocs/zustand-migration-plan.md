# Zustand Migration Plan: Construction Project Management App

## Executive Summary

This plan outlines the migration from React useState/Context to Zustand for centralized state management in the construction project management dashboard. The migration will consolidate scattered state while preserving the existing Jotai-based GanttProvider for internal Gantt functionality.

---

## 1. Current State Analysis

### 1.1 State Distribution

**Dashboard Page State (`dashboard/page.tsx`)**
```typescript
// Global app state - MIGRATE TO ZUSTAND
const [features, setFeatures] = useState<GanttFeature[]>()       // Core data
const [visualRowMap, setVisualRowMap] = useState<Record<string, number>>()  // UI state tied to features

// UI/Modal state - KEEP LOCAL (ephemeral, component-scoped)
const [isFullscreen, setIsFullscreen] = useState(false)
const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
const [selectedDate, setSelectedDate] = useState<Date>()
```

**GanttProvider State (`gantt/context/GanttProvider.tsx`)**
```typescript
// Internal Gantt functionality - KEEP JOTAI (specialized UI state)
const draggingAtom = atom(false)                    // Drag state
const scrollXAtom = atom(0)                         // Scroll position
const dropTargetAtom = atom<DropTargetInfo>(null)   // Drop target indicator
const [timelineData, setTimelineData] = useState()  // Timeline calculation
const [sidebarWidth, setSidebarWidth] = useState()  // Layout measurement
```

### 1.2 Decision Matrix: Zustand vs Local State

| State | Current | Migrate? | Rationale |
|-------|---------|----------|-----------|
| `features` | useState | ✅ Yes | Core app data, needed across views, persistence candidate |
| `visualRowMap` | useState | ✅ Yes | Tightly coupled to features, shared state |
| `isFullscreen` | useState | ❌ No | Ephemeral UI, single component scope |
| `addTaskModalOpen` | useState | ❌ No | Modal control, component-local |
| `selectedDate` | useState | ❌ No | Temporary form state |
| Gantt atoms | Jotai | ❌ No | Specialized drag/scroll state, optimal with Jotai |

**Key Principle**: Migrate persistent/shared data state to Zustand, keep transient UI state local.

---

## 2. Zustand Store Architecture

### 2.1 Core Store Structure

```typescript
// src/store/useConstructionStore.ts

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

  // History (future enhancement)
  undo?: () => void;
  redo?: () => void;
}

// ============================================================================
// SELECTORS (Derived State)
// ============================================================================

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
// STORE IMPLEMENTATION
// ============================================================================

export const useConstructionStore = create<ConstructionState & ConstructionSelectors>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        features: [],
        visualRowMap: {},
        groups: [
          'Foundation & Site Work',
          'Structural Work',
          'MEP (Mechanical, Electrical, Plumbing)',
          'Finishing & Inspection',
        ],
        statuses: {
          'completed': { id: 'completed', name: 'Completed', color: '#10b981' },
          'in-progress': { id: 'in-progress', name: 'In Progress', color: '#3b82f6' },
          'planned': { id: 'planned', name: 'Planned', color: '#6b7280' },
        },

        // ========== ACTIONS ==========

        addFeature: (feature) =>
          set((state) => {
            state.features.push(feature);
          }),

        updateFeature: (id, updates) =>
          set((state) => {
            const index = state.features.findIndex((f) => f.id === id);
            if (index !== -1) {
              state.features[index] = { ...state.features[index], ...updates };
            }
          }),

        removeFeature: (id) =>
          set((state) => {
            state.features = state.features.filter((f) => f.id !== id);
            delete state.visualRowMap[id];
          }),

        moveFeature: (id, startAt, endAt, targetRow) =>
          set((state) => {
            const index = state.features.findIndex((f) => f.id === id);
            if (index !== -1) {
              state.features[index].startAt = startAt;
              state.features[index].endAt = endAt;
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
              const index = state.features.findIndex((f) => f.id === id);
              if (index !== -1) {
                state.features[index] = { ...state.features[index], ...changes };
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
          // Don't persist computed/derived state
        }),
      }
    ),
    { name: 'ConstructionStore' }
  )
);
```

### 2.2 Middleware Justification

**Immer (`zustand/middleware/immer`)**
- **Why**: Simplifies nested state updates with mutable syntax
- **Benefit**: `state.features[0].status.name = 'New'` vs manual spreading
- **Cost**: ~6KB bundle size
- **Decision**: ✅ Use - improves maintainability for complex updates

**DevTools (`zustand/middleware/devtools`)**
- **Why**: Redux DevTools integration for debugging
- **Benefit**: Time-travel debugging, action history, state inspection
- **Cost**: Development-only, tree-shaken in production
- **Decision**: ✅ Use - essential for development

**Persist (`zustand/middleware/persist`)**
- **Why**: Auto-save state to localStorage
- **Benefit**: Preserve user's project state across sessions
- **Cost**: ~2KB, localStorage quota limits
- **Decision**: ✅ Use - core feature for construction project persistence

---

## 3. Selective Subscriptions & Performance

### 3.1 Problem: Unnecessary Re-renders

**Anti-Pattern**: Subscribing to entire store
```typescript
// ❌ BAD: Component re-renders on ANY state change
const { features, addFeature, removeFeature } = useConstructionStore();
```

**Solution**: Selective subscriptions
```typescript
// ✅ GOOD: Only re-renders when features array changes
const features = useConstructionStore((state) => state.features);
const addFeature = useConstructionStore((state) => state.addFeature);
```

### 3.2 Selector Optimization Patterns

**Pattern 1: Direct Property Selection**
```typescript
// Re-renders only when features array reference changes
const features = useConstructionStore((state) => state.features);
```

**Pattern 2: Derived State with Memoization**
```typescript
// Re-renders only when groupedFeatures computation result changes
const groupedFeatures = useConstructionStore(
  (state) => state.getAllGroupedFeatures(),
  shallow // Import from 'zustand/shallow'
);
```

**Pattern 3: Computed Selectors with Parameters**
```typescript
// Get specific group features
const foundationFeatures = useConstructionStore(
  (state) => state.getFeaturesByGroup('Foundation & Site Work')
);
```

**Pattern 4: Action-Only Subscriptions**
```typescript
// Zero re-renders - actions are stable references
const addFeature = useConstructionStore((state) => state.addFeature);
const removeFeature = useConstructionStore((state) => state.removeFeature);
```

### 3.3 Custom Hooks for Complex Selectors

```typescript
// src/store/hooks/useGanttFeatures.ts

import { shallow } from 'zustand/shallow';
import { useConstructionStore } from '../useConstructionStore';

// Hook: Get all grouped features with visual row mapping
export function useGroupedFeaturesWithRows() {
  return useConstructionStore(
    (state) => {
      const grouped = state.getAllGroupedFeatures();
      const flatList = state.getFlatFeaturesWithIndex();
      return { grouped, flatList, totalRows: state.getTotalRows() };
    },
    shallow
  );
}

// Hook: Get feature actions (stable, no re-renders)
export function useFeatureActions() {
  return useConstructionStore(
    (state) => ({
      add: state.addFeature,
      update: state.updateFeature,
      remove: state.removeFeature,
      move: state.moveFeature,
    }),
    shallow
  );
}

// Hook: Get single feature by ID
export function useFeature(id: string) {
  return useConstructionStore((state) => state.getFeatureById(id));
}
```

---

## 4. GanttProvider Context Strategy

### 4.1 Decision: Keep Jotai for GanttProvider ✅

**Rationale**:
- **Specialized State**: Drag/scroll/drop are transient UI state, not app data
- **Performance**: Jotai atoms are optimized for fine-grained reactivity (better than Zustand for this use case)
- **Encapsulation**: Gantt internal state should remain internal to component
- **No Migration Benefit**: Moving to Zustand would increase complexity without performance gain

**Architecture**:
```
┌─────────────────────────────────────────┐
│ Zustand Store                           │
│ - features (GanttFeature[])             │  ← Global app state
│ - visualRowMap                          │
│ - CRUD actions                          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Dashboard Page                          │
│ - Reads from Zustand                    │
│ - Local UI state (modal, fullscreen)   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ GanttProvider (Jotai Context)          │
│ - draggingAtom                          │  ← Internal Gantt state
│ - scrollXAtom                           │
│ - dropTargetAtom                        │
│ - timelineData (local state)           │
└─────────────────────────────────────────┘
```

### 4.2 Integration Pattern

**Dashboard → Gantt Communication**:
```typescript
// Dashboard passes Zustand data as props to Gantt
const features = useConstructionStore((state) => state.features);
const moveFeature = useConstructionStore((state) => state.moveFeature);

<GanttProvider onMove={moveFeature}>
  {features.map(feature => (
    <GanttFeatureItem {...feature} />
  ))}
</GanttProvider>
```

**Gantt → Dashboard Communication**:
```typescript
// Gantt calls callback props (which are Zustand actions)
const { onMove } = useGanttContext(); // From Jotai context
onMove(id, newStart, newEnd); // Triggers Zustand update
```

---

## 5. Migration Steps (Ordered)

### Phase 1: Setup (No Breaking Changes)
**Estimated Time**: 30 minutes

1. **Install Zustand**
   ```bash
   npm install zustand
   ```

2. **Create Store Structure**
   - Create `/src/store/useConstructionStore.ts` with initial implementation
   - Create `/src/store/hooks/` directory for custom hooks
   - Add TypeScript types and interfaces

3. **Create Custom Hooks**
   - `/src/store/hooks/useGanttFeatures.ts`
   - `/src/store/hooks/useFeatureActions.ts`

**Deliverable**: Zustand store exists alongside current useState (not used yet)

---

### Phase 2: Initialize Store (Migration Start)
**Estimated Time**: 45 minutes

4. **Hydrate Store with Initial Data**
   ```typescript
   // In dashboard/page.tsx - ONE TIME initialization
   useEffect(() => {
     const hasData = useConstructionStore.getState().features.length > 0;
     if (!hasData) {
       // Hydrate with initial data
       initialFeatures.forEach(feature => {
         useConstructionStore.getState().addFeature(feature);
       });
     }
   }, []);
   ```

5. **Parallel State Phase** (Temporary)
   - Keep existing `useState` calls
   - Add Zustand hooks alongside
   - Verify data sync
   ```typescript
   // Temporary: Run both systems in parallel
   const [features, setFeatures] = useState(initialFeatures); // OLD
   const zustandFeatures = useConstructionStore(state => state.features); // NEW

   // Compare in dev
   useEffect(() => {
     if (features.length !== zustandFeatures.length) {
       console.warn('State mismatch!');
     }
   }, [features, zustandFeatures]);
   ```

**Deliverable**: Store populated, running in parallel with useState

---

### Phase 3: Migrate Feature Operations
**Estimated Time**: 1 hour

6. **Replace CRUD Handlers**
   ```typescript
   // ❌ OLD
   const handleAddFeature = (feature) => {
     setFeatures(prev => [...prev, feature]);
   };

   // ✅ NEW
   const addFeature = useConstructionStore(state => state.addFeature);
   ```

7. **Update Component References**
   - Change `handleAddFeature` → `addFeature`
   - Change `handleRemoveFeature` → `removeFeature`
   - Update all handler call sites

8. **Migrate `visualRowMap`**
   ```typescript
   // ❌ OLD
   const [visualRowMap, setVisualRowMap] = useState({});

   // ✅ NEW
   const visualRowMap = useConstructionStore(state => state.visualRowMap);
   const updateVisualRow = useConstructionStore(state => state.updateVisualRow);
   ```

**Deliverable**: All feature operations use Zustand

---

### Phase 4: Optimize Selectors
**Estimated Time**: 45 minutes

9. **Replace Derived State Calculations**
   ```typescript
   // ❌ OLD
   const groupedFeatures = useMemo(() => {
     return groupNames.reduce((acc, groupName) => {
       acc[groupName] = features.filter(f => f.group === groupName);
       return acc;
     }, {});
   }, [features]);

   // ✅ NEW
   const groupedFeatures = useConstructionStore(state => state.getAllGroupedFeatures());
   ```

10. **Extract Custom Hooks**
    ```typescript
    // ✅ NEW
    const { grouped, flatList, totalRows } = useGroupedFeaturesWithRows();
    const { add, update, remove, move } = useFeatureActions();
    ```

**Deliverable**: Optimized selectors, reduced re-renders

---

### Phase 5: Cleanup
**Estimated Time**: 30 minutes

11. **Remove Old State**
    - Delete `useState` for `features`
    - Delete `useState` for `visualRowMap`
    - Remove old handler functions
    - Clean up unused imports

12. **Verify Functionality**
    - Test add/edit/delete features
    - Test drag-and-drop movement
    - Test visual row updates
    - Test group filtering

13. **Update Tests** (if applicable)
    - Mock Zustand store in tests
    - Update test utilities

**Deliverable**: Clean codebase with only Zustand state

---

### Phase 6: Enhanced Features (Post-Migration)
**Estimated Time**: 2-3 hours (optional)

14. **Add Undo/Redo**
    ```typescript
    // Store enhancement
    interface HistoryState {
      past: GanttFeature[][];
      present: GanttFeature[];
      future: GanttFeature[][];
    }

    // Middleware
    const undoRedoMiddleware = (config) => (set, get, api) => {
      // Implementation details
    };
    ```

15. **Add Persistence Optimization**
    ```typescript
    // Debounce persistence writes
    const debouncedPersist = debounce(() => {
      useConstructionStore.persist.rehydrate();
    }, 500);
    ```

16. **Add DevTools Integration**
    - Configure action names
    - Add trace points
    - Enable time-travel debugging

**Deliverable**: Advanced features (undo/redo, optimized persistence)

---

## 6. File Organization

### 6.1 Recommended Structure

```
src/
├── store/
│   ├── useConstructionStore.ts         # Main Zustand store
│   ├── hooks/
│   │   ├── index.ts                    # Re-export all hooks
│   │   ├── useGanttFeatures.ts         # Grouped features logic
│   │   ├── useFeatureActions.ts        # Action-only hook
│   │   └── useFeature.ts               # Single feature by ID
│   ├── slices/                         # (Future) Store slices
│   │   ├── featuresSlice.ts
│   │   ├── uiSlice.ts
│   │   └── settingsSlice.ts
│   └── middleware/                     # (Future) Custom middleware
│       └── undoRedo.ts
├── components/
│   └── ui/
│       └── gantt/
│           ├── context/
│           │   ├── GanttProvider.tsx   # Keep Jotai (internal state)
│           │   └── GanttContext.ts
│           └── types/
│               └── core.types.ts
└── app/
    └── dashboard/
        └── page.tsx                     # Uses Zustand hooks
```

### 6.2 Import Patterns

```typescript
// ✅ Preferred: Import from centralized hooks
import { useGroupedFeaturesWithRows, useFeatureActions } from '@/store/hooks';

// ✅ Alternative: Direct store access
import { useConstructionStore } from '@/store/useConstructionStore';

// ❌ Avoid: Importing internal slices (if using slice pattern)
import { featuresSlice } from '@/store/slices/featuresSlice'; // Breaks encapsulation
```

---

## 7. Code Examples for Key Patterns

### 7.1 Dashboard Page (After Migration)

```typescript
// src/app/dashboard/page.tsx

'use client';

import { useConstructionStore } from '@/store/useConstructionStore';
import { useGroupedFeaturesWithRows, useFeatureActions } from '@/store/hooks';

export default function DashboardPage() {
  // ========== ZUSTAND STATE ==========
  const { grouped, flatList, totalRows } = useGroupedFeaturesWithRows();
  const { add, update, remove, move } = useFeatureActions();
  const visualRowMap = useConstructionStore(state => state.visualRowMap);

  // ========== LOCAL UI STATE (unchanged) ==========
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ========== HANDLERS (simplified) ==========
  const handleViewFeature = (id: string) => {
    const feature = useConstructionStore.getState().getFeatureById(id);
    if (feature) {
      alert(`Task: ${feature.name}\nStatus: ${feature.status.name}`);
    }
  };

  const handleAddFeature = (date: Date) => {
    setSelectedDate(date);
    setAddTaskModalOpen(true);
  };

  const handleAddTask = (taskData: NewTaskData) => {
    const newFeature: GanttFeature = {
      id: `task-${Date.now()}`,
      name: taskData.name,
      startAt: taskData.startAt,
      endAt: taskData.endAt,
      status: statusMap[taskData.statusId] ?? plannedStatus,
      group: taskData.group,
    };
    add(newFeature); // Zustand action
  };

  // ========== RENDER ==========
  return (
    <LayoutWrapper>
      <GanttProvider
        onAddItem={handleAddFeature}
        validDropRows={flatList.map(f => f.rowIndex)}
      >
        <GanttTaskColumn
          groupedFeatures={grouped}
          onSelectItem={handleViewFeature}
        />
        <GanttTimeline>
          <GanttFeatureList>
            {Object.entries(grouped).map(([group, groupFeatures]) => (
              <GanttFeatureListGroup key={group}>
                {groupFeatures.map((feature) => (
                  <GanttFeatureItem
                    key={feature.id}
                    onMove={move}
                    visualRow={visualRowMap[feature.id] ?? rowIndex}
                    {...feature}
                  />
                ))}
              </GanttFeatureListGroup>
            ))}
          </GanttFeatureList>
        </GanttTimeline>
      </GanttProvider>

      <AddTaskModal
        open={addTaskModalOpen}
        onOpenChange={setAddTaskModalOpen}
        onAddTask={handleAddTask}
      />
    </LayoutWrapper>
  );
}
```

### 7.2 Custom Hook: useGroupedFeaturesWithRows

```typescript
// src/store/hooks/useGanttFeatures.ts

import { shallow } from 'zustand/shallow';
import { useConstructionStore } from '../useConstructionStore';

export function useGroupedFeaturesWithRows() {
  return useConstructionStore(
    (state) => {
      const grouped = state.getAllGroupedFeatures();
      const flatList = state.getFlatFeaturesWithIndex();
      const totalRows = state.getTotalRows();

      return {
        grouped,
        flatList,
        totalRows,
      };
    },
    shallow // Prevents re-render if derived object shape is same
  );
}
```

### 7.3 Action Hook: useFeatureActions

```typescript
// src/store/hooks/useFeatureActions.ts

import { shallow } from 'zustand/shallow';
import { useConstructionStore } from '../useConstructionStore';

export function useFeatureActions() {
  return useConstructionStore(
    (state) => ({
      add: state.addFeature,
      update: state.updateFeature,
      remove: state.removeFeature,
      move: state.moveFeature,
      updateVisualRow: state.updateVisualRow,
      updateMultiple: state.updateMultipleFeatures,
      reorderGroup: state.reorderGroup,
    }),
    shallow
  );
}
```

### 7.4 Testing Pattern

```typescript
// tests/store/useConstructionStore.test.ts

import { renderHook, act } from '@testing-library/react';
import { useConstructionStore } from '@/store/useConstructionStore';

describe('ConstructionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useConstructionStore.setState({
      features: [],
      visualRowMap: {},
    });
  });

  it('should add feature', () => {
    const { result } = renderHook(() => useConstructionStore());

    act(() => {
      result.current.addFeature({
        id: '1',
        name: 'Test Task',
        startAt: new Date(),
        endAt: new Date(),
        status: { id: 'planned', name: 'Planned', color: '#6b7280' },
        group: 'Foundation & Site Work',
      });
    });

    expect(result.current.features).toHaveLength(1);
    expect(result.current.features[0].name).toBe('Test Task');
  });

  it('should remove feature and clean up visualRowMap', () => {
    const { result } = renderHook(() => useConstructionStore());

    act(() => {
      result.current.addFeature({ id: '1', /* ... */ });
      result.current.updateVisualRow('1', 5);
      result.current.removeFeature('1');
    });

    expect(result.current.features).toHaveLength(0);
    expect(result.current.visualRowMap['1']).toBeUndefined();
  });
});
```

---

## 8. Performance Considerations

### 8.1 Re-render Optimization Checklist

- ✅ **Use selective subscriptions**: Only subscribe to needed state slices
- ✅ **Memoize derived selectors**: Use `shallow` equality for object returns
- ✅ **Separate action hooks**: Actions don't trigger re-renders
- ✅ **Avoid whole-store subscriptions**: Never `useConstructionStore()` without selector
- ✅ **Use `useMemo` for expensive computations**: Even with Zustand selectors

### 8.2 Performance Benchmarks (Expected)

| Metric | Before (useState) | After (Zustand) | Change |
|--------|-------------------|-----------------|---------|
| Feature add operation | ~10ms | ~8ms | -20% |
| Feature list render (100 items) | ~45ms | ~35ms | -22% |
| Drag-and-drop update | ~15ms | ~12ms | -20% |
| Bundle size | 0KB | +13KB (Zustand) | +13KB |

**Bundle Size Breakdown**:
- Zustand core: ~3KB gzipped
- Immer middleware: ~6KB gzipped
- Persist middleware: ~2KB gzipped
- DevTools middleware: 0KB (dev-only)
- **Total**: ~11-13KB gzipped

### 8.3 Memory Optimization

**Persistence Strategy**:
```typescript
// Only persist essential state
partialize: (state) => ({
  features: state.features,
  visualRowMap: state.visualRowMap,
  // Exclude computed/derived state
  // Exclude UI state (fullscreen, modals)
}),

// Set storage quota warning
storage: createJSONStorage(() => localStorage, {
  maxSize: 5 * 1024 * 1024, // 5MB limit
}),
```

---

## 9. Future Enhancements

### 9.1 Undo/Redo Implementation

```typescript
// src/store/middleware/undoRedo.ts

interface HistoryState {
  past: GanttFeature[][];
  present: GanttFeature[];
  future: GanttFeature[][];
}

export const undoRedo = (config) => (set, get, api) => {
  const historyState: HistoryState = {
    past: [],
    present: [],
    future: [],
  };

  return {
    ...config(
      (args) => {
        // Capture state before mutation
        historyState.past.push([...get().features]);
        historyState.future = []; // Clear future on new action
        set(args);
      },
      get,
      api
    ),

    undo: () => {
      if (historyState.past.length === 0) return;

      const previous = historyState.past.pop();
      historyState.future.push([...get().features]);

      set({ features: previous });
    },

    redo: () => {
      if (historyState.future.length === 0) return;

      const next = historyState.future.pop();
      historyState.past.push([...get().features]);

      set({ features: next });
    },
  };
};

// Usage
export const useConstructionStore = create<State>()(
  devtools(
    persist(
      undoRedo(immer((set, get) => ({
        // ... store implementation
      })))
    )
  )
);
```

### 9.2 Real-time Sync (Future)

```typescript
// src/store/middleware/realtimeSync.ts

import { createClient } from '@supabase/supabase-js';

export const realtimeSync = (config) => (set, get, api) => {
  const supabase = createClient(/* ... */);

  // Subscribe to remote changes
  supabase
    .channel('construction-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        set((state) => ({
          features: [...state.features, payload.new],
        }));
      }
      // Handle UPDATE, DELETE...
    })
    .subscribe();

  return config(set, get, api);
};
```

### 9.3 Offline Support

```typescript
// src/store/middleware/offlineQueue.ts

export const offlineQueue = (config) => (set, get, api) => {
  const queue: Array<() => Promise<void>> = [];

  const processQueue = async () => {
    while (queue.length > 0 && navigator.onLine) {
      const action = queue.shift();
      await action?.();
    }
  };

  window.addEventListener('online', processQueue);

  return {
    ...config(set, get, api),
    queueAction: (action) => {
      queue.push(action);
      if (navigator.onLine) processQueue();
    },
  };
};
```

---

## 10. Migration Checklist

### Pre-Migration
- [ ] Install Zustand: `npm install zustand`
- [ ] Review existing state usage patterns
- [ ] Identify local vs global state
- [ ] Create store types and interfaces
- [ ] Set up store structure (`/src/store/`)

### Phase 1: Setup
- [ ] Create `useConstructionStore.ts`
- [ ] Implement base store with types
- [ ] Add middleware (devtools, persist, immer)
- [ ] Create custom hooks (`useGanttFeatures`, `useFeatureActions`)
- [ ] Test store in isolation (unit tests)

### Phase 2: Parallel State
- [ ] Initialize Zustand with existing data
- [ ] Run both useState and Zustand in parallel
- [ ] Verify data sync in dev mode
- [ ] Test CRUD operations work in both systems

### Phase 3: Migration
- [ ] Replace `handleAddFeature` with Zustand action
- [ ] Replace `handleUpdateFeature` with Zustand action
- [ ] Replace `handleRemoveFeature` with Zustand action
- [ ] Replace `handleMoveFeature` with Zustand action
- [ ] Migrate `visualRowMap` state
- [ ] Update all component prop drilling

### Phase 4: Optimization
- [ ] Replace derived state with selectors
- [ ] Extract custom hooks
- [ ] Add `shallow` equality where needed
- [ ] Profile component re-renders
- [ ] Optimize expensive computations

### Phase 5: Cleanup
- [ ] Remove old `useState` declarations
- [ ] Remove old handler functions
- [ ] Clean up unused imports
- [ ] Update TypeScript types
- [ ] Remove temporary parallel state code

### Phase 6: Testing
- [ ] Test feature CRUD operations
- [ ] Test drag-and-drop functionality
- [ ] Test visual row updates
- [ ] Test group filtering
- [ ] Test persistence (reload page)
- [ ] Test DevTools integration
- [ ] Performance testing (before/after)

### Post-Migration (Optional)
- [ ] Implement undo/redo
- [ ] Add debounced persistence
- [ ] Add action middleware logging
- [ ] Integrate with backend API
- [ ] Add real-time sync
- [ ] Add offline support

---

## 11. Risk Mitigation

### 11.1 Potential Issues & Solutions

| Risk | Impact | Mitigation |
|------|--------|------------|
| State desync during parallel phase | HIGH | Comprehensive logging, strict testing |
| Performance regression | MEDIUM | Benchmark before/after, use React DevTools Profiler |
| Bundle size increase | LOW | Monitor with `next build`, lazy-load if needed |
| TypeScript errors | MEDIUM | Incremental migration, thorough type definitions |
| Persistence quota exceeded | LOW | Implement storage limit warnings, selective persistence |

### 11.2 Rollback Plan

**If migration fails**:
1. Git revert to pre-migration commit
2. Or: Keep Zustand store but don't use it (no breaking changes)
3. Or: Feature flag the migration (`ENABLE_ZUSTAND=false`)

```typescript
// Conditional store usage with feature flag
const useStore = process.env.ENABLE_ZUSTAND
  ? useConstructionStore
  : useLocalState; // Fallback to useState
```

---

## 12. Success Metrics

### 12.1 Technical Metrics

- ✅ **Zero useState for features/visualRowMap**: Fully migrated to Zustand
- ✅ **<15ms re-render time**: Feature list render performance
- ✅ **<20KB bundle increase**: Keep Zustand overhead minimal
- ✅ **100% feature parity**: All existing functionality works
- ✅ **<5% performance regression**: Maintain or improve speed

### 12.2 Developer Experience Metrics

- ✅ **Reduced prop drilling**: Actions passed as callbacks, not props
- ✅ **Centralized state**: Single source of truth
- ✅ **DevTools integration**: Time-travel debugging available
- ✅ **Type safety**: Full TypeScript coverage
- ✅ **Testability**: Easy to mock store in tests

---

## 13. Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup | 30 min | Store created, types defined |
| Parallel State | 45 min | Both systems running |
| Migration | 1 hour | Zustand primary, useState removed |
| Optimization | 45 min | Selectors, custom hooks |
| Cleanup | 30 min | Old code removed |
| Testing | 1 hour | Full QA pass |
| **Total** | **4-5 hours** | **Production-ready Zustand migration** |

**Post-migration enhancements** (undo/redo, offline): 2-3 additional hours

---

## 14. Conclusion & Next Steps

### 14.1 Recommendation

✅ **Proceed with migration** - Benefits outweigh costs:

**Pros**:
- Centralized state management
- Better performance (selective subscriptions)
- DevTools integration
- Persistence out-of-box
- Future-proof (undo/redo, real-time sync)

**Cons**:
- ~13KB bundle size increase
- 4-5 hours migration effort
- Learning curve for team

### 14.2 Immediate Next Steps

1. **Get approval** from stakeholders
2. **Create feature branch**: `git checkout -b feature/zustand-migration`
3. **Install dependencies**: `npm install zustand`
4. **Start Phase 1**: Create store structure
5. **Follow migration plan** sequentially

### 14.3 Alternative: Keep Current Architecture

If migration is deprioritized:
- Current useState + Jotai works fine
- Performance is acceptable
- No immediate scalability concerns
- Consider revisiting when:
  - Need undo/redo
  - Need persistence
  - Need real-time sync
  - Team size grows (prop drilling pain)

---

## Appendix A: References

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Immer Middleware](https://docs.pmnd.rs/zustand/integrations/immer-middleware)
- [Persist Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)
- [DevTools Middleware](https://docs.pmnd.rs/zustand/integrations/redux-devtools)
- [React 19 + Zustand Best Practices](https://github.com/pmndrs/zustand/discussions/2200)

## Appendix B: Store API Quick Reference

```typescript
// Read state
const features = useConstructionStore(state => state.features);

// Call action
const addFeature = useConstructionStore(state => state.addFeature);
addFeature(newFeature);

// Outside React components
const state = useConstructionStore.getState();
state.addFeature(newFeature);

// Subscribe to changes
const unsub = useConstructionStore.subscribe(
  state => state.features,
  (features) => console.log('Features changed:', features)
);
unsub(); // Cleanup

// Reset store
useConstructionStore.setState({ features: [], visualRowMap: {} });
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-09
**Author**: Claude (Frontend Architect)
**Status**: Ready for Implementation
