'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { Box, Popover, Typography, Divider } from '@mui/material';

import { POPOVER_WIDTH, POPOVER_EXPANDED_WIDTH } from '../constants';
import { folderData, expandFolderIds, type Folder } from '@/lib/folders';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import { useOrgContext } from '@/components/providers/OrgProvider';
import UploadDialog from '@/components/documents/UploadDialog';
import { api } from '@/trpc/react';
import { trackUpload } from '@/store/uploadStatusStore';
import type { PopoverPlacement, BryntumGanttInstance, BryntumTaskRecord } from '../types';
import type { PreviewDoc, PreviewNav, DocumentItem } from './task-popover/types';

import { ArrowsInSimple, ArrowsOutSimple, CheckCircle } from '@phosphor-icons/react';
import TaskHeader from './task-popover/TaskHeader';
import CoverImageBanner from './task-popover/CoverImageBanner';
import FolderRow from './task-popover/FolderRow';
import DocumentPreviewDialog from './task-popover/DocumentPreviewDialog';
import CsiCodePanel from './task-popover/CsiCodePanel';
import SubmittalDrawer from './SubmittalDrawer';
import { canApproveDocuments, canManageProjects } from '@/lib/permissions';
import type { SlotKind } from '@/lib/validations/gantt';

type RightPanel = { type: 'csi' } | null;

type TaskDetailsPopoverProps = {
  open: boolean;
  taskName: string;
  taskId?: string;
  popoverPlacement: PopoverPlacement | null;
  ganttInstance: BryntumGanttInstance | null;
  onClose: () => void;
};

