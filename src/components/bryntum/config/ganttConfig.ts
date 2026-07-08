import { TaskModel } from '@bryntum/gantt';
import type { DomClassList } from '@bryntum/gantt';
import type { GanttConfig, ColumnRendererData } from '../types';

// Extend TaskModel to include custom fields. Without explicit `fields`, Bryntum
// drops them from loaded data. `needsReviewCount` drives the review-queue badge
// in the name column. `requirementsTotal` / `requirementsFilled` drive the
// submittal+inspection completion % shown on each task bar.
//
// These three are display-only — the server computes them in /api/gantt/load and
// they are never written back. `persist: false` keeps them out of the sync pack
// so updating them in place (e.g. TaskDetailsPopover's live bar/badge refresh)
// re-renders the row WITHOUT scheduling an autoSync round-trip.
//
// `parentIndex` / `orderedParentIndex` are Bryntum's built-in calculated tree
// fields (a node's position among its siblings). We re-declare them ONLY to add
// `persist: true` — so a drag-reorder includes the new position in the sync pack
// (the server maps it onto our `orderIndex` column). Do NOT add a `type` here:
// that would shadow Bryntum's calculated getter and the value would stop
// auto-updating on reorder. This is the documented WBS-sync pattern.
class AppTaskModel extends TaskModel {
  static override get fields() {
    return [
      { name: 'needsReviewCount', type: 'int', defaultValue: 0, persist: false },
      { name: 'requirementsTotal', type: 'int', defaultValue: 0, persist: false },
      { name: 'requirementsFilled', type: 'int', defaultValue: 0, persist: false },
      { name: 'parentIndex', persist: true },
      { name: 'orderedParentIndex', persist: true },
    ];
  }
}

function formatTooltipText(record: Record<string, unknown>, field?: string): string {
  if (!field) {
    return '';
  }

  const value = record[field];
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

interface LoadingCallbacks {
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: string) => void;
}

