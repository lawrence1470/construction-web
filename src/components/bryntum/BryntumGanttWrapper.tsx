'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { BryntumGantt } from '@bryntum/gantt-react';
import '@bryntum/gantt/gantt.css';
import { Box } from '@mui/material';
import { api } from '@/trpc/react';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { canManageProjects } from '@/lib/permissions';
import { createGanttConfig } from './config/ganttConfig';
import GanttToolbar from './components/GanttToolbar';
import ProjectStartCard from './components/ProjectStartCard';
import ColumnPickerPopover, { TOGGLEABLE_COLUMNS, type ColumnId } from './components/ColumnPickerPopover';
import { TaskDetailsPopover } from './components/TaskDetailsPopover';
import TaskInfoDialog from './components/TaskInfoDialog';
import TaskLinkingBar from './components/TaskLinkingBar';
import { useBryntumThemeAssets } from './hooks/useBryntumThemeAssets';
import { useTaskPopover } from './hooks/useTaskPopover';
import { useTaskLinking } from './hooks/useTaskLinking';
import { useGanttControls } from './hooks/useGanttControls';
import { reconcileSyncPack } from './utils/reconcileSyncPack';
import type { BryntumTaskRecord, BryntumGanttInstance, TaskClickEventPayload } from './types';
import { IBeamLoader } from '@/components/ui/IBeamLoader';

const WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-card)',
  overflow: 'clip',
  transition: 'box-shadow 0.28s ease',
};

// Edit mode makes the whole card "pop" — an accent ring + soft elevation so it
// reads as the active, mutable surface (Direction 1 / Option A+C). Uses
// box-shadow (not border) so toggling causes no layout shift. The accent ring
// flips to near-white in dark mode via --accent-primary.
const EDITING_CARD_STYLE: CSSProperties = {
  boxShadow:
    '0 0 0 1.5px var(--accent-primary), 0 16px 40px rgba(43,45,66,0.18), 0 4px 14px rgba(43,45,66,0.10)',
};

const GANTT_CONTENT_STYLE: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'clip',
};

const STALE_THRESHOLD_MS = 60_000; // 60 seconds

// Pin the locked sub-grid to exactly contain its visible columns. Two reasons:
//  (1) hiding a column should give the freed space to the timeline, and
//  (2) resizing a column (drag or header double-click auto-fit) should
//      shrink/grow the sub-grid to match, so header, body, and timeline stay
//      aligned with no dead gap after the resized column.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function syncLockedSubGridWidth(gantt: any) {
  if (!gantt) return;
  let lockedWidth = 0;
  for (const col of TOGGLEABLE_COLUMNS) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const column = gantt.columns.getById(col.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!column || column.hidden) continue;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    lockedWidth += (column.width as number) ?? (column.minWidth as number) ?? 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (lockedWidth > 0 && gantt.subGrids.locked.width !== lockedWidth) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    gantt.subGrids.locked.width = lockedWidth;
  }
}

// Land the initial viewport on actual content. The config's static time window
// opens "3 months back" from today, which paints an empty canvas whenever the
// whole plan lives in the future or the past. Centers today when the plan
// spans it, otherwise the earliest scheduled task. scrollToDate is the
// proven-safe scroll path in this codebase (scrollTaskIntoView is the one that
// corrupts the time-axis header — see handleScrollToToday in useGanttControls).
//
// Self-verifying: during startup Bryntum's infinite-scroll axis recentering
// can silently undo an early scroll, and exactly when varies run to run. So
// after each attempt we check whether the target date actually ended up in
// the visible range and retry (bounded) if not.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scrollGanttToFirstContent(gantt: any, attempt = 0) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!gantt || gantt.isDestroyed) return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
  const records: Array<{ startDate?: unknown; endDate?: unknown }> = gantt.taskStore?.records ?? [];
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;
  for (const record of records) {
    if (record.startDate instanceof Date && (!minStart || record.startDate < minStart)) minStart = record.startDate;
    if (record.endDate instanceof Date && (!maxEnd || record.endDate > maxEnd)) maxEnd = record.endDate;
  }
  const retry = () => {
    if (attempt < 5) setTimeout(() => scrollGanttToFirstContent(gantt, attempt + 1), 300);
  };
  if (!minStart) {
    // Store not populated yet (or no scheduled tasks) — retry a few times,
    // then leave the default window alone.
    retry();
    return;
  }
  const now = new Date();
  const target = maxEnd && now >= minStart && now <= maxEnd ? now : minStart;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  gantt.scrollToDate?.(target, { block: 'center' });
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (gantt.isDestroyed) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const visible: { startDate?: Date; endDate?: Date } | undefined = gantt.visibleDateRange;
    const landed =
      visible?.startDate instanceof Date &&
      visible?.endDate instanceof Date &&
      target >= visible.startDate &&
      target <= visible.endDate;
    if (!landed) retry();
  }, 250);
}

interface BryntumGanttWrapperProps {
  projectId?: string;
  isVisible?: boolean;
}

export default function BryntumGanttWrapper(props: BryntumGanttWrapperProps) {
  const ganttControls = useGanttControls();

  return <BryntumGanttCore {...props} ganttControls={ganttControls} />;
}

