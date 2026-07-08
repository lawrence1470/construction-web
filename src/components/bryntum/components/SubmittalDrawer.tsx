'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  X,
  Minus,
  Plus,
  PaperPlaneTilt,
  ClipboardText,
  CheckCircle,
  CloudArrowUp,
  WarningCircle,
  Tray,
  PencilSimple,
} from '@phosphor-icons/react';
import { format, isBefore, startOfDay } from 'date-fns';

import { api, type RouterOutputs } from '@/trpc/react';
import type { SlotKind } from '@/lib/validations/gantt';
import { nextSuggestedSlotName } from '@/lib/constants/slotNameLibrary';
import UserAvatar from '@/components/ui/UserAvatar';
import ApprovalToggleSwitch from './task-popover/ApprovalToggleSwitch';
import type { DocumentItem } from './task-popover/types';

const SUBMITTAL_COLOR = '#2563EB';
// Indigo signals "received, awaiting approval" — matches the "in review"
// pill convention used by FolderRow in the task popover, and intentionally
// differs from the solid green used for "approved".
const RECEIVED_COLOR = '#4f46e5';
const INSPECTION_COLOR = '#8E44AD';

const KIND_META: Record<SlotKind, {
  label: string;
  pluralLabel: string;
  color: string;
  icon: typeof PaperPlaneTilt;
  folderId: 'submittals' | 'inspections';
  uploadCta: string;
}> = {
  submittal: {
    label: 'submittal',
    pluralLabel: 'submittals',
    color: SUBMITTAL_COLOR,
    icon: PaperPlaneTilt,
    folderId: 'submittals',
    uploadCta: 'Upload submittal',
  },
  inspection: {
    label: 'inspection',
    pluralLabel: 'inspections',
    color: INSPECTION_COLOR,
    icon: ClipboardText,
    folderId: 'inspections',
    uploadCta: 'Upload report',
  },
};

interface SubmittalDrawerProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  taskId: string;
  taskName: string;
  /** Current user's org-membership role — gates the inline approval toggle. */
  memberRole: string;
  initialKind?: SlotKind;
  /** Documents already uploaded under this task — used for the tab badge counts. */
  docsByKind: Record<SlotKind, DocumentItem[]>;
  /**
   * Fired after a successful Save with the saved kind + slot count. The parent
   * uses this to auto-close the drawer and surface a confirmation on the popover.
   */
  onSaved: (info: { kind: SlotKind; count: number }) => void;
  /**
   * Open the upload dialog for a given folder. Pass a `slotId` to bind the
   * upload to a specific slot; omit it to let the server auto-link to the
   * first empty slot.
   */
  onUploadToFolder: (folderId: 'submittals' | 'inspections', slotId?: string) => void;
}