export function createGanttConfig(
  projectId?: string,
  loadingCallbacks?: LoadingCallbacks
): GanttConfig {
  return {
    // Performance optimizations
    autoHeight: false,
    loadMask: null,
    syncMask: null,
    rowHeight: 45, // Consistent row height for better performance
    animateTreeNodeToggle: false, // Disable animations for faster rendering
    detectCSSCompatibilityIssues: false,

    // Virtualize the time axis so the user can switch to fine-grained presets
    // (e.g. hourAndDay) over a multi-year startDate/endDate span without
    // Bryntum throwing "Configured date range will result in a too long time axis".
    infiniteScroll: true,

    project: {
      autoLoad: true,
      autoSync: true,
      // Coalesce rapid changes (e.g. mid-drag) into one HTTP request per
      // window. Default is 100ms; 500ms cuts in-flight requests during a
      // drag from ~10/sec to ~2/sec while still feeling instant on release.
      autoSyncTimeout: 500,
      taskModelClass: AppTaskModel,
      resetUndoRedoQueuesAfterLoad: true,
      // NOTE: autoSetConstraints is intentionally OFF (Path B). When on, Bryntum
      // stamps a `startnoearlier` constraint on every unconstrained task pinned
      // to its own start date — which blocks dragging the bar EARLIER (you can
      // only move it later). That made day-to-day editing feel broken. Instead,
      // the load path (gantt.load) holds independent leaf tasks in place by
      // marking them manuallyScheduled, so they keep their dates and drag freely
      // in both directions while dependency-linked tasks stay engine-scheduled.

      stm: {
        autoRecord: true,
      },

      transport: projectId
        ? {
            load: {
              url: `/api/gantt/load?projectId=${projectId}`,
              fetchOptions: { credentials: 'include' },
            },
            sync: {
              url: `/api/gantt/sync?projectId=${projectId}`,
              fetchOptions: { credentials: 'include' },
            },
          }
        : {
            load: {
              url: '/data/bryntum-sample.json',
              fetchOptions: { credentials: 'include' },
            },
          },

      listeners: {
        beforeLoad: () => {
          loadingCallbacks?.onLoadStart?.();
        },
        load: () => {
          loadingCallbacks?.onLoadComplete?.();
        },
        loadFail: ({ response }: { response: { message?: string } }) => {
          loadingCallbacks?.onLoadError?.(
            response?.message ?? 'Failed to load Gantt data'
          );
        },
      },
    },
    columns: [
      {
        id: 'name',
        type: 'name',
        field: 'name',
        text: 'Name',
        // Fixed width (NOT `flex`) so double-clicking the header resize handle
        // auto-fits the header AND the body cells to the same width. A `flex`
        // column lets Bryntum's resizeToFitContent shrink only the body cells
        // while the header keeps its flex-derived width — leaving them
        // misaligned (the bug this fixes). The locked sub-grid width is
        // re-synced to the column widths on every resize in
        // BryntumGanttWrapper (syncLockedSubGridWidth), so the timeline
        // reclaims/yields the freed space and there is no dead gap.
        width: 300,
        minWidth: 150,
        resizable: true,
        renderer({ value, record }: ColumnRendererData) {
          const needsReviewCount = Number(record.get('needsReviewCount') ?? 0);
          const children: Array<Record<string, unknown>> = [
            { tag: 'span', class: 'gantt-name-text', text: String(value ?? '') },
          ];

          if (needsReviewCount > 0) {
            children.push({
              tag: 'span',
              class: 'gantt-needs-review-badge',
              dataset: { taskId: String(record.id) },
              title: `${needsReviewCount} item${needsReviewCount === 1 ? '' : 's'} awaiting review`,
              text: String(needsReviewCount),
            });
          }

          return {
            class: 'gantt-name-cell-inner',
            children,
          };
        },
      },
      // Double-clicking the name cell starts inline name editing (Bryntum native behavior).
      // Right-click opens the task context menu (includes "Scroll to item").
      {
        id: 'startDate',
        type: 'startdate',
        field: 'startDate',
        text: 'Start',
        // Compact numeric date (06/02/2026) instead of the verbose
        // "Jun 2, 2026" default, to save horizontal space.
        format: 'MM/DD/YYYY',
        width: 120,
        resizable: true,
      },
      {
        id: 'endDate',
        type: 'enddate',
        field: 'endDate',
        text: 'End',
        format: 'MM/DD/YYYY',
        width: 120,
        resizable: true,
      },
      {
        id: 'duration',
        type: 'duration',
        text: 'Duration',
        width: 100,
        resizable: true,
      },
    ],
    features: {
      taskEdit: false,
      // cellEdit (inline rename via double-click) is enabled by Bryntum's
      // default. Its config — specifically `addNewAtEnd: false`, so Enter just
      // commits instead of spawning a new task — is passed as the top-level
      // `cellEditFeature` prop on <BryntumGantt> in BryntumGanttWrapper, NOT
      // here. The React wrapper has no bulk `features` prop (see
      // BryntumGanttProps), so feature config nested in this object is silently
      // dropped; only the per-feature `${key}Feature` props are honored. New
      // tasks are added exclusively via the "+ Add Task" button.
      columnLines: true,
      stripe: true,
      nonWorkingTime: true,
      percentBar: false,
      tree: { toggleTreeNode: false },
      cellTooltip: {
        tooltipRenderer: ({ record, column, cellElement }) => {
          // When the user CAN reorder but the chart is locked (not in edit
          // mode), the drag grip is grayed out — explain why on hover. State is
          // read live from the container's data attributes at hover time, so it
          // tracks the edit-mode toggle without rebuilding the stable config.
          if (column.field === 'name') {
            const container = cellElement?.closest('.bryntum-gantt-container');
            if (
              container?.getAttribute('data-can-reorder') === 'true' &&
              container?.getAttribute('data-locked') === 'true'
            ) {
              return 'Enter edit mode to reorder tasks';
            }
          }
          return formatTooltipText(record, column.field);
        },
      },
      // Show the proposed end date in a tooltip while the user drags the
      // end-side resize handle. Bryntum's TaskResize is end-only by design;
      // this gives live feedback during the drag. Kept here in the STATIC
      // config (created once via useState) — moving it to a per-render
      // `taskResizeFeature` prop made the wrapper re-run feature.setConfig and
      // destabilized the resize handles.
      taskResize: {
        showTooltip: true,
        tooltipTemplate: ({ endDate }) => {
          if (!endDate) return '';
          return endDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        },
      },
      // Theme all Bryntum context menus to match the app's light palette.
      // The marker class is applied to the floating `.b-menu` element so our
      // CSS overrides in globals.css stay scoped to Gantt menus.
      //
      // taskMenu intentionally NOT here — passed as the top-level
      // `taskMenuFeature` prop on <BryntumGantt> in BryntumGanttWrapper so its
      // `items` / `processItems` config is honored by the React wrapper. When
      // nested under `features` here, the wrapper translates it via its
      // `features → ${key}Feature` rewriter and the `processItems` callback
      // never fires.
      cellMenu: { cls: 'gantt-themed-menu' },
      scheduleMenu: { cls: 'gantt-themed-menu' },
      dependencyMenu: { cls: 'gantt-themed-menu' },
      // Dependencies — drag-to-create dep arrows (hover any task bar's
      // edge for handles) and auto-rescheduling on predecessor moves.
      // Does NOT light up the `linkTasks` / `unlinkTasks` items in the
      // right-click menu — those need 2+ tasks Cmd-selected; the tooltip
      // wired in processItems (BryntumGanttWrapper.tsx) explains this.
      //
      // dependencyStore already loads from /api/gantt/load and syncs via
      // /api/gantt/sync, so creates/deletes round-trip with no API work.
      //
      // To revert: set false. Existing rows stay in the DB, just stop
      // rendering. History: built+removed during the kibo-ui era
      // (commits 856d7a6 → 22a382f → 0a2cbf7 → b0a1630 → ac717e2).
      dependencies: true,
    },
    emptyText: 'No tasks yet — click "+ Add Task" above or double-click here to get started',
    // Zoom ladder — ordered coarsest → finest (matches Bryntum's own default
    // order), so zoomOut() steps toward monthAndYear and zoomIn() toward
    // hourAndDay. `zoomLevel` is an INDEX into this array; the previous config
    // had a single preset, so zoomIn/zoomOut had no other level to step to and
    // were silent no-ops. IDs match the toolbar's view-preset picker so the
    // dropdown and the zoom buttons stay in sync. The custom compact week
    // preset (MM/DD headers) is the initial rung.
    presets: [
      { id: 'monthAndYear', base: 'monthAndYear' },
      { id: 'weekAndMonth', base: 'weekAndMonth' },
      {
        id: 'weekAndDayLetterCompact',
        base: 'weekAndDayLetter',
        headers: [
          { unit: 'month', dateFormat: 'MMMM YYYY' },
          { unit: 'day', dateFormat: 'd1' },
          { unit: 'day', dateFormat: 'DD' },
        ],
      },
      { id: 'hourAndDay', base: 'hourAndDay' },
    ],
    viewPreset: 'weekAndDayLetterCompact',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 24, 1),
    // Hard paging limits for the time axis. startDate/endDate are only the
    // INITIAL span — without min/max, the axis end sat exactly at endDate, so
    // shiftNext() had nowhere to extend and was a no-op (while shiftPrevious()
    // worked). These give generous room to page in both directions.
    minDate: new Date(new Date().getFullYear() - 2, new Date().getMonth(), 1),
    maxDate: new Date(new Date().getFullYear() + 5, new Date().getMonth(), 1),
    barMargin: 10,

    // Differentiate parent bars from child bars.
    // Adds 'gantt-parent-bar' class to parent tasks for CSS targeting.
    // Parent bars show the task name (same as the tree column).
    // Leaf bars show the task name plus a donut-in-chip indicator carrying
    // both the visual progress (mini SVG donut) and the count (e.g. 1/2) when
    // the task has any requirements set (requirementsTotal > 0).
    taskRenderer({ taskRecord, renderData }: {
      taskRecord: TaskModel;
      renderData: { cls: DomClassList | string; style: string | Record<string, string>; wrapperCls: DomClassList | string; iconCls: DomClassList | string };
    }) {
      if (taskRecord.isParent) {
        if (typeof renderData.cls !== 'string') {
          renderData.cls.add('gantt-parent-bar');
        }
        return taskRecord.name ?? '';
      }

      const total = Number(taskRecord.get('requirementsTotal') ?? 0);
      if (total <= 0) {
        return taskRecord.name;
      }

      const filled = Math.min(
        Number(taskRecord.get('requirementsFilled') ?? 0),
        total,
      );
      const isDone = filled >= total;
      const isEmpty = filled === 0;

      // Complete state — the whole bar turns green (via the gantt-task-done class
      // added below) and the count chip is replaced by an explicit "Complete"
      // pill so the finished state reads clearly at any timeline zoom level.
      if (isDone) {
        if (typeof renderData.cls !== 'string') {
          renderData.cls.add('gantt-task-done');
        }
        const checkSvg =
          '<svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">'
          + '<circle cx="7" cy="7" r="6" fill="#16a34a"/>'
          + '<path d="M4 7L6.2 9L10 5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
          + '</svg>';
        return {
          class: 'gantt-task-bar-inner',
          children: [
            { tag: 'span', class: 'gantt-task-bar-name', text: String(taskRecord.name ?? '') },
            {
              tag: 'span',
              class: 'gantt-task-bar-pill is-complete',
              title: `${total} of ${total} submittals and inspections complete`,
              children: [
                { tag: 'span', class: 'gantt-task-bar-pill-icon', html: checkSvg },
                { tag: 'span', class: 'gantt-task-bar-pill-text', text: 'Complete' },
              ],
            },
          ],
        };
      }

      // Donut math — viewBox 14x14, r=5.5, circumference = 2πr ≈ 34.56.
      // The fill arc uses stroke-dasharray/offset to draw a partial circle.
      const CIRCUMFERENCE = 34.56;
      const offset = CIRCUMFERENCE * (1 - filled / total);

      const donutSvg = isEmpty
        ? '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
          + '<circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="2"/>'
          + '</svg>'
        : '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
          + '<circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>'
          + `<circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 7 7)" stroke-linecap="round"/>`
          + '</svg>';

      const chipClass = `gantt-task-bar-chip${isEmpty ? ' is-empty' : ''}`;

      return {
        class: 'gantt-task-bar-inner',
        children: [
          { tag: 'span', class: 'gantt-task-bar-name', text: String(taskRecord.name ?? '') },
          {
            tag: 'span',
            class: chipClass,
            title: `${filled} of ${total} submittals and inspections complete`,
            children: [
              { tag: 'span', class: 'gantt-task-bar-chip-donut', html: donutSvg },
              { tag: 'span', class: 'gantt-task-bar-chip-text', text: `${filled}/${total}` },
            ],
          },
        ],
      };
    },
  };
}
