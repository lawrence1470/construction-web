# Gantt Chart: Multiple Bars Per Row - Data Model Analysis

## Current Architecture Overview

### 1. Data Model Structure

**Store Location:** `src/store/useConstructionStore.ts`

```
GanttFeature {
  id: string
  name: string
  status: GanttStatus
  group: string              ← Key field: determines which group
  startAt?: Date
  endAt?: Date
  coverImage?: string
  progress?: number
}

ConstructionState {
  features: GanttFeature[]   ← Flat array of ALL features
  visualRowMap: Record<FeatureId, number>  ← Visual row overrides
  groups: GroupName[]
  statuses: Record<string, GanttStatus>
}
```

**Key Insight:** Features are stored in a **flat array**. The `group` field determines which semantic group they belong to, but there's NO concept of "which row" in the data model itself.

### 2. Row Calculation System

**Hook Location:** `src/store/hooks/useGanttFeatures.ts`

The `useGroupedFeaturesWithRows()` hook computes row indices:

```typescript
// Step 1: Group features by their `group` field
grouped = {
  'Foundation & Site Work': [task-1, task-2, task-3],
  'Structural Work': [task-4, task-5, task-6],
  'MEP (Mechanical, Electrical, Plumbing)': [task-7, task-8, task-9],
  'Finishing & Inspection': [task-10, task-11, task-12]
}

// Step 2: Calculate row indices
// Each feature gets a unique rowIndex based on its position in the flat sequence
// Row 0: task-1 (index 0 in group 0)
// Row 1: task-2 (index 1 in group 0)
// Row 2: task-3 (index 2 in group 0)
// Row 3: task-4 (index 0 in group 1)
// Row 4: task-5 (index 1 in group 1)
// ... etc

flatList = [
  { feature: task-1, rowIndex: 0, group: 'Foundation & Site Work' },
  { feature: task-2, rowIndex: 1, group: 'Foundation & Site Work' },
  { feature: task-3, rowIndex: 2, group: 'Foundation & Site Work' },
  { feature: task-4, rowIndex: 3, group: 'Structural Work' },
  { feature: task-5, rowIndex: 4, group: 'Structural Work' },
  ...
]
```

**Critical Finding:** Row indices are calculated, NOT stored. Each feature ALWAYS gets assigned a unique row.

### 3. Rendering Pipeline

**Location:** `src/app/dashboard/page.tsx`

```typescript
// Dashboard renders features per group
{Object.entries(groupedFeatures).map(([group, groupFeatures]) => {
  return (
    <GanttFeatureListGroup key={group}>
      {groupFeatures.map((feature, indexInGroup) => {
        const rowIndex = groupStartRow + indexInGroup;  ← Unique row per feature
        
        return (
          <GanttFeatureRow
            rowIndex={rowIndex}
            visualRow={visualRowMap[feature.id] ?? rowIndex}
            {...feature}
          />
        );
      })}
    </GanttFeatureListGroup>
  );
})}
```

Each feature is rendered as a `GanttFeatureRow` component, which renders:
- A sidebar item in `GanttTaskColumn`
- A timeline bar in the grid at position `visualRow`

### 4. Visual Row Mapping

**Field:** `visualRowMap: Record<FeatureId, number>`

This optional override map allows a feature to render at a different row than its natural position:

```typescript
visualRowMap = {
  'task-1': 0,      ← render at row 0
  'task-2': 1,      ← render at row 1
  'task-3': 0,      ← OVERRIDE: render at row 0 (same as task-1)
}
```

**Key Point:** This enables multiple bars on the same row, but the rendering logic doesn't currently take advantage of it. Each feature still assumes it gets its own visual row.

### 5. Drop Handler Logic

**Location:** `src/app/dashboard/page.tsx` - `handleStagedItemDrop()`

Current behavior:
```typescript
const handleStagedItemDrop = useCallback(
  (stagedTask: StagedTask, startAt: Date, endAt: Date, targetRow: number) => {
    // Find EXISTING feature at targetRow
    const targetFeatureEntry = allFeaturesWithIndex.find((f) => f.rowIndex === targetRow);

    if (targetFeatureEntry) {
      // UPDATE the existing feature (replace with staged data)
      updateFeature(targetFeatureEntry.feature.id, {
        startAt,
        endAt,
        name: stagedTask.name,
      });
      removeStagedTask(stagedTask.id);
    }
  },
  [allFeaturesWithIndex, updateFeature, removeStagedTask]
);
```

**Problem:** This REPLACES the existing feature. To support multiple bars, we need to CREATE A NEW feature instead.

---

## Current Limitations

### 1. Rendering Assumes One Bar Per Row
- `GanttFeatureRow` renders a single timeline bar per feature
- The visual row calculation doesn't support stacking multiple bars
- CSS positioning uses `position: absolute` with `top: rowIndex * rowHeight`

### 2. Row Index Calculation is One-to-One
- Each feature gets exactly one row index
- `useGroupedFeaturesWithRows()` creates unique row mappings
- No concept of "multiple features in one visual row"

### 3. Drop Handler Replaces Instead of Adding
- `handleStagedItemDrop()` finds the target row and UPDATES the existing feature
- It should instead CREATE A NEW FEATURE in the same group

### 4. Sidebar Rendering Assumes One Item Per Row
- The task sidebar (`GanttTaskColumn`) renders one item per feature
- Multiple bars on one row would need multiple items in the sidebar
- Current structure doesn't support this hierarchy