export default function SubmittalDrawer({
  open,
  onClose,
  organizationId,
  projectId,
  taskId,
  taskName,
  memberRole,
  initialKind = 'submittal',
  docsByKind,
  onSaved,
  onUploadToFolder,
}: SubmittalDrawerProps) {
  const [activeKind, setActiveKind] = useState<SlotKind>(initialKind);
  // Lifted from DrawerContent so the parent can guard tab-switch / close while
  // there are uncommitted draft edits.
  const [dirty, setDirty] = useState(false);
  // A pending navigation intent that's blocked behind the discard confirm.
  const [guard, setGuard] = useState<{ type: 'close' } | { type: 'switch'; kind: SlotKind } | null>(null);

  // Reset to the requested kind whenever the drawer (re)opens.
  useEffect(() => {
    if (open) setActiveKind(initialKind);
  }, [open, initialKind]);

  const requestClose = () => {
    if (dirty) setGuard({ type: 'close' });
    else onClose();
  };

  const requestSwitch = (kind: SlotKind) => {
    if (kind === activeKind) return;
    if (dirty) setGuard({ type: 'switch', kind });
    else setActiveKind(kind);
  };

  const confirmGuard = () => {
    if (!guard) return;
    // Switching kinds re-initializes DrawerContent's draft from server, so the
    // pending edits are dropped — clear dirty eagerly to keep the bar honest.
    setDirty(false);
    if (guard.type === 'close') {
      setGuard(null);
      onClose();
    } else {
      setActiveKind(guard.kind);
      setGuard(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={requestClose}
      // Sit above the task popover (MUI Popover default is 1300).
      sx={{ zIndex: 1500 }}
      PaperProps={{
        sx: {
          width: 480,
          maxWidth: '100vw',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DrawerHeader
        kind={activeKind}
        taskName={taskName}
        onClose={requestClose}
      />

      <KindTabs
        activeKind={activeKind}
        onChange={requestSwitch}
        countSubmittal={docsByKind.submittal.length}
        countInspection={docsByKind.inspection.length}
      />

      <DrawerContent
        organizationId={organizationId}
        projectId={projectId}
        taskId={taskId}
        memberRole={memberRole}
        kind={activeKind}
        onDirtyChange={setDirty}
        onSaved={(info) => {
          setDirty(false);
          onSaved(info);
        }}
        onUploadToFolder={(slotId) => onUploadToFolder(KIND_META[activeKind].folderId, slotId)}
      />

      {guard && (
        <ConfirmDialog
          title="Discard unsaved changes?"
          description="You have requirement edits that haven't been saved. Leaving now will discard them."
          cancelLabel="Keep editing"
          confirmLabel="Discard"
          onCancel={() => setGuard(null)}
          onConfirm={confirmGuard}
        />
      )}
    </Drawer>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Header
// ────────────────────────────────────────────────────────────────────────────
function DrawerHeader({
  kind,
  taskName,
  onClose,
}: {
  kind: SlotKind;
  taskName: string;
  onClose: () => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2.5,
        py: 1.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '8px',
          bgcolor: `${meta.color}1F`,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background-color 0.2s, color 0.2s',
        }}
      >
        <Icon size={14} weight="regular" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.005em' }}>
          Manage {meta.pluralLabel}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            mt: 0.25,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {taskName}
        </Typography>
      </Box>
      <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }} aria-label="Close drawer">
        <X size={16} />
      </IconButton>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tab toggle
// ────────────────────────────────────────────────────────────────────────────
function KindTabs({
  activeKind,
  onChange,
  countSubmittal,
  countInspection,
}: {
  activeKind: SlotKind;
  onChange: (k: SlotKind) => void;
  countSubmittal: number;
  countInspection: number;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.25,
        px: 1.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <KindTab kind="submittal" active={activeKind === 'submittal'} onClick={() => onChange('submittal')} count={countSubmittal} />
      <KindTab kind="inspection" active={activeKind === 'inspection'} onClick={() => onChange('inspection')} count={countInspection} />
    </Box>
  );
}

function KindTab({
  kind,
  active,
  onClick,
  count,
}: {
  kind: SlotKind;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.875,
        px: 1.5,
        py: 1.25,
        background: 'transparent',
        border: 'none',
        borderBottom: '2px solid',
        borderColor: active ? meta.color : 'transparent',
        marginBottom: '-1px',
        cursor: 'pointer',
        color: active ? meta.color : 'text.secondary',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 500,
        transition: 'color 0.15s, border-color 0.15s',
        '&:hover': { color: active ? meta.color : 'text.primary' },
      }}
    >
      <Icon size={13} weight={active ? 'fill' : 'regular'} />
      {meta.pluralLabel.charAt(0).toUpperCase() + meta.pluralLabel.slice(1)}
      <Box
        sx={{
          fontSize: 10,
          fontWeight: 600,
          px: 0.875,
          py: '1px',
          borderRadius: '999px',
          bgcolor: active ? `${meta.color}1F` : 'action.selected',
          color: active ? meta.color : 'text.secondary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Body — draft editor: stepper + slot list, committed only on Save
// ────────────────────────────────────────────────────────────────────────────

// A local, uncommitted slot definition. `serverId` is null until the row has
// been persisted — that's also what gates uploads (you can't attach a file to
// a slot that doesn't exist server-side yet).
type DraftSlot = {
  key: string;
  serverId: string | null;
  name: string;
  dueDate: string; // '' or yyyy-MM-dd
};

type ServerSlot = RouterOutputs['gantt']['listSlots'][number];

function toDraft(slot: ServerSlot): DraftSlot {
  return {
    key: slot.id,
    serverId: slot.id,
    name: slot.name ?? '',
    dueDate: slot.dueDate ? toInputDate(slot.dueDate) : '',
  };
}

function DrawerContent({
  organizationId,
  projectId,
  taskId,
  memberRole,
  kind,
  onDirtyChange,
  onSaved,
  onUploadToFolder,
}: {
  organizationId: string;
  projectId: string;
  taskId: string;
  memberRole: string;
  kind: SlotKind;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (info: { kind: SlotKind; count: number }) => void;
  onUploadToFolder: (slotId?: string) => void;
}) {
  const meta = KIND_META[kind];
  const utils = api.useUtils();

  const slotsQuery = api.gantt.listSlots.useQuery(
    { organizationId, projectId, taskId, kind },
    { enabled: !!organizationId && !!projectId && !!taskId },
  );

  // `baseline` is the last-known-saved definition; `draft` is what the user is
  // editing. Both are local — nothing hits the server until Save. Documents
  // (the "received" binding) are always read live from the query, so an upload
  // landing while the drawer is open is reflected without clobbering edits.
  const [baseline, setBaseline] = useState<DraftSlot[] | null>(null);
  const [draft, setDraft] = useState<DraftSlot[] | null>(null);
  const newKeyCounter = useRef(0);
  const nextKey = () => `new-${newKeyCounter.current++}`;

  // Seed baseline + draft from the server, once per kind. `seededKind` guards
  // against reseeding on later refetches (e.g. an upload binding a doc), which
  // would clobber the user's in-progress edits. Switching kind clears it so
  // the new kind's data seeds a fresh draft; the parent already guards that
  // switch behind the discard confirm when there are unsaved changes.
  const seededKind = useRef<SlotKind | null>(null);
  useEffect(() => {
    if (seededKind.current !== kind) {
      seededKind.current = null;
      setBaseline(null);
      setDraft(null);
    }
    if (slotsQuery.data && seededKind.current !== kind) {
      seededKind.current = kind;
      const initial = slotsQuery.data.map(toDraft);
      setBaseline(initial);
      setDraft(initial);
    }
  }, [kind, slotsQuery.data]);

  const docByServerId = useMemo(() => {
    const map = new Map<string, ServerSlot['document']>();
    (slotsQuery.data ?? []).forEach((s) => {
      if (s.document) map.set(s.id, s.document);
    });
    return map;
  }, [slotsQuery.data]);

  const docFor = (row: DraftSlot) => (row.serverId ? docByServerId.get(row.serverId) ?? null : null);

  const changeCount = useMemo(() => {
    if (!draft || !baseline) return 0;
    const draftServerIds = new Set(draft.filter((d) => d.serverId).map((d) => d.serverId));
    const baseById = new Map(baseline.filter((b) => b.serverId).map((b) => [b.serverId, b] as const));
    let count = draft.filter((d) => !d.serverId).length; // added
    count += baseline.filter((b) => b.serverId && !draftServerIds.has(b.serverId)).length; // removed
    draft.forEach((d) => {
      if (!d.serverId) return;
      const b = baseById.get(d.serverId);
      if (b && (d.name.trim() !== b.name.trim() || d.dueDate !== b.dueDate)) count += 1; // edited
    });
    return count;
  }, [draft, baseline]);

  const isDirty = changeCount > 0;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // ── Save ──────────────────────────────────────────────────────────────
  const [showSaved, setShowSaved] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const saveMutation = api.gantt.saveSlots.useMutation({
    onSuccess: (saved) => {
      // Adopt the canonical server result so brand-new rows pick up their real
      // ids (and dirty resets to clean → the close below won't trip the guard).
      const next = saved.map((s) => ({
        key: s.id,
        serverId: s.id,
        name: s.name ?? '',
        dueDate: s.dueDate ? toInputDate(s.dueDate) : '',
      }));
      setBaseline(next);
      setDraft(next);
      void utils.gantt.listSlots.invalidate({ organizationId, projectId, taskId, kind });
      void utils.gantt.taskDetail.invalidate({ organizationId, projectId, taskId });
      void utils.gantt.requirementStats.invalidate({ projectId });
      // Flash "Saved ✓" on the button so the click feels confirmed, then hand
      // off to the parent to auto-close the drawer + surface the confirmation
      // banner on the popover underneath.
      setShowSaved(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        onSaved({ kind, count: next.length });
      }, 650);
    },
  });

  const handleSave = () => {
    if (!draft || !isDirty || saveMutation.isPending) return;
    saveMutation.mutate({
      organizationId,
      projectId,
      taskId,
      kind,
      slots: draft.map((d) => ({
        id: d.serverId,
        name: d.name.trim() || null,
        dueDate: d.dueDate || null,
      })),
    });
  };

  const handleDiscard = () => {
    if (baseline) setDraft(baseline);
  };

  // ── Draft mutators ────────────────────────────────────────────────────
  const addSlots = (n: number) => {
    setDraft((prev) => {
      const rows = prev ?? [];
      const names: (string | null)[] = rows.map((r) => r.name || null);
      const additions: DraftSlot[] = [];
      for (let i = 0; i < n; i++) {
        const suggested = nextSuggestedSlotName(kind, names) ?? '';
        names.push(suggested || null);
        additions.push({ key: nextKey(), serverId: null, name: suggested, dueDate: '' });
      }
      return [...rows, ...additions];
    });
  };

  // Decrement-with-data confirm state.
  const [confirmRemove, setConfirmRemove] = useState<null | { trailingFilled: number; nextCount: number }>(null);

  const handleStepCount = (next: number) => {
    if (!draft || next < 0 || next > 50) return;
    if (next > draft.length) {
      addSlots(next - draft.length);
    } else if (next < draft.length) {
      // Removing trailing slots — warn if any removed slot has a bound document.
      // The file survives (FK is ON DELETE SET NULL), but the user should know
      // the upload will detach when they save.
      const trailingFilled = draft.slice(next).filter((d) => docFor(d)).length;
      if (trailingFilled > 0) {
        setConfirmRemove({ trailingFilled, nextCount: next });
        return;
      }
      setDraft(draft.slice(0, next));
    }
  };

  const confirmAndShrink = () => {
    if (!confirmRemove || !draft) return;
    setDraft(draft.slice(0, confirmRemove.nextCount));
    setConfirmRemove(null);
  };

  const setRowName = (key: string, name: string) => {
    setDraft((prev) => (prev ? prev.map((r) => (r.key === key ? { ...r, name } : r)) : prev));
  };
  const setRowDue = (key: string, dueDate: string) => {
    setDraft((prev) => (prev ? prev.map((r) => (r.key === key ? { ...r, dueDate } : r)) : prev));
  };

  const isLoading = slotsQuery.isLoading || draft === null;
  const rows = draft ?? [];

  // Summary counts across the draft.
  const today = startOfDay(new Date());
  let receivedCount = 0;
  let draftCount = 0;
  let overdueCount = 0;
  rows.forEach((r) => {
    const doc = docFor(r);
    if (doc) { receivedCount += 1; return; }
    if (!r.serverId) { draftCount += 1; return; }
    if (r.dueDate && isBefore(new Date(r.dueDate), today)) overdueCount += 1;
  });
  const pendingCount = rows.length - receivedCount - draftCount - overdueCount;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>

        {/* Required count card */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            px: 1.75,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            // Nested panel inside the elevated drawer — lift with a tint rather
            // than dropping to background.default, which inverts to a dark hole
            // in dark mode (drawer is already background.paper).
            bgcolor: 'action.hover',
            mb: 2.25,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
              Required {meta.pluralLabel}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25, lineHeight: 1.3 }}>
              How many must be received for this task
            </Typography>
          </Box>
          <Stepper
            value={rows.length}
            onChange={handleStepCount}
            disabled={isLoading || saveMutation.isPending}
          />
        </Box>

        {/* Section label */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25 }}>
          <Typography
            sx={{
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Slots
          </Typography>
          <Typography sx={{ ml: 'auto', fontSize: 11, color: 'text.secondary' }}>
            <SlotSummary
              received={receivedCount}
              draft={draftCount}
              overdue={overdueCount}
              pending={pendingCount}
            />
          </Typography>
        </Box>

        {/* Slot list / empty state */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={16} />
          </Box>
        ) : rows.length === 0 ? (
          <EmptyState kind={kind} onSeed={(count) => addSlots(count)} />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rows.map((row, idx) => (
              <SlotCard
                key={row.key}
                index={idx}
                kind={kind}
                row={row}
                doc={docFor(row)}
                isNew={!row.serverId}
                organizationId={organizationId}
                memberRole={memberRole}
                onRename={(name) => setRowName(row.key, name)}
                onSetDueDate={(dueDate) => setRowDue(row.key, dueDate)}
                onUpload={() => {
                  if (row.serverId) onUploadToFolder(row.serverId);
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      <SaveBar
        dirty={isDirty}
        changeCount={changeCount}
        saving={saveMutation.isPending}
        saved={showSaved}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {/* Decrement confirm */}
      {confirmRemove && (
        <ConfirmDialog
          title="Remove filled slot?"
          description={
            <>
              {confirmRemove.trailingFilled === 1
                ? '1 slot has'
                : `${confirmRemove.trailingFilled} slots have`}{' '}
              an uploaded {meta.label}. Removing will detach the file
              {confirmRemove.trailingFilled === 1 ? '' : 's'} from the slot but keep
              {confirmRemove.trailingFilled === 1 ? ' it' : ' them'} in the project&apos;s library.
            </>
          }
          cancelLabel="Cancel"
          confirmLabel="Remove"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={confirmAndShrink}
        />
      )}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Save bar — replaces the old "saves automatically" footer
// ────────────────────────────────────────────────────────────────────────────
function SaveBar({
  dirty,
  changeCount,
  saving,
  saved,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  changeCount: number;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const status: 'saving' | 'saved' | 'idle' = saving ? 'saving' : saved ? 'saved' : 'idle';
  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2.5,
        py: 1.5,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, minWidth: 0 }}>
        {dirty ? (
          <>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'warning.main',
                boxShadow: '0 0 0 3px rgba(217,119,6,0.18)',
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.primary' }}>
              {changeCount} unsaved {changeCount === 1 ? 'change' : 'changes'}
            </Typography>
          </>
        ) : (
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: status === 'saved' ? 'success.main' : 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.625,
            }}
          >
            {status === 'saved' && <CheckCircle size={13} weight="fill" />}
            {status === 'saved' ? 'All changes saved' : 'No unsaved changes'}
          </Typography>
        )}
      </Box>

      {dirty && (
        <Box
          component="button"
          type="button"
          onClick={onDiscard}
          disabled={saving}
          sx={{
            ml: 'auto',
            background: 'transparent',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 500,
            color: 'text.secondary',
            cursor: saving ? 'default' : 'pointer',
            p: 0.5,
            '&:hover': { color: 'text.primary' },
          }}
        >
          Discard
        </Box>
      )}

      <Box
        component="button"
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        aria-label="Save requirements"
        sx={{
          ml: dirty ? 0 : 'auto',
          minWidth: 104,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          px: 1.75,
          py: 0.875,
          borderRadius: '8px',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          cursor: !dirty || saving ? 'default' : 'pointer',
          color: status === 'saved' ? 'success.contrastText' : 'primary.contrastText',
          bgcolor: status === 'saved' ? 'success.main' : 'primary.main',
          opacity: !dirty && status !== 'saved' ? 0.45 : 1,
          transition: 'background-color 0.25s, transform 0.12s, opacity 0.2s',
          transform: status === 'saved' ? 'scale(1.04)' : 'scale(1)',
          '&:hover': {
            bgcolor: status === 'saved' ? 'success.main' : 'primary.dark',
          },
        }}
      >
        {status === 'saving' ? (
          <>
            <CircularProgress size={13} thickness={5} sx={{ color: 'inherit' }} />
            Saving…
          </>
        ) : status === 'saved' ? (
          <>
            <CheckCircle size={15} weight="fill" />
            Saved
          </>
        ) : (
          'Save'
        )}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stepper
// ────────────────────────────────────────────────────────────────────────────
function Stepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        overflow: 'hidden',
        // Raised above the Required-count card (now action.hover) so the
        // control stays distinct in dark mode.
        bgcolor: 'action.selected',
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 0}
        sx={{ width: 30, height: 32, borderRadius: 0, color: 'text.secondary' }}
        aria-label="Decrease required count"
      >
        <Minus size={11} weight="bold" />
      </IconButton>
      <Box
        sx={{
          width: 38,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderColor: 'divider',
          lineHeight: '32px',
        }}
      >
        {value}
      </Box>
      <IconButton
        size="small"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= 50}
        sx={{ width: 30, height: 32, borderRadius: 0, color: 'text.secondary' }}
        aria-label="Increase required count"
      >
        <Plus size={11} weight="bold" />
      </IconButton>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Slot summary text
// ────────────────────────────────────────────────────────────────────────────
function SlotSummary({
  received,
  draft,
  overdue,
  pending,
}: {
  received: number;
  draft: number;
  overdue: number;
  pending: number;
}) {
  const parts: React.ReactNode[] = [];
  if (received > 0) {
    parts.push(
      <Box key="r" component="span" sx={{ color: RECEIVED_COLOR, fontWeight: 600 }}>
        {received} received
      </Box>,
    );
  }
  if (draft > 0) {
    parts.push(
      <Box key="d" component="span" sx={{ color: SUBMITTAL_COLOR, fontWeight: 600 }}>
        {draft} draft
      </Box>,
    );
  }
  if (overdue > 0) {
    parts.push(
      <Box key="o" component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
        {overdue} overdue
      </Box>,
    );
  }
  if (pending > 0) {
    parts.push(
      <span key="p">{pending} pending</span>,
    );
  }
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' · ' : null}
          {part}
        </React.Fragment>
      ))}
      {parts.length === 0 ? '—' : null}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Slot card
// ────────────────────────────────────────────────────────────────────────────

// SlotCard only renders the bound document's name + upload date in the
// footer, so we type doc minimally to accept whatever listSlots returns.
type SlotBoundDoc = {
  id: string;
  name: string;
  createdAt: Date | string | null;
  approvalStatus: string;
  approvedAt: Date | string | null;
  approvedBy: { id: string; name: string | null; email: string } | null;
};

function SlotCard({
  index,
  kind,
  row,
  doc,
  isNew,
  organizationId,
  memberRole,
  onRename,
  onSetDueDate,
  onUpload,
}: {
  index: number;
  kind: SlotKind;
  row: DraftSlot;
  doc: SlotBoundDoc | null;
  /** True for an uncommitted draft slot — uploads are gated until saved. */
  isNew: boolean;
  organizationId: string;
  memberRole: string;
  onRename: (name: string) => void;
  onSetDueDate: (dueDate: string) => void;
  onUpload: () => void;
}) {
  const theme = useTheme();
  const meta = KIND_META[kind];
  const isReceived = !!doc;
  const isApproved = isReceived && doc.approvalStatus === 'approved';
  const isOverdue = !isReceived && !isNew && !!row.dueDate && isBefore(new Date(row.dueDate), startOfDay(new Date()));

  // Local input state so typing doesn't re-render sibling cards per keystroke;
  // the edit is committed to the parent draft on blur.
  const [draftName, setDraftName] = useState(row.name);
  useEffect(() => setDraftName(row.name), [row.name]);

  const commitName = () => {
    if (draftName === row.name) return;
    onRename(draftName);
  };

  // Native date input — local state so calendar picker doesn't fire mid-edit.
  const [draftDue, setDraftDue] = useState(row.dueDate);
  useEffect(() => setDraftDue(row.dueDate), [row.dueDate]);
  const commitDue = () => {
    if (draftDue === row.dueDate) return;
    onSetDueDate(draftDue);
  };

  // Due date is optional — collapsed to a "+ Add due date" button until the
  // user opts in or a value already exists on the slot.
  const [dueDateExpanded, setDueDateExpanded] = useState(false);
  const dueDateInputRef = useRef<HTMLInputElement | null>(null);
  const showDueDateField = !!row.dueDate || dueDateExpanded;

  // Tint hierarchy: approved (green) > received (indigo) > overdue (amber).
  // Received-but-not-approved is intentionally distinct from approved so the
  // reviewer can tell at a glance which slots still need their decision.
  const cardTintColor = isApproved
    ? 'success.main'
    : isReceived
      ? RECEIVED_COLOR
      : isOverdue
        ? 'warning.main'
        : null;
  // Only overdue gets a colored border — received/approved rely on tint + pill
  // for their visual signal so the cards don't shout for attention. Draft
  // (unsaved) slots get a dashed border to read as "not yet committed".
  const cardBorderColor = isOverdue ? 'warning.main' : 'divider';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderStyle: isNew ? 'dashed' : 'solid',
        borderColor: cardBorderColor,
        borderRadius: '10px',
        px: 1.75,
        py: 1.5,
        bgcolor: 'background.paper',
        position: 'relative',
        '&::before': cardTintColor ? {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: '10px',
          bgcolor: cardTintColor,
          opacity: isReceived && !isApproved ? 0.04 : 0.05,
          pointerEvents: 'none',
        } : undefined,
        transition: 'border-color 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25, position: 'relative' }}>
        <SlotNumberBadge index={index} kind={kind} isReceived={isReceived} isApproved={isApproved} />
        <SlotNameInput
          value={draftName}
          onChange={setDraftName}
          onCommit={commitName}
          placeholder={`Name this ${meta.label}…`}
          color={meta.color}
        />
        <SlotStatusPill received={isReceived} overdue={!!isOverdue} approved={isApproved} draft={isNew} />
      </Box>

      <Box sx={{ position: 'relative' }}>
        {showDueDateField ? (
          <FieldSlot label="Due date">
            <Box
              ref={dueDateInputRef}
              component="input"
              type="date"
              value={draftDue}
              onChange={(e) => setDraftDue(e.target.value)}
              onBlur={commitDue}
              sx={{
                fontFamily: 'inherit',
                fontSize: 12,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '6px',
                bgcolor: 'background.default',
                color: isOverdue ? 'warning.main' : 'text.primary',
                px: 1,
                py: 0.75,
                outline: 'none',
                width: '100%',
                transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'text.disabled' },
                '&:focus': { borderColor: meta.color },
              }}
            />
          </FieldSlot>
        ) : (
          <Box
            component="button"
            type="button"
            onClick={() => {
              setDueDateExpanded(true);
              // Defer focus until after the input mounts.
              requestAnimationFrame(() => dueDateInputRef.current?.focus());
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 500,
              color: 'text.secondary',
              bgcolor: 'transparent',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s, background-color 0.15s',
              '&:hover': {
                color: meta.color,
                borderColor: meta.color,
                bgcolor: `${meta.color}0F`,
              },
            }}
          >
            <Plus size={11} weight="bold" />
            Add due date
          </Box>
        )}
      </Box>

      {/* Footer: file info or upload CTA */}
      <Box
        sx={{
          mt: 1.25,
          pt: 1.25,
          borderTop: '1px dashed',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 11,
          position: 'relative',
        }}
      >
        {isReceived ? (
          <>
            {isApproved ? (
              <CheckCircle size={13} weight="fill" color={theme.palette.success.main} />
            ) : (
              <Tray size={13} weight="fill" color={RECEIVED_COLOR} />
            )}
            <Box sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}>
              {doc.name}
            </Box>
            <ApprovalToggleSwitch
              documentId={doc.id}
              documentName={doc.name}
              approvalStatus={doc.approvalStatus}
              approvedBy={doc.approvedBy}
              organizationId={organizationId}
              memberRole={memberRole}
              size="sm"
            />
            <Box sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {doc.createdAt ? format(new Date(doc.createdAt), 'MMM d') : ''}
            </Box>
          </>
        ) : (
          <Box
            component="button"
            type="button"
            onClick={onUpload}
            disabled={isNew}
            aria-label={isNew ? 'Save to enable upload' : meta.uploadCta}
            title={isNew ? 'Save this requirement to enable uploads' : undefined}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              border: 'none',
              background: 'transparent',
              cursor: isNew ? 'default' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 500,
              color: isNew ? 'text.disabled' : meta.color,
              p: 0,
              '&:hover': { textDecoration: isNew ? 'none' : 'underline' },
            }}
          >
            <CloudArrowUp size={13} />
            {isNew ? `${meta.uploadCta} · Save first` : meta.uploadCta}
          </Box>
        )}
      </Box>

      {isApproved && doc && <ApprovedByLine doc={doc} />}

    </Box>
  );
}