export function TaskDetailsPopover({
  open,
  taskName,
  taskId,
  popoverPlacement,
  ganttInstance,
  onClose,
}: TaskDetailsPopoverProps) {
  const { projectId, organizationId } = useProjectContext();
  const { memberRole } = useOrgContext();
  const canManageRequirements = memberRole === 'owner' || memberRole === 'admin';
  const canManageSlots = canApproveDocuments(memberRole);
  const canManageCover = canManageProjects(memberRole);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [uploadTarget, setUploadTarget] = useState<{ folder: { id: string; name: string }; slotId?: string } | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  // Document preview opens as a centered popup (over the popover). It carries an
  // ordered navigation set (the siblings of the clicked doc) + the active index
  // so the dialog can step ‹ / › (and ←/→) without closing. `approvable` shows
  // the in-header approve toggle (trackable submittal/inspection docs only).
  const [preview, setPreview] = useState<{ docs: PreviewDoc[]; index: number; approvable: boolean } | null>(null);
  const [drawerKind, setDrawerKind] = useState<SlotKind | null>(null);
  // Transient confirmation shown on the popover after the drawer saves + closes.
  const [savedNotice, setSavedNotice] = useState<{ kind: SlotKind; count: number } | null>(null);
  const savedNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (savedNoticeTimer.current) clearTimeout(savedNoticeTimer.current); }, []);
  const handleRequirementsSaved = useCallback((info: { kind: SlotKind; count: number }) => {
    setDrawerKind(null); // auto-close the drawer
    setSavedNotice(info);
    if (savedNoticeTimer.current) clearTimeout(savedNoticeTimer.current);
    savedNoticeTimer.current = setTimeout(() => setSavedNotice(null), 2800);
  }, []);
  // Per-slot upload tracking — drives the in-place "Uploading…" badge on
  // SlotDropzone rows so the user can see where the file is landing even
  // after the dialog closes. Both the dialog path and the DnD path feed
  // this set via markSlotUploading.
  const [uploadingSlotIds, setUploadingSlotIds] = useState<Set<string>>(new Set());
  const markSlotUploading = useCallback((slotId: string, on: boolean) => {
    setUploadingSlotIds((prev) => {
      if (prev.has(slotId) === on) return prev;
      const next = new Set(prev);
      if (on) next.add(slotId);
      else next.delete(slotId);
      return next;
    });
  }, []);

  const openUploadDialog = useCallback(
    (folder: { id: string; name: string }, slotId?: string) => {
      setUploadTarget({ folder, slotId });
    },
    [],
  );

  // ── Drag state ──
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) setDragOffset({ x: 0, y: 0 });
  }, [open]);

  const bindDrag = useDrag(
    ({ offset: [x, y], dragging }) => {
      setDragOffset({ x, y });
      setIsDragging(!!dragging);
    },
    {
      from: () => [dragOffset.x, dragOffset.y],
      filterTaps: true,
      pointer: { capture: false },
    },
  );

  // ── Data queries ──
  const utils = api.useUtils();

  const { data: taskDetail, isLoading: taskDetailLoading } = api.gantt.taskDetail.useQuery(
    { organizationId, projectId, taskId: taskId! },
    { enabled: !!organizationId && !!projectId && !!taskId }
  );

  const { data: allDocs } = api.document.listByTask.useQuery(
    { organizationId, projectId, taskId: taskId! },
    { enabled: !!organizationId && !!projectId && !!taskId }
  );

  const { data: counts } = api.document.countByTask.useQuery(
    { organizationId, projectId, taskId: taskId! },
    { enabled: !!organizationId && !!projectId && !!taskId }
  );

  // ── Requirement mutation ──
  // The popover's inline stepper writes immediately through setSlotCount, which
  // keeps the legacy count column and the TaskRequirementSlot rows in sync in
  // one transaction. (The drawer is a deferred draft editor and commits via
  // saveSlots instead; both paths keep the legacy column synced so the two
  // surfaces interoperate.) Updating only the legacy column here used to leave
  // orphan slot rows that silently reappeared on the next increment.
  const setSlotCountMutation = api.gantt.setSlotCount.useMutation({
    onSuccess: (_data, variables) => {
      void utils.gantt.taskDetail.invalidate({ organizationId, projectId, taskId: taskId! });
      void utils.gantt.listSlots.invalidate({
        organizationId,
        projectId,
        taskId: taskId!,
        kind: variables.kind,
      });
      void utils.gantt.requirementStats.invalidate({ projectId });
    },
  });

  const handleSaveRequirement = useCallback(
    (field: 'requiredSubmittals' | 'requiredInspections', count: number | null) => {
      if (!taskId) return;
      const kind: SlotKind = field === 'requiredSubmittals' ? 'submittal' : 'inspection';
      setSlotCountMutation.mutate({
        organizationId,
        projectId,
        taskId,
        kind,
        count: count ?? 0,
      });
    },
    [taskId, organizationId, projectId, setSlotCountMutation]
  );

  // ── Right panel helpers ──
  const openPreview = useCallback((doc: PreviewDoc, nav?: PreviewNav) => {
    const siblings = nav?.siblings && nav.siblings.length > 0 ? nav.siblings : [doc];
    const index = Math.max(0, siblings.findIndex((d) => d.id === doc.id));
    setPreview({ docs: siblings, index, approvable: nav?.approvable ?? false });
  }, []);

  const stepPreview = useCallback((delta: number) => {
    setPreview((p) => {
      if (!p) return p;
      const next = p.index + delta;
      if (next < 0 || next >= p.docs.length) return p;
      return { ...p, index: next };
    });
  }, []);

  const openCsiPanel = useCallback(() => {
    setRightPanel({ type: 'csi' });
  }, []);

  const closeRightPanel = useCallback(() => {
    setRightPanel(null);
  }, []);

  // ── CSI optimistic + saving state ──
  // The picker writes record.csiCode and the panel slides away, but the chip
  // reads taskDetail.csiCode, which only refreshes ~1.5s later (autoSync flush +
  // onSync's 1s debounced invalidate in BryntumGanttWrapper). `pendingCsiCode`
  // holds the just-picked value so the chip updates instantly and spins until
  // the server value catches up. `undefined` means nothing is in flight.
  const [pendingCsiCode, setPendingCsiCode] = useState<string | null | undefined>(undefined);
  const savedCsiCode = taskDetail?.csiCode ?? null;

  useEffect(() => {
    if (pendingCsiCode !== undefined && savedCsiCode === pendingCsiCode) {
      setPendingCsiCode(undefined);
    }
  }, [savedCsiCode, pendingCsiCode]);

  // Failsafe: a syncFail never refreshes taskDetail, so drop the spinner after a
  // few seconds rather than spinning forever.
  useEffect(() => {
    if (pendingCsiCode === undefined) return;
    const timer = setTimeout(() => setPendingCsiCode(undefined), 6000);
    return () => clearTimeout(timer);
  }, [pendingCsiCode]);

  const effectiveCsiCode = pendingCsiCode !== undefined ? pendingCsiCode : savedCsiCode;
  const isSavingCsi = pendingCsiCode !== undefined;

  // ── Callbacks ──
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedFolders(new Set(folderData.map((f) => f.id)));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const handleUploadComplete = useCallback(() => {
    void utils.document.countByTask.invalidate({ organizationId, projectId, taskId: taskId! });
    void utils.document.listByTask.invalidate({ organizationId, projectId, taskId: taskId! });
    void utils.document.listByFolder.invalidate({ organizationId, projectId, taskId: taskId! });
    // listSlots now embeds the bound document; refresh both kinds so the slot
    // row that just received an upload re-renders as filled.
    void utils.gantt.listSlots.invalidate({ organizationId, projectId, taskId: taskId! });
    void utils.gantt.requirementStats.invalidate({ projectId });
    void utils.approval.summary.invalidate({ projectId });
    void utils.approval.listOverdueSlots.invalidate({ projectId });
    setUploadTarget(null);
  }, [organizationId, projectId, taskId, utils]);

  // Per-slot drag-and-drop upload: bypasses the dialog (no title/notes prompt)
  // and routes through trackUpload so the global chip shows progress. The
  // slotId is marked uploading so the SlotDropzone row also reflects that
  // state in-place until the upload resolves.
  const handleUploadFile = useCallback(
    (folderId: string, slotId: string, file: File) => {
      if (!taskId) return;
      markSlotUploading(slotId, true);
      void trackUpload<{ document: { id: string } }>(
        file,
        () => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('projectId', projectId);
          formData.append('taskId', taskId);
          formData.append('folderId', folderId);
          formData.append('slotId', slotId);
          return fetch('/api/upload', { method: 'POST', body: formData });
        },
        { maxBytes: 50 * 1024 * 1024 },
      ).then((result) => {
        markSlotUploading(slotId, false);
        if (result.ok) handleUploadComplete();
      });
    },
    [projectId, taskId, handleUploadComplete, markSlotUploading],
  );

  const handleClose = () => {
    setExpandedFolders(new Set());
    setRightPanel(null);
    setPreview(null);
    onClose();
  };

  // Scroll target for the "View all" / "+ Add" actions in the header.
  const requirementsRef = useRef<HTMLDivElement | null>(null);
  const handleScrollToRequirements = useCallback(() => {
    // Open submittals + inspections so their counters are visible after scroll.
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.add('submittals');
      next.add('inspections');
      return next;
    });
    // Defer until after the expand state lands a frame so the row heights are real.
    requestAnimationFrame(() => {
      requirementsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Compute current upload + approval counts for trackable folders.
  const getTrackableCount = (folder: Folder) => {
    const allIds = expandFolderIds(folder.id);
    let total = 0;
    let approved = 0;
    for (const id of allIds) {
      const c = counts?.[id];
      total += c?.total ?? 0;
      approved += c?.approved ?? 0;
    }
    return { total, approved, pending: total - approved };
  };
  const submittalsFolder = folderData.find((f) => f.id === 'submittals');
  const inspectionsFolder = folderData.find((f) => f.id === 'inspections');
  const submittalsCounts = submittalsFolder
    ? getTrackableCount(submittalsFolder)
    : { total: 0, approved: 0, pending: 0 };
  const inspectionsCounts = inspectionsFolder
    ? getTrackableCount(inspectionsFolder)
    : { total: 0, approved: 0, pending: 0 };
  const submittalsCurrent = submittalsCounts.approved;
  const inspectionsCurrent = inspectionsCounts.approved;

  // ── Live Gantt bar / badge refresh ───────────────────────────────────────
  // The task-bar completion chip (requirementsFilled/Total) and the orange
  // "needs review" badge (needsReviewCount, with parent rollups) are painted
  // from Bryntum record fields populated only by /api/gantt/load. So approving a
  // submittal here (or uploading to a slot, or changing a required count) updates
  // this popover but leaves the bar/badge stale until a refresh. We fix it by
  // writing the fresh counts straight onto the open task's record (and its
  // ancestors for the rolled-up badge) — those fields are display-only
  // (persist:false), so the row re-renders without a sync round-trip.
  //
  // We do NOT call gantt.project.load(): a full CrudManager reload re-renders the
  // time axis / replaces the store while the popover is open, which blanked the
  // timeline (tasks disappeared) after every requirement or upload change.
  //
  // The write is idempotent — setting a field to its current value is a Bryntum
  // no-op, and the ancestor delta reads back from the record — so it needs no
  // change-signature guard or debounce: the first run after load is a no-op, and
  // re-runs (taskDetail + counts settling a few ms apart) simply converge.
  useEffect(() => {
    if (!open || !ganttInstance?.project || !taskId || !taskDetail || !counts) return;

    const record = ganttInstance.project.taskStore.getById(taskId);
    if (!record) return;

    // Mirror the server's load math (gantt.ts): each kind's filled count is
    // capped at its required count separately, then summed.
    const reqSub = taskDetail.requiredSubmittals ?? 0;
    const reqInsp = taskDetail.requiredInspections ?? 0;
    const total = reqSub + reqInsp;
    const filled = Math.min(submittalsCurrent, reqSub) + Math.min(inspectionsCurrent, reqInsp);
    const pending = submittalsCounts.pending + inspectionsCounts.pending;

    // needsReviewCount rolls up to parents (matching buildTaskTree); push the
    // delta up the ancestor chain so parent badges stay correct. requirementsTotal
    // / requirementsFilled are per-task (leaf only — never rolled up).
    const delta = pending - Number(record.get('needsReviewCount') ?? 0);

    record.set({
      requirementsTotal: total,
      requirementsFilled: filled,
      needsReviewCount: pending,
    });

    if (delta !== 0) {
      let ancestor = (record as unknown as { parent?: BryntumTaskRecord | null }).parent;
      while (ancestor && !(ancestor as unknown as { isRoot?: boolean }).isRoot) {
        const current = Number(ancestor.get('needsReviewCount') ?? 0);
        ancestor.set('needsReviewCount', Math.max(0, current + delta));
        ancestor = (ancestor as unknown as { parent?: BryntumTaskRecord | null }).parent;
      }
    }
  }, [
    open,
    ganttInstance,
    taskId,
    taskDetail,
    counts,
    submittalsCurrent,
    inspectionsCurrent,
    submittalsCounts.pending,
    inspectionsCounts.pending,
  ]);

  const coverImageUrl = taskDetail?.coverImageUrl ?? null;
  const hasRightPanel = rightPanel !== null;

  // The nav set is a snapshot frozen at click time; overlay the current doc's
  // live approval state from listByTask (which the approve toggle invalidates)
  // so stepping away and back never shows a stale approved/pending badge.
  const currentPreviewDoc = useMemo<PreviewDoc | null>(() => {
    if (!preview) return null;
    const snap = preview.docs[preview.index];
    if (!snap) return null;
    const live = ((allDocs ?? []) as DocumentItem[]).find((d) => d.id === snap.id);
    return live
      ? { ...snap, approvalStatus: live.approvalStatus, approvedAt: live.approvedAt, approvedBy: live.approvedBy }
      : snap;
  }, [preview, allDocs]);
  const selectedDocId = currentPreviewDoc?.id ?? null;

  return (
    <>
      <Popover
        open={open}
        anchorReference="anchorPosition"
        anchorPosition={popoverPlacement?.anchorPosition}
        // While the drawer is open, ignore backdrop clicks and Esc on the
        // popover so interacting with the drawer doesn't dismiss the popover
        // underneath. The drawer has its own close button + backdrop.
        onClose={(_event, reason) => {
          if (drawerKind && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
          handleClose();
        }}
        transformOrigin={
          popoverPlacement?.transformOrigin ?? { vertical: 'center', horizontal: 'left' }
        }
        slotProps={{
          paper: {
            sx: {
              m: popoverPlacement?.paperMargin ?? '0 0 0 8px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'var(--shadow-modal)',
              maxHeight: '85vh',
              width: hasRightPanel ? POPOVER_EXPANDED_WIDTH : POPOVER_WIDTH,
              transition: isDragging ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              marginLeft: `${dragOffset.x}px`,
              marginTop: `${dragOffset.y}px`,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', position: 'relative' }}>
          <RequirementsSavedBanner notice={savedNotice} />
          {/* ── LEFT PANEL ── */}
          <Box sx={{ width: POPOVER_WIDTH, flexShrink: 0, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Drag handle */}
            <Box
              {...bindDrag()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: '5px',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                '&:hover .drag-pill': { opacity: 0.5 },
              }}
            >
              <Box
                className="drag-pill"
                sx={{
                  width: 32,
                  height: 3.5,
                  borderRadius: '999px',
                  bgcolor: 'text.primary',
                  opacity: 0.15,
                  transition: 'opacity 0.15s',
                }}
              />
            </Box>

            <TaskHeader
              taskName={taskName}
              taskDetail={taskDetail}
              taskDetailLoading={taskDetailLoading}
              effectiveCsiCode={effectiveCsiCode}
              isSavingCsi={isSavingCsi}
              onClose={handleClose}
              onOpenCsiPanel={openCsiPanel}
              onScrollToRequirements={handleScrollToRequirements}
              onOpenRequirementsDrawer={
                canManageSlots ? () => setDrawerKind('submittal') : undefined
              }
              submittalsCurrent={submittalsCurrent}
              inspectionsCurrent={inspectionsCurrent}
            />

            <CoverImageBanner
              taskId={taskId}
              projectId={projectId}
              organizationId={organizationId}
              coverImageUrl={coverImageUrl}
              canManage={canManageCover}
            />

            <Divider sx={{ mx: 2 }} />

            {/* ── DOCUMENTS SECTION ── */}
            <Box
              ref={requirementsRef}
              sx={{ p: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 1, scrollMarginTop: '8px' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  sx={{
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    userSelect: 'none',
                    lineHeight: 1,
                  }}
                >
                  Files
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    component="button"
                    onClick={expandAll}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'text.secondary',
                      opacity: 0.6,
                      p: 0,
                      fontSize: '0.5625rem',
                      fontWeight: 500,
                      letterSpacing: '0.05em',
                      lineHeight: 1,
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <ArrowsOutSimple size={10} weight="bold" />
                    Expand
                  </Box>
                  {expandedFolders.size > 0 && (
                    <Box
                      component="button"
                      onClick={collapseAll}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'text.secondary',
                        opacity: 0.6,
                        p: 0,
                        fontSize: '0.5625rem',
                        fontWeight: 500,
                        letterSpacing: '0.05em',
                        lineHeight: 1,
                        transition: 'opacity 0.15s',
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <ArrowsInSimple size={10} weight="bold" />
                      Collapse
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {folderData.map((folder) => {
                  const count = counts?.[folder.id]?.total ?? 0;
                  const folderDocs = ((allDocs ?? []) as DocumentItem[]).filter(
                    (d) => d.folderId === folder.id
                  );

                  // For trackable folders, sum counts across parent + child IDs
                  let trackingCurrent: number | undefined;
                  let trackingApproved: number | undefined;
                  let trackingPending: number | undefined;
                  let trackingRequired: number | null | undefined;
                  if (folder.trackable && folder.requirementField) {
                    const allIds = expandFolderIds(folder.id);
                    let total = 0;
                    let approved = 0;
                    for (const id of allIds) {
                      const c = counts?.[id];
                      total += c?.total ?? 0;
                      approved += c?.approved ?? 0;
                    }
                    trackingCurrent = approved;
                    trackingApproved = approved;
                    trackingPending = total - approved;
                    trackingRequired = taskDetail?.[folder.requirementField] ?? null;
                  }

                  return (
                    <FolderRow
                      key={folder.id}
                      folder={folder}
                      isExpanded={expandedFolders.has(folder.id)}
                      onToggle={() => toggleFolder(folder.id)}
                      count={count}
                      docs={folderDocs}
                      onUpload={openUploadDialog}
                      onUploadFile={handleUploadFile}
                      onSelectDoc={openPreview}
                      selectedDocId={selectedDocId}
                      // Tracking props
                      required={trackingRequired}
                      current={trackingCurrent}
                      approved={trackingApproved}
                      pending={trackingPending}
                      canManage={canManageRequirements}
                      onSaveRequirement={
                        folder.requirementField
                          ? (count) => handleSaveRequirement(folder.requirementField!, count)
                          : undefined
                      }
                      isRequirementPending={setSlotCountMutation.isPending}
                      projectId={projectId}
                      taskId={taskId}
                      organizationId={organizationId}
                      onManage={
                        folder.trackable && canManageSlots
                          ? () => setDrawerKind(folder.id === 'submittals' ? 'submittal' : 'inspection')
                          : undefined
                      }
                      memberRole={memberRole}
                      uploadingSlotIds={uploadingSlotIds}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* ── RIGHT PANEL (CSI classification) ── */}
          {rightPanel?.type === 'csi' && (
            <>
              <Divider orientation="vertical" flexItem />
              <CsiCodePanel
                csiCode={effectiveCsiCode}
                taskId={taskId!}
                ganttInstance={ganttInstance}
                projectId={projectId}
                canManage={canManageCover}
                onOpenDocument={openPreview}
                onCodeChange={setPendingCsiCode}
                onClose={closeRightPanel}
              />
            </>
          )}
        </Box>
      </Popover>

      {/* Document preview popup (opens over the popover) */}
      <DocumentPreviewDialog
        open={preview !== null && currentPreviewDoc !== null}
        doc={currentPreviewDoc}
        index={preview?.index ?? 0}
        total={preview?.docs.length ?? 0}
        onStep={stepPreview}
        onClose={() => setPreview(null)}
        approvable={preview?.approvable ?? false}
        organizationId={organizationId}
        memberRole={memberRole}
      />

      {/* Upload dialog */}
      {uploadTarget && taskId && (() => {
        // Snapshot the slotId so the lifecycle callbacks survive the dialog
        // closing — `setUploadTarget(null)` runs synchronously inside
        // onOpenChange, but the upload resolves later. Reading
        // `uploadTarget.slotId` from inside the callback at that point would
        // dereference null.
        const slotIdSnapshot = uploadTarget.slotId;
        return (
          <UploadDialog
            open
            onOpenChange={(isOpen) => {
              if (!isOpen) setUploadTarget(null);
            }}
            projectId={projectId}
            taskId={taskId}
            folderId={uploadTarget.folder.id}
            folderName={uploadTarget.folder.name}
            slotId={slotIdSnapshot}
            onUploadComplete={handleUploadComplete}
            // Only the slot-bound path needs the lifecycle hooks — the "+" button
            // upload path has no slot to badge, the global chip alone covers it.
            onUploadStart={
              slotIdSnapshot ? () => markSlotUploading(slotIdSnapshot, true) : undefined
            }
            onUploadEnd={
              slotIdSnapshot ? () => markSlotUploading(slotIdSnapshot, false) : undefined
            }
          />
        );
      })()}

      {/* Submittal/inspection management drawer */}
      {drawerKind && taskId && (
        <SubmittalDrawer
          open
          onClose={() => setDrawerKind(null)}
          organizationId={organizationId}
          projectId={projectId}
          taskId={taskId}
          taskName={taskName}
          memberRole={memberRole}
          initialKind={drawerKind}
          onSaved={handleRequirementsSaved}
          docsByKind={{
            submittal: ((allDocs ?? []) as DocumentItem[]).filter((d) =>
              expandFolderIds('submittals').includes(d.folderId),
            ),
            inspection: ((allDocs ?? []) as DocumentItem[]).filter((d) =>
              expandFolderIds('inspections').includes(d.folderId),
            ),
          }}
          onUploadToFolder={(folderId, slotId) => {
            const folder = folderData.find((f) => f.id === folderId);
            if (folder) openUploadDialog({ id: folder.id, name: folder.name }, slotId);
          }}
        />
      )}
    </>
  );
}

// Transient "requirements saved" confirmation, overlaid at the top of the
// popover after the drawer commits and auto-closes. Slides down, then the
// parent unmounts it on a timer.
function RequirementsSavedBanner({ notice }: { notice: { kind: SlotKind; count: number } | null }) {
  if (!notice) return null;
  const label = notice.kind === 'submittal' ? 'submittal' : 'inspection';
  const message =
    notice.count === 0
      ? `${label === 'submittal' ? 'Submittal' : 'Inspection'} requirements cleared`
      : `${notice.count} ${notice.count === 1 ? label : `${label}s`} required · saved`;
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.875,
        borderRadius: '999px',
        bgcolor: 'success.main',
        color: 'success.contrastText',
        boxShadow: '0 8px 24px -6px rgba(0,0,0,0.25)',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        animation: 'reqSavedIn 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes reqSavedIn': {
          from: { opacity: 0, transform: 'translate(-50%, -8px)' },
          to: { opacity: 1, transform: 'translate(-50%, 0)' },
        },
      }}
    >
      <CheckCircle size={15} weight="fill" />
      {message}
    </Box>
  );
}