function BryntumGanttCore({ projectId, isVisible = true, ganttControls }: BryntumGanttWrapperProps & { ganttControls: ReturnType<typeof useGanttControls> }) {
  const {
    ganttRef,
    getGanttInstance,
    handleAddTask,
    handleIndent,
    handleOutdent,
    handleZoomIn,
    handleZoomOut,
    handleZoomToFit,
    handleShiftPrevious,
    handleShiftNext,
    handleScrollToToday,
    handlePresetChange,
    handleToggleCollapseAll,
    allCollapsed,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    enableStm,
  } = ganttControls;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [taskInfoRecord, setTaskInfoRecord] = useState<BryntumTaskRecord | null>(null);

  const columnStorageKey = projectId ? `bryntum:columns:visible:${projectId}` : null;
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnId, boolean>>(() => {
    // Start/End default hidden — the bars already show the dates, and the grid
    // otherwise eats ~45% of the width. The column picker brings them back;
    // a stored preference (spread below) always wins over these defaults.
    const defaults: Record<ColumnId, boolean> = { name: true, startDate: false, endDate: false, duration: true };
    if (typeof window === 'undefined' || !columnStorageKey) return defaults;
    try {
      const raw = window.localStorage.getItem(columnStorageKey);
      if (!raw) return defaults;
      const stored = JSON.parse(raw) as Partial<Record<ColumnId, boolean>>;
      // Force name = true after the spread so a corrupted/tampered value can't hide the row identifier.
      return { ...defaults, ...stored, name: true };
    } catch {
      return defaults;
    }
  });

  const handleColumnToggle = useCallback(
    (id: ColumnId, visible: boolean) => {
      setColumnVisibility((prev) => {
        const next = { ...prev, [id]: visible };
        if (columnStorageKey && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(columnStorageKey, JSON.stringify(next));
          } catch {
            /* localStorage unavailable (private mode / quota) — non-fatal */
          }
        }
        return next;
      });
    },
    [columnStorageKey],
  );

  // Lock mode: chart is locked by default; admin-level users click the lock
  // toggle in the toolbar to enter edit mode.
  const { currentOrg } = useOrgFromUrl();
  // Gantt editing is gated on the caller's effective PROJECT role, not their org
  // role — a user promoted to admin on this project must be able to edit even if
  // their org role is 'member'. projectMember.myRole resolves the authoritative
  // project role (and auto-creates a row for org owners/admins). Fall back to the
  // org role until it loads so org owners/admins don't flash a locked chart.
  const { data: myProjectRole } = api.projectMember.myRole.useQuery(
    { projectId: projectId ?? '' },
    { enabled: !!projectId, retry: false },
  );
  const canEditChart = canManageProjects(myProjectRole?.role ?? currentOrg?.role ?? '');
  const [isEditMode, setIsEditMode] = useState(false);
  const editingUnlocked = canEditChart && isEditMode;
  // True while the Shift key is held (tracked only when editing is unlocked) so
  // the toolbar's Link button can light up during a Shift-click link gesture.
  const [shiftHeld, setShiftHeld] = useState(false);

  // Bryntum's CrudManager "added"/"removed" bags can drop records when the
  // scheduling engine commits state between cycles. We shadow-track IDs from
  // the reliable taskStore events so `onBeforeSync` can reconcile the outgoing
  // pack. `lastSync*` captures what was sent so we only clear those IDs on a
  // successful sync (new changes during the request stay).
  const pendingAddedIdsRef = useRef<Set<string>>(new Set());
  const pendingRemovedIdsRef = useRef<Set<string>>(new Set());
  const lastSyncAddedIdsRef = useRef<Set<string>>(new Set());
  const lastSyncRemovedIdsRef = useRef<Set<string>>(new Set());
  const sidebarInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { selectedTask, popoverPlacement, handleTaskClick, closeTaskPopover, isTaskPopoverOpen } =
    useTaskPopover();

  const {
    linkMode,
    setLinkMode,
    toggleLinkMode,
    selection: linkSelection,
    handleLinkClick,
    startLinkingFrom,
    clearSelection: clearLinkSelection,
    commitLinks,
  } = useTaskLinking(getGanttInstance as unknown as () => BryntumGanttInstance | null);

  // Visual "linking is happening" state for the toolbar Link button: the
  // persistent Link-mode toggle, a held Shift key, or a chain already in
  // progress (users release Shift after the first pick but keep linking).
  const linkActive = linkMode || shiftHeld || linkSelection.length > 0;

  useBryntumThemeAssets();

  // Sync Bryntum's built-in readOnly flag with our edit-mode state.
  // This disables cell editing, task drag, task resize, and dependency creation.
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt) return;
    gantt.readOnly = !editingUnlocked;
  }, [isLoading, getGanttInstance, editingUnlocked]);

  // `column.hidden = true` only redistributes width inside the locked sub-grid;
  // syncLockedSubGridWidth then sizes the sub-grid so the timeline absorbs the
  // freed space.
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt) return;

    for (const col of TOGGLEABLE_COLUMNS) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const column = gantt.columns.getById(col.id);
      if (!column) continue;
      const nextHidden = !(columnVisibility[col.id] ?? true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (column.hidden !== nextHidden) column.hidden = nextHidden;
    }
    syncLockedSubGridWidth(gantt);
  }, [isLoading, getGanttInstance, columnVisibility]);

  // Keep the locked sub-grid sized to its columns when the user resizes a
  // column — either by dragging the header divider or double-clicking it to
  // auto-fit. Bryntum reports both through the `change` event on the columns
  // store. Without this, the resize updates the column width but not the
  // sub-grid, so the header and body misalign and dead space appears before the
  // next column.
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt) return;
    const onColumnChange = ({ changes }: { changes?: Record<string, unknown> }) => {
      // Only react to width changes; `hidden` is handled by the effect above.
      if (changes && !('width' in changes)) return;
      syncLockedSubGridWidth(gantt);
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    gantt.columns.on('change', onColumnChange);
    return () => {
      // `columns` is undefined once the gantt is destroyed (unmount / hot-reload
      // remount), so optional-chain like the other listener cleanups below —
      // an unguarded .un() here threw into the ErrorBoundary and reset the chart.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      gantt.columns?.un('change', onColumnChange);
    };
  }, [isLoading, getGanttInstance]);

  // After data loads, run commitAsync to settle the scheduling engine, then
  // enable STM so undo/redo starts tracking from this clean state.
  // Do NOT call scrollToDate here — it corrupts the time axis header.
  const stmCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    void gantt.project.commitAsync().then(() => {
      stmCleanupRef.current = enableStm();
    });
    return () => {
      stmCleanupRef.current?.();
      stmCleanupRef.current = null;
    };
  }, [isLoading, getGanttInstance, enableStm]);

  // Invalidate tRPC cache when Bryntum syncs so sibling components (e.g. file tree) refetch
  const utils = api.useUtils();
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt?.project) return;

    // Intercept the sync POST itself so we capture the raw response BEFORE
    // Bryntum's afterSyncAttempt iterates it. afterSyncAttempt can throw
    // ("Cannot set properties of undefined (setting 'isBeingMaterialized')")
    // and when it does, our `sync` event listener never fires — so the only
    // way to see what the server returned is to tee the response here.
    //
    // Dev-only: this reassigns `window.fetch` globally for the page lifetime
    // and we don't want production traffic paying the wrapper cost (or risking
    // collisions with other fetch interceptors across HMR cycles). The whole
    // block is dead-code-eliminated in production builds.
    const fetchDebugEnabled = process.env.NODE_ENV !== 'production';
    const originalFetch = window.fetch;
    const wrappedFetch: typeof window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const isGanttSync = typeof url === 'string' && url.includes('/api/gantt/sync');
      if (!isGanttSync) return originalFetch(input, init);

      // Log the outgoing request body too — confirms what really hit the wire.
      if (init?.body) {
        try {
          const parsed = JSON.parse(String(init.body)) as { tasks?: { added?: Array<Record<string, unknown>> } };
          console.log('[Gantt:fetch] POST /api/gantt/sync → outgoing body', {
            addedCount: parsed.tasks?.added?.length ?? 0,
            added: (parsed.tasks?.added ?? []).map((t) => ({
              id: t.id,
              $PhantomId: t.$PhantomId,
              parentId: t.parentId,
              name: t.name,
            })),
          });
        } catch {
          /* not JSON */
        }
      }

      const response = await originalFetch(input, init);
      // Clone so Bryntum can still consume the body unmodified.
      const clone = response.clone();
      void clone.text().then((text) => {
        try {
          const json = JSON.parse(text) as {
            success?: boolean;
            message?: string;
            tasks?: { rows?: Array<{ id?: string; $PhantomId?: string }> };
          };
          console.log('[Gantt:fetch] /api/gantt/sync → raw response (clone)', {
            httpStatus: response.status,
            success: json.success,
            message: json.message,
            taskRowsCount: json.tasks?.rows?.length ?? 0,
            rows: json.tasks?.rows,
          });
        } catch {
          console.warn('[Gantt:fetch] /api/gantt/sync → non-JSON response', { httpStatus: response.status, text });
        }
      });
      return response;
    };
    if (fetchDebugEnabled) {
      window.fetch = wrappedFetch;
    }

    const onSync = (event: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (event as any)?.response;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const sentIds = Array.from(lastSyncAddedIdsRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseRows: Array<{ id?: string; $PhantomId?: string }> = (response?.tasks?.rows ?? []) as any[];
      const responsePhantomIds = new Set(
        responseRows.map((r) => r?.$PhantomId).filter(Boolean) as string[],
      );
      const sentButNotReturned = sentIds.filter((id) => !responsePhantomIds.has(id));

      // Inspect each sent record AFTER the response was applied — if it's still
      // phantom, Bryntum failed to materialize the phantom→real id swap and
      // the row will stay stuck (snackbar "Saving task — try again in a moment").
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const stillPhantom = sentIds.map((id) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const r = gantt.project.taskStore.getById(id) as
          | { id?: string; isPhantom?: boolean; parentId?: string | null; parent?: { id?: string } | null; name?: string }
          | null;
        return r
          ? {
              sentId: id,
              currentId: r.id,
              isPhantom: r.isPhantom,
              parentId: r.parentId ?? r.parent?.id ?? null,
              name: r.name,
            }
          : { sentId: id, lookup: 'null — record gone' };
      });

      console.log('[Gantt:client] sync OK', {
        success: response?.success,
        tasksReturned: responseRows.length,
        rowsMapping: responseRows.map((r) => ({ phantom: r?.$PhantomId, real: r?.id })),
        sentAdded: sentIds,
        sentButNotReturned,
        sentRemoved: Array.from(lastSyncRemovedIdsRef.current),
        afterReconcile: stillPhantom,
      });

      // Pending refs are dormant (reconcile disabled). Just clear the
      // in-flight snapshot.
      lastSyncAddedIdsRef.current.clear();
      lastSyncRemovedIdsRef.current.clear();
      // Trailing-edge debounce: with autoSync flushing every ~500ms during a
      // drag, refetching on every cycle would thrash. One refetch ~1s after
      // the last sync gives the file-tree sidebar and task-detail popover
      // a fresh view without spam.
      if (sidebarInvalidateTimerRef.current) clearTimeout(sidebarInvalidateTimerRef.current);
      sidebarInvalidateTimerRef.current = setTimeout(() => {
        void utils.gantt.tasks.invalidate();
        void utils.gantt.taskDetail.invalidate();
      }, 1000);
    };

    const onSyncFail = (event: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = event as any;
      console.error('[Gantt:client] syncFail', {
        message: e?.response?.message ?? e?.responseText ?? e?.error?.message,
        code: e?.response?.code,
        status: e?.response?.status,
        sentAdded: Array.from(lastSyncAddedIdsRef.current),
        sentRemoved: Array.from(lastSyncRemovedIdsRef.current),
        raw: e?.response ?? e?.responseText ?? e,
      });

      // Keep pending IDs intact for retry; just drop the in-flight snapshot.
      lastSyncAddedIdsRef.current.clear();
      lastSyncRemovedIdsRef.current.clear();
    };

    const onBeforeSync = ({ pack }: { pack: unknown }) => {
      // reconcileSyncPack DISABLED — it was the root cause of duplicate
      // adds: it tracked record ids at taskStore.add time, but Bryntum's
      // scheduling engine re-creates records during commitAsync (new id),
      // so the bag and our pending tracker held DIFFERENT ids for the same
      // record. Reconcile then injected the old id as "missing", producing
      // duplicate rows server-side and a $PhantomId in the response that
      // didn't match any client record → afterSyncAttempt crashed with
      // "Cannot set properties of undefined (setting 'isBeingMaterialized')".
      // Bryntum 7.2 + commitAsync (in handleAddTask) appears to keep the
      // bag reliable on its own; we trust it as the single source of truth.

      // Snapshot IDs actually in the outgoing pack so `onSync` knows which
      // pending entries to clear. Source of truth is now the bag, not our
      // pending tracker.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packAddedIds = new Set<string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (((pack as any)?.tasks?.added ?? []) as Array<{ id?: string }>)
          .map((t) => String(t.id ?? '')),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packRemovedIds = new Set<string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (((pack as any)?.tasks?.removed ?? []) as Array<{ id?: string }>)
          .map((t) => String(t.id ?? '')),
      );
      lastSyncAddedIdsRef.current = packAddedIds;
      lastSyncRemovedIdsRef.current = packRemovedIds;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = pack as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summarizeAdded = (t: any) => ({
        id: t?.id,
        $PhantomId: t?.$PhantomId,
        parentId: t?.parentId,
        name: t?.name,
        // Bryntum sometimes uses `parentIndex` to position; surface it so we can
        // see whether a subtask is missing parentId but has positional intent.
        parentIndex: t?.parentIndex,
        keys: t ? Object.keys(t) : [],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summarizeUpdated = (t: any) => ({
        id: t?.id,
        parentId: t?.parentId,
        name: t?.name,
        changedKeys: t ? Object.keys(t).filter((k) => k !== 'id') : [],
      });

      console.log('[Gantt:client] beforeSync — pack about to POST', {
        addedTasks: p?.tasks?.added?.length ?? 0,
        updatedTasks: p?.tasks?.updated?.length ?? 0,
        removedTasks: p?.tasks?.removed?.length ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        added: (p?.tasks?.added ?? []).map(summarizeAdded),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated: (p?.tasks?.updated ?? []).map(summarizeUpdated),
        removed: p?.tasks?.removed,
      });
    };

    // Shadow-track added/removed IDs from the reliable taskStore events so
    // `onBeforeSync` can reconcile the outgoing pack against Bryntum's
    // CrudManager dirty bag (which sometimes drops records when the engine
    // commits state between cycles).
    const taskStore = gantt.project.taskStore;

    const onTaskAdd = ({ records, isExpand }: {
      records: Array<{
        id?: string;
        isRoot?: boolean;
        isPhantom?: boolean;
        parentId?: string | null;
        parent?: { id?: string } | null;
        name?: string;
      }>;
      isExpand?: boolean;
    }) => {
      if (isExpand) return;
      // Logging only — pendingAddedIdsRef is no longer the source of truth.
      // Bryntum's CrudManager bag tracks adds; reconcileSyncPack is disabled.
      const tracked = records
        .filter((r) => !r.isRoot && r.id)
        .map((r) => ({
          id: String(r.id),
          isPhantom: r.isPhantom,
          parentId: r.parentId ?? r.parent?.id ?? null,
          name: r.name,
        }));
      if (tracked.length > 0) {
        console.log('[Gantt:client] taskStore.add (info)', { tracked });
      }
    };

    const onTaskRemove = ({ records, isCollapse }: { records: Array<{ id?: string; isRoot?: boolean }>; isCollapse?: boolean }) => {
      if (isCollapse) return;
      // No-op: reconcileSyncPack is disabled, so we no longer maintain
      // pendingRemovedIdsRef as a shadow of Bryntum's bag.
      void records;
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    taskStore.on('add', onTaskAdd);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    taskStore.on('remove', onTaskRemove);

    gantt.project.on('sync', onSync);
    gantt.project.on('syncFail', onSyncFail);
    gantt.project.on('beforeSync', onBeforeSync);

    // A row reorder is a single discrete drop — unlike a task-bar drag it emits
    // no continuous stream of changes, so it doesn't need the 500ms autoSync
    // debounce (autoSyncTimeout). Worse, that debounce means a quick refresh
    // right after dropping cancels the in-flight save and the new order is lost.
    // Force an immediate sync on drop so the reorder is persisted before the
    // user can navigate away.
    const onRowDrop = () => {
      void (async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await gantt.project?.commitAsync?.();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await gantt.project?.sync?.();
        } catch {
          // A debounced autoSync may already be flushing the same change;
          // "sync already in progress" is benign — that sync persists the order.
        }
      })();
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    gantt.on('gridRowDrop', onRowDrop);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      gantt?.un?.('gridRowDrop', onRowDrop);
      gantt.project?.un('sync', onSync);
      gantt.project?.un('syncFail', onSyncFail);
      gantt.project?.un('beforeSync', onBeforeSync);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      gantt.project?.taskStore?.un('add', onTaskAdd);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      gantt.project?.taskStore?.un('remove', onTaskRemove);
      // Restore native fetch — only if we still own it, so HMR-stacked
      // interceptors don't strand a stale reference as the active fetch.
      // No-op in production because the patch wasn't installed there.
      if (fetchDebugEnabled && window.fetch === wrappedFetch) {
        window.fetch = originalFetch;
      }
      if (sidebarInvalidateTimerRef.current) {
        clearTimeout(sidebarInvalidateTimerRef.current);
        sidebarInvalidateTimerRef.current = null;
      }
    };
  }, [isLoading, getGanttInstance, utils]);

  // Close the task popover when the selected task is removed (e.g. parent deletion cascades)
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt?.project?.taskStore) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onTaskRemove = ({ records }: { records: any[] }) => {
      if (!selectedTask) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const removedIds = new Set(records.map((r) => String(r.id)));
      if (removedIds.has(selectedTask.id)) {
        closeTaskPopover();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    gantt.project.taskStore.on('remove', onTaskRemove);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      gantt.project?.taskStore?.un('remove', onTaskRemove);
    };
  }, [isLoading, getGanttInstance, selectedTask, closeTaskPopover]);

  // Silently refresh data when returning to the Gantt tab after the stale threshold.
  // Bryntum's CrudManager merges fresh data without resetting scroll, selections, or expanded state.
  const hiddenSinceRef = useRef(0);
  useEffect(() => {
    if (isVisible) {
      const hiddenDuration = Date.now() - hiddenSinceRef.current;
      if (hiddenSinceRef.current > 0 && hiddenDuration > STALE_THRESHOLD_MS) {
        const gantt = getGanttInstance();
        if (gantt?.project) {
          gantt.project.load();
        }
      }
    } else {
      hiddenSinceRef.current = Date.now();
    }
  }, [isVisible, getGanttInstance]);

  // Bryntum React best practice: use useState (not useMemo) so the config object is
  // created exactly once and never recreated on re-render.  A new config reference
  // would make the React wrapper re-initialise the Bryntum instance (including
  // autoLoad), which wipes locally-added tasks.
  // Show the full-screen loader only on the FIRST load. Subsequent loads — the
  // approval-driven silent reload (TaskDetailsPopover) and the visibility
  // stale-refresh — merge in place with no overlay flash. Bryntum's own masks
  // are disabled (loadMask/syncMask: null), so suppressing our overlay is silent.
  const hasLoadedOnceRef = useRef(false);

  const [ganttConfig] = useState(() => createGanttConfig(projectId, {
    onLoadStart: () => {
      if (hasLoadedOnceRef.current) return;
      setIsLoading(true);
      setLoadError(null);
    },
    onLoadComplete: () => {
      const firstLoad = !hasLoadedOnceRef.current;
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
      // First load only — background reloads (stale-refresh, approval-driven)
      // must not yank the viewport away from where the user is working.
      // Wait for the scheduling engine to finish normalizing dates, then give
      // the infinite-scroll time axis a beat to settle — a bare setTimeout(0)
      // races Bryntum's initial axis recentering and the scroll gets undone.
      if (firstLoad) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const settled: unknown = getGanttInstance()?.project?.commitAsync?.();
        void Promise.resolve(settled)
          .catch(() => undefined)
          .then(() => {
            setTimeout(() => scrollGanttToFirstContent(getGanttInstance()), 150);
          });
      }
    },
    onLoadError: (error: string) => {
      // Only surface the blocking error overlay on the initial load. A failed
      // background reload leaves the working chart in place (the bar may stay
      // stale) rather than blanking a view the user is actively using.
      if (hasLoadedOnceRef.current) return;
      setIsLoading(false);
      setLoadError(error);
    },
  }));

  // Undo/redo keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z) come from
  // Bryntum's STM via `enableUndoRedoKeys` (default true).

  // Route task-bar clicks: a Shift-click (any time) or a plain click while
  // Link mode is on builds the dependency-link selection; everything else opens
  // the details popover. Linking is an edit op, so it's gated on editingUnlocked.
  const onTaskClick = useCallback(
    (payload: TaskClickEventPayload) => {
      // Route to linking when: Link mode is on, this click holds Shift, OR a
      // link selection is already in progress. The last case means only the
      // FIRST task needs Shift — every subsequent plain click continues the
      // chain (and re-clicking a picked task deselects it) instead of opening
      // the details popover, which is what made the second pick hard to land.
      const wantsLink =
        editingUnlocked &&
        (linkMode || !!payload.event?.shiftKey || linkSelection.length > 0);
      if (wantsLink) {
        closeTaskPopover();
        handleLinkClick(payload);
        return;
      }
      handleTaskClick(payload);
    },
    [editingUnlocked, linkMode, linkSelection.length, closeTaskPopover, handleLinkClick, handleTaskClick],
  );

  // Attach the taskClick listener on the Bryntum instance (not in the static config)
  // so we can use the latest onTaskClick reference (popover + linking).
  useEffect(() => {
    if (isLoading) return;
    const gantt = getGanttInstance();
    if (!gantt) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const detach = gantt.on('taskClick', onTaskClick) as (() => void) | undefined;
    return () => { detach?.(); };
  }, [isLoading, getGanttInstance, onTaskClick]);

  // Locking the chart cancels any in-progress linking.
  useEffect(() => {
    if (!editingUnlocked && linkMode) {
      setLinkMode(false);
      clearLinkSelection();
    }
  }, [editingUnlocked, linkMode, setLinkMode, clearLinkSelection]);

  // Esc clears the link selection first, then exits Link mode.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (linkSelection.length > 0) clearLinkSelection();
      else if (linkMode) setLinkMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [linkSelection.length, linkMode, clearLinkSelection, setLinkMode]);

  // Track the Shift key so the Link button lights up during a Shift-click link
  // gesture. Only listen while editing is unlocked (linking is gated on it),
  // and reset on blur so a Shift released off-window doesn't get stuck on.
  useEffect(() => {
    if (!editingUnlocked) {
      setShiftHeld(false);
      return;
    }
    const onDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
    const onUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
    const onBlur = () => setShiftHeld(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [editingUnlocked]);

  // Open task info dialog on double-click of a task bar (replaces Bryntum's built-in task editor).
  // Only attach the listener when editing is unlocked — the dialog is an edit surface.
  useEffect(() => {
    if (isLoading) return;
    if (!editingUnlocked) return;
    const gantt = getGanttInstance();
    if (!gantt) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const detach = gantt.on('taskDblClick', ({ taskRecord }: { taskRecord: unknown }) => {
      closeTaskPopover();
      setTaskInfoRecord(taskRecord as BryntumTaskRecord);
    }) as (() => void) | undefined;
    return () => { detach?.(); };
  }, [isLoading, getGanttInstance, closeTaskPopover, editingUnlocked]);

  // taskMenu config — passed as the top-level `taskMenuFeature` prop on
  // <BryntumGantt> below. NOT via `features.taskMenu` in the config object —
  // the React wrapper's `features → ${key}Feature` translation drops function
  // values like `onItem`/`processItems`, so the menu item never receives its
  // handler. The top-level prop is honored verbatim by the wrapper.
  // See Bryntum docs for `features.taskMenu` config:
  // https://bryntum.com/products/gantt/docs/api/Gantt/feature/TaskMenu
  const taskMenuFeature = useMemo(() => ({
    cls: 'gantt-themed-menu',
    items: {
      // Discoverable entry point for dependency creation. The `gantt-menu-add-dep`
      // class renders the link glyph + a right-aligned "⇧-click" shortcut hint
      // (globals.css), teaching the Shift accelerator at the moment of use.
      // weight 55 sits just below "Scroll to item" (50). processItems hides it
      // for parent tasks and when the chart is locked.
      addDependency: {
        text: 'Add dependency',
        icon: 'b-icon',
        cls: 'gantt-menu-add-dep',
        weight: 55,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onItem({ taskRecord }: { taskRecord: any }) {
          startLinkingFrom(taskRecord as BryntumTaskRecord);
        },
      },
      scrollToItem: {
        text: 'Scroll to item',
        // b-icon-search (magnifying glass) is in the bundled Bryntum CSS;
        // FA crosshair classes aren't in the slimmed FA subset this app loads.
        icon: 'b-icon b-icon-eye',
        // weight 50 sits above "Show details" (default ~100), pinning the
        // navigation action at the very top of the menu.
        weight: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onItem({ taskRecord, source }: { taskRecord: any; source: any }) {
          const gantt = source?.client ?? getGanttInstance();
          if (!gantt || !taskRecord?.startDate) return;
          // scrollToDate is the proven-safe path — `scrollTaskIntoView`
          // corrupts the time-axis header virtual renderer.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          gantt.scrollToDate(taskRecord.startDate, { block: 'center', animate: 300 });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          gantt.selectedRecords = [taskRecord];
        },
      },
    },
    // Hide Cut/Paste from the menu (keyboard shortcuts stay bound) and
    // attach a tooltip on each disabled item explaining why it's not
    // clickable. Two non-obvious bits:
    //   1. Lookup is keyed on the item REF (object property name), not on
    //      `text` — at this lifecycle stage Bryntum's text is still a
    //      localization key like `L{Gantt.linkTasks}` and only resolves to
    //      a display string at render time. Refs verified at runtime for
    //      Bryntum 7.2 (linkTasks / unlinkTasks for dep items, NOT the
    //      docs' `addDependency` / `removeDependency`).
    //   2. When `gantt.readOnly` is true (edit lock — see line 118),
    //      Bryntum disables every write item at once; emit one shared
    //      message rather than guessing per-item reasons.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processItems({ items, taskRecord }: { items: Record<string, any>; taskRecord: any }) {
      const gantt = getGanttInstance();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const isLocked = !!(gantt as any)?.readOnly;

      // "Add dependency" is an edit action and only applies to leaf tasks —
      // hide it when the chart is locked or the target is a parent/phantom.
      if (items.addDependency) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (isLocked || taskRecord?.isParent || taskRecord?.isPhantom) {
          items.addDependency.hidden = true;
        }
      }

      // Hide Bryntum's native linkTasks/unlinkTasks ("Add dependencies" /
      // "Remove dependencies"). They only fire with 2+ Cmd-selected tasks, so
      // on a single right-click they're permanently disabled — confusing next
      // to our always-actionable "Add dependency". Unlinking lives in the task
      // info dialog's Predecessors/Successors tabs.
      if (items.linkTasks) items.linkTasks.hidden = true;
      if (items.unlinkTasks) items.unlinkTasks.hidden = true;

      const reasonsByRef: Record<string, string> = {
        indent: 'No task above this one to nest under',
        outdent: 'This task is already at the top level',
        deleteTask: 'This task cannot be deleted right now',
        editTask: 'Editing this task is unavailable',
        convertToMilestone: 'This task cannot be converted to a milestone',
        add: 'Add is unavailable for this task',
      };

      for (const ref of Object.keys(items)) {
        const item = items[ref];
        if (ref === 'cut' || ref === 'paste') {
          delete items[ref];
          continue;
        }
        if (item && typeof item === 'object' && item.hidden) continue;
        if (item && typeof item === 'object' && item.disabled && !item.tooltip) {
          const reason = isLocked
            ? 'Editing is locked — click the lock icon in the toolbar to unlock the chart'
            : reasonsByRef[ref] ?? 'This action is unavailable for this task';
          // `align: 'l-r'` pins the tooltip's LEFT edge to the item's
          // RIGHT edge → tooltip floats out the right side of the menu.
          // Bryntum's collision detection auto-flips left at the viewport.
          item.tooltip = {
            html: reason,
            align: 'l-r',
            cls: 'gantt-disabled-tooltip',
          };
        }
      }
    },
  }), [getGanttInstance, startLinkingFrom]);

  return (
    <div style={editingUnlocked ? { ...WRAPPER_STYLE, ...EDITING_CARD_STYLE } : WRAPPER_STYLE}>
      {/* Accent strip across the top edge while editing — a peripheral cue that
          pairs with the card's ring/elevation and the toolbar's warm wash. */}
      {editingUnlocked && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: 'var(--accent-primary)',
            zIndex: 5,
            transformOrigin: 'left',
            animation: 'gantt-edit-strip-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
          }}
        />
      )}
      {projectId && (
        <ProjectStartCard
          projectId={projectId}
          canEdit={canEditChart}
          getGanttInstance={getGanttInstance}
        />
      )}
      <GanttToolbar
        onAddTask={handleAddTask}
        onPresetChange={handlePresetChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomToFit={handleZoomToFit}
        onShiftPrevious={handleShiftPrevious}
        onShiftNext={handleShiftNext}
        onScrollToToday={handleScrollToToday}
        onToggleCollapseAll={handleToggleCollapseAll}
        allCollapsed={allCollapsed}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        canEditChart={canEditChart}
        isEditMode={editingUnlocked}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        linkMode={linkMode}
        linkActive={linkActive}
        onToggleLinkMode={toggleLinkMode}
        onColumnsClick={(e) => setColumnsAnchor(e.currentTarget)}
      />
      <ColumnPickerPopover
        anchorEl={columnsAnchor}
        open={!!columnsAnchor}
        onClose={() => setColumnsAnchor(null)}
        visibility={columnVisibility}
        onToggle={handleColumnToggle}
      />

      {/* Bryntum must always render in a visible container so its internal layout
          calculations use real dimensions. The loading/error overlays sit on top.
          Menu theming for all Bryntum context menus lives in globals.css. */}
      <style>{`
        .bryntum-gantt-container .b-tree-cell { cursor: pointer; }
        .bryntum-gantt-container .b-gantt-task.b-task-selected {
          outline: 2.5px solid var(--accent-primary, rgba(43, 45, 66, 0.85)) !important;
          outline-offset: 2px;
        }
        /* Name cell inner wrapper — flex row with name + dots button */
        .gantt-name-cell-inner {
          display: flex;
          align-items: center;
          width: 100%;
          position: relative;
        }
        .gantt-name-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
/* "Needs review" pill — appears in the name cell when a task has
           unapproved submittals or inspections (count rolls up to parents). */
        .gantt-needs-review-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0 6px;
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          /* warm-hover + warm-contrast is the AA-passing amber pairing in both
             modes (light: dark amber + white; dark: light amber + near-black).
             Plain --accent-warm + white fails contrast — see design-systems.md. */
          background: var(--accent-warm-hover);
          color: var(--accent-warm-contrast);
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0;
          cursor: default;
        }
        /* Task-bar inner layout — used when a leaf task has any submittal /
           inspection requirements. While the task is incomplete it renders the
           task name on the left and a donut-in-chip indicator on the right (a
           tiny SVG progress donut + the filled/total ratio). Chip states: empty
           (faint chip, hollow ring) and partial (white chip, partial arc, indigo
           text). Once every requirement is approved the chip is replaced by the
           "Complete" pill (.gantt-task-bar-pill) and the whole bar turns green
           via .gantt-task-done — see globals.css. */
        .gantt-task-bar-inner {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          height: 100%;
          padding: 0 6px 0 8px;
          box-sizing: border-box;
        }
        .gantt-task-bar-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gantt-task-bar-chip {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px 2px 4px;
          border-radius: 999px;
          /* Fixed pairing: the chip is always a white pill on the navy bar, so
             its text (and the donut arc via currentColor) stays navy in both
             modes — do NOT use --accent-primary here (near-white in dark). */
          background: rgba(255, 255, 255, 0.95);
          color: #2B2D42;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.4;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.10);
          cursor: default;
        }
        .gantt-task-bar-chip.is-empty {
          background: rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.95);
          box-shadow: none;
        }
        .gantt-task-bar-chip-donut {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .gantt-task-bar-chip-donut svg { display: block; }
        .gantt-task-bar-chip-text { line-height: 1; }
        /* Complete pill — white pill with green check + "Complete" label,
           sitting on the green completed bar (see .gantt-task-done in globals.css). */
        .gantt-task-bar-pill {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 9px 2px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          color: #15803d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1.4;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
          cursor: default;
        }
        .gantt-task-bar-pill-icon {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .gantt-task-bar-pill-icon svg { display: block; }
        .gantt-task-bar-pill-text { line-height: 1; }

        /* Drag-to-reorder grip states (the grip is Bryntum's ::before on the
           name cell). Reordering only applies to users who can manage the
           project, and only while the chart is unlocked (edit mode). */
        /* Members / viewers can never reorder — hide the grip entirely. */
        .bryntum-gantt-container[data-can-reorder="false"] .b-row-reorder-grip::before {
          display: none;
        }
        /* Admins in the locked (view) state: show the grip but make it clearly
           inert — faded with a not-allowed cursor. The "Enter edit mode to
           reorder tasks" hint is delivered via the cell tooltip (ganttConfig). */
        .bryntum-gantt-container[data-can-reorder="true"][data-locked="true"] .b-row-reorder-grip::before {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Row-reorder drag feedback. While dragging, Bryntum shows a drop-line
           (.b-row-drop-indicator) and a highlight on the target row, both
           colored with --b-secondary — a variable our theme never defines, so
           they paint invisibly. Pin the indicator vars to app tokens so the
           drop position is clearly shown: a 3px accent line where the row will
           land (valid) or red (invalid, e.g. dropping onto a leaf). The vars
           cascade to the indicator + target highlight and flip with dark mode. */
        .bryntum-gantt-container {
          --b-row-reorder-indicator-size: 3px;
          --b-row-reorder-indicator-color: var(--accent-primary);
          --b-row-reorder-indicator-invalid-color: var(--status-red);
        }
        /* Lift the row being dragged so the pickup reads clearly. */
        .b-row-reorder-proxy {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.22);
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>

      <div
        style={GANTT_CONTENT_STYLE}
        className="bryntum-gantt-container"
        data-locked={editingUnlocked ? 'false' : 'true'}
        data-editing={editingUnlocked ? 'true' : 'false'}
        data-can-reorder={canEditChart ? 'true' : 'false'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <BryntumGantt
            ref={ganttRef}
            {...ganttConfig}
            taskMenuFeature={taskMenuFeature}
            // cellEdit config MUST be passed as this per-feature prop, not via
            // `features.cellEdit` in ganttConfig — the React wrapper (v7.2.2)
            // has no bulk `features` prop, so that nested config is dropped and
            // CellEdit falls back to its default `addNewAtEnd: { duration: 1 }`,
            // which makes Enter on the last row spawn a new task. Forcing
            // `addNewAtEnd: false` here makes Enter only commit the edit; tasks
            // are created exclusively via the "+ Add Task" button.
            cellEditFeature={{ addNewAtEnd: false }}
            // Drag-to-reorder rows. Passed as a per-feature prop (the React
            // wrapper drops `features.rowReorder` nested in ganttConfig, same as
            // cellEdit/taskMenu above). `gripOnly` confines dragging to the grip
            // handle so it never collides with row-select / double-click-rename;
            // `dropOnLeaf: false` keeps it to pure reordering (no accidental
            // reparenting). It inherits `gantt.readOnly = !editingUnlocked`, so
            // it's automatically off when the chart is locked or for non-admins.
            // New order persists via the `orderedParentIndex` field → orderIndex.
            rowReorderFeature={{ showGrip: true, gripOnly: true, dropOnLeaf: false }}
            // Current-date line — the TimeRanges feature's "now" indicator, a
            // vertical line marking today on the time axis. Passed as a
            // per-feature prop (NOT via `features.timeRanges` in ganttConfig):
            // the React wrapper only applies props whose names are in
            // BryntumGantt.configNames/featureNames, and bare `features` is not
            // one of them, so nested feature config there is silently dropped
            // (same reason cellEdit/taskMenu/rowReorder are passed this way).
            // `showCurrentTimeLine` with a TimeSpan config object both enables
            // the feature and labels the line. The empty timeRangeStore means
            // only the "now" line renders. Styling comes from the Bryntum theme
            // (.b-sch-current-time), so it adapts to light/dark automatically.
            // Docs: https://bryntum.com/products/gantt/docs/api/Scheduler/feature/TimeRanges
            timeRangesFeature={{ showCurrentTimeLine: { name: 'Today' } }}
          />
        </div>

        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'var(--bg-card)',
              zIndex: 1,
              color: 'text.secondary',
            }}
          >
            <IBeamLoader size={44} />
          </Box>
        )}

        {loadError && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              color: 'error.main',
              bgcolor: 'var(--bg-card)',
              zIndex: 1,
            }}
          >
            <div>Failed to load Gantt chart</div>
            <div style={{ fontSize: '0.875rem' }}>{loadError}</div>
          </Box>
        )}

        <TaskLinkingBar
          selection={linkSelection}
          onLink={commitLinks}
          onClear={clearLinkSelection}
        />
      </div>

      <TaskDetailsPopover
        open={isTaskPopoverOpen}
        taskName={selectedTask?.name ?? ''}
        taskId={selectedTask?.id}
        popoverPlacement={popoverPlacement}
        ganttInstance={getGanttInstance() as unknown as BryntumGanttInstance | null}
        onClose={closeTaskPopover}
      />

      <TaskInfoDialog
        open={!!taskInfoRecord}
        taskRecord={taskInfoRecord}
        ganttInstance={getGanttInstance() as unknown as import('./types').BryntumGanttInstance | null}
        onClose={() => setTaskInfoRecord(null)}
        onDelete={() => {
          if (taskInfoRecord) taskInfoRecord.remove();
          setTaskInfoRecord(null);
        }}
      />
    </div>
  );
}