function ApprovedByLine({ doc }: { doc: SlotBoundDoc }) {
  const approver = doc.approvedBy;
  const approverLabel = approver?.name ?? approver?.email ?? 'a reviewer';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        mt: 1,
        pt: 1,
        borderTop: '1px solid',
        borderColor: 'rgba(22,163,74,0.18)',
        fontSize: 10.5,
        color: 'success.main',
        fontWeight: 500,
      }}
    >
      {approver ? (
        <UserAvatar user={approver} size={16} sx={{ fontSize: 9 }} />
      ) : (
        <CheckCircle size={14} weight="fill" />
      )}
      <Box component="span">Approved by {approverLabel}</Box>
      {doc.approvedAt && (
        <>
          <Box component="span" sx={{ color: 'text.disabled' }}>·</Box>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {format(new Date(doc.approvedAt), 'MMM d')}
          </Box>
        </>
      )}
    </Box>
  );
}

function SlotNumberBadge({
  index,
  kind,
  isReceived,
  isApproved,
}: {
  index: number;
  kind: SlotKind;
  isReceived: boolean;
  isApproved: boolean;
}) {
  const meta = KIND_META[kind];
  // Approved → solid green ✓. Received (not approved) → solid indigo inbox.
  // Empty slot → soft folder-tinted disc with the slot number.
  const bg = isApproved
    ? 'success.main'
    : isReceived
      ? RECEIVED_COLOR
      : `${meta.color}1F`;
  const color = isReceived ? '#fff' : meta.color;
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        bgcolor: bg,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
        boxShadow: isApproved
          ? '0 0 0 3px rgba(22,163,74,0.20)'
          : isReceived
            ? `0 0 0 3px ${alpha(RECEIVED_COLOR, 0.18)}`
            : 'none',
        transition: 'box-shadow 0.15s, background-color 0.2s',
      }}
    >
      {isApproved ? (
        <CheckCircle size={12} weight="fill" />
      ) : isReceived ? (
        <Tray size={12} weight="fill" />
      ) : (
        index + 1
      )}
    </Box>
  );
}