---

## What Needs to Change

### Option A: Stack Multiple Bars on Same Visual Row (Recommended)

**Data Model Changes:**
- No changes needed to `GanttFeature` or the features array
- The `visualRowMap` already supports this via override

**Rendering Changes:**
- Modify `GanttFeatureItem` to support Y-offset when multiple bars occupy same row
- Calculate "bar index within row" (0, 1, 2, etc.)
- Apply vertical stacking CSS (e.g., `y-offset = barIndexInRow * barHeight`)

**Drop Logic Changes:**
- `handleStagedItemDrop()` should:
  1. Find all features in the target group
  2. Create NEW feature with same group
  3. Set `visualRowMap[newFeatureId] = targetRow`
  4. Calculate bar stacking position based on how many other bars share that row

**Sidebar Changes:**
- Keep one item per feature (current behavior)
- Visual grouping in sidebar can stay as-is
- Timeline bars stack vertically on the same row

### Option B: Infer Row from Group Position Only

**Data Model Changes:**
- Remove `visualRowMap` entirely
- Each feature in a group gets stacked on the same visual row
- Row index = index of group in groups array
- Multiple features per group = multiple bars on that row

**Rendering Changes:**
- Calculate "bar index within group" for each feature
- Stack bars vertically: `y-offset = barIndexInGroup * barHeight`

**Drop Logic Changes:**
- Much simpler: just add feature to the group

**Sidebar Changes:**
- Sidebar would show entire group as one collapsible section
- Expand to show all bars within that group

---

## Recommended Solution: **Option A (Stack Bars with visualRowMap)**

### Why Option A:
1. ✅ Minimal data model changes (uses existing `visualRowMap`)
2. ✅ Maintains current row calculation system
3. ✅ Flexible: supports both "one bar per row" and "multiple bars per row"
4. ✅ Backward compatible with existing features
5. ✅ Sidebar can stay mostly unchanged

### Implementation Steps:

#### Step 1: Update Drop Handler
```typescript
// Instead of updating existing feature:
handleStagedItemDrop = (stagedTask, startAt, endAt, targetRow) => {
  const targetFeatureEntry = allFeaturesWithIndex.find(f => f.rowIndex === targetRow);
  
  if (targetFeatureEntry) {
    // Create NEW feature in same group
    const newFeature = {
      id: `task-${Date.now()}`,
      name: stagedTask.name,
      startAt,
      endAt,
      status: stagedTask.status,
      group: targetFeatureEntry.group,  // Same group!
    };
    
    addFeature(newFeature);
    // Don't remove staged task - it's already consumed
  }
};
```

#### Step 2: Update GanttFeatureItem Rendering
Modify `src/components/ui/gantt/components/GanttFeatureItem.tsx`:
- Calculate which features share the same visual row
- Determine "bar index within row" for each feature
- Apply Y-offset stacking via CSS/Framer Motion
- Reduce bar height if multiple bars per row (optional)

#### Step 3: Update Row Grid
Modify `GanttRowGrid` to account for stacked bars:
- Each visual row spans the space, but multiple bars can occupy it
- Hover effects should work for all bars in the row

#### Step 4: Update Sidebar
No major changes needed - keep current structure where each feature is its own sidebar item grouped by category.

---

## Data Flow Example

### Current (Single Bar Per Row):
```
Staged Drop: "New #1001" → Row 1
  ↓
handleStagedItemDrop(stageTask, dates, targetRow=1)
  ↓
Find feature at row 1 → "Foundation Excavation" 
  ↓
UPDATE "Foundation Excavation" with new dates/name
  ↓
Result: "New #1001" replaces "Foundation Excavation"
```

### Proposed (Multiple Bars Per Row):
```
Staged Drop: "New #1001" → Row 1
  ↓
handleStagedItemDrop(stagedTask, dates, targetRow=1)
  ↓
Find feature at row 1 → "Foundation Excavation"
  ↓
Get its group → "Foundation & Site Work"
  ↓
CREATE NEW feature in "Foundation & Site Work" group
  ↓
Result: Both "Foundation Excavation" AND "New #1001" render on row 1
```

---

## Summary of Required Changes

| Component | File | Change |
|-----------|------|--------|
| **Drop Handler** | `src/app/dashboard/page.tsx` | Create new feature instead of updating existing |
| **Feature Rendering** | `src/components/ui/gantt/components/GanttFeatureItem.tsx` | Add Y-offset stacking for multiple bars per row |
| **Row Calculation** | `src/store/hooks/useGanttFeatures.ts` | No changes (current system already supports this) |
| **Data Model** | `src/store/useConstructionStore.ts` | No changes (visualRowMap already exists) |
| **Sidebar** | `src/components/gantt/GanttTaskColumn.tsx` | Optional: improve visual grouping |

---

## Key Architectural Insights

1. **visualRowMap is the key enabler** - It already allows multiple features to share a visual row
2. **Row calculation is independent** - rowIndex is computed, not stored, so it's flexible
3. **Drop handler is the linchpin** - It's the only place that decides between "update" vs "create"
4. **Rendering needs stacking logic** - The UI components need Y-offset calculations for multiple bars per row
5. **No database changes needed** - All changes are in the client-side logic and rendering

The architecture is actually well-designed for this feature - it just needs the drop handler and rendering logic updated to take advantage of it.