function SlotNameInput({
  value,
  onChange,
  onCommit,
  placeholder,
  color,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  placeholder: string;
  color: string;
}) {
  return (
    <Box
      component="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      sx={{
        flex: 1,
        minWidth: 0,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        background: 'transparent',
        border: 'none',
        borderBottom: '1px dashed transparent',
        outline: 'none',
        color: 'text.primary',
        py: 0.5,
        '&::placeholder': { color: 'text.disabled', fontStyle: 'italic' },
        '&:hover': { borderBottomColor: 'divider' },
        '&:focus': { borderBottomColor: color },
      }}
    />
  );
}

function FieldSlot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 600,
          color: 'text.disabled',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

// Approved → solid green pill with ✓ (the "done" signal).
// Received → indigo tint + border + inbox icon ("awaiting your decision",
//   visually distinct from approved).
// Draft → blue tint + pencil ("added but not saved yet").
// Overdue → amber tint, no icon.
// Pending → neutral gray, no icon.
const PILL_CONFIG = {
  approved: {
    label: 'Approved',
    bg: 'success.main',
    color: 'success.contrastText',
    borderColor: 'transparent',
    icon: <CheckCircle size={11} weight="fill" />,
  },
  received: {
    label: 'Received',
    bg: alpha(RECEIVED_COLOR, 0.10),
    color: RECEIVED_COLOR,
    borderColor: alpha(RECEIVED_COLOR, 0.30),
    icon: <Tray size={11} weight="bold" />,
  },
  draft: {
    label: 'Draft',
    bg: alpha(SUBMITTAL_COLOR, 0.10),
    color: SUBMITTAL_COLOR,
    borderColor: alpha(SUBMITTAL_COLOR, 0.30),
    icon: <PencilSimple size={11} weight="bold" />,
  },
  overdue: {
    label: 'Overdue',
    bg: 'rgba(217,119,6,0.14)',
    color: 'warning.main',
    borderColor: 'transparent',
    icon: null,
  },
  pending: {
    label: 'Pending',
    bg: 'action.selected',
    color: 'text.secondary',
    borderColor: 'transparent',
    icon: null,
  },
} as const;

function SlotStatusPill({
  received,
  overdue,
  approved,
  draft,
}: {
  received: boolean;
  overdue: boolean;
  approved: boolean;
  draft: boolean;
}) {
  const status = approved
    ? 'approved'
    : received
      ? 'received'
      : draft
        ? 'draft'
        : overdue
          ? 'overdue'
          : 'pending';
  const config = PILL_CONFIG[status];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: 10,
        fontWeight: 600,
        px: 0.875,
        py: '2px',
        borderRadius: '999px',
        bgcolor: config.bg,
        color: config.color,
        border: '1px solid',
        borderColor: config.borderColor,
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {config.icon}
      {config.label}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Empty state with quick-seed buttons
// ────────────────────────────────────────────────────────────────────────────
function EmptyState({
  kind,
  onSeed,
}: {
  kind: SlotKind;
  onSeed: (count: number) => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const presets = [1, 3, 5];
  return (
    <Box
      sx={{
        border: '1.5px dashed',
        borderColor: 'divider',
        borderRadius: '12px',
        px: 2.5,
        py: 4,
        textAlign: 'center',
        // Lift above the drawer (see Required-count card) — background.default
        // sinks into a dark hole in dark mode.
        bgcolor: 'action.hover',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'action.selected',
          border: '1px solid',
          borderColor: 'divider',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.25,
          color: 'text.disabled',
        }}
      >
        <Icon size={20} />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
        No {meta.pluralLabel} required
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5, lineHeight: 1.5 }}>
        Use the stepper above, or pick a starting count below.
      </Typography>
      <Box sx={{ display: 'inline-flex', gap: 0.75 }}>
        {presets.map((n) => (
          <Box
            key={n}
            component="button"
            onClick={() => onSeed(n)}
            sx={{
              px: 1.25,
              py: 0.625,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              // Raised above the empty-state card (now action.hover) so the
              // preset chips don't read as cutouts in dark mode.
              bgcolor: 'action.selected',
              color: 'text.primary',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { borderColor: meta.color, color: meta.color },
            }}
          >
            {n} {n === 1 ? meta.label : meta.pluralLabel}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Warning confirm dialog — shared by the destructive-shrink and discard-edits
// prompts. Backdrop click cancels; the confirm button is amber.
// ────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0,0,0,0.32)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1400,
      }}
      onClick={onCancel}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: 360,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          p: 2.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              bgcolor: 'rgba(217,119,6,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WarningCircle size={18} color={theme.palette.warning.main} weight="fill" />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>{title}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
              {description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Box
            component="button"
            onClick={onCancel}
            sx={{
              px: 1.5, py: 0.875,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.primary',
              fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </Box>
          <Box
            component="button"
            onClick={onConfirm}
            sx={{
              px: 1.5, py: 0.875,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'warning.main',
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { filter: 'brightness(0.95)' },
            }}
          >
            {confirmLabel}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function toInputDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return format(date, 'yyyy-MM-dd');
}
