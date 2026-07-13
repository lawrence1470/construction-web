'use client';

import {
  useState,
  useEffect,
  useMemo,
  memo,
  useCallback,
  useRef,
  useDeferredValue,
} from 'react';
import {
  Tag,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
  Check,
  X,
  Prohibit,
  Paperclip,
  UploadSimple,
  Trash,
} from '@phosphor-icons/react';
import { Box, Typography, IconButton, InputBase, Divider, CircularProgress } from '@mui/material';
import { useSnackbar } from '@/hooks/useSnackbar';
import { api } from '@/trpc/react';
import { trackUpload } from '@/store/uploadStatusStore';
import { type CsiSection } from '@/lib/constants/csiCodes';
import { useCsiData } from '@/lib/constants/useCsiData';
import type { BryntumGanttInstance } from '../../types';
import type { PreviewDoc } from './types';

// Caps applied only while searching (the tree is force-expanded then, so an
// unbounded query like a single letter would otherwise render thousands of rows).
const MAX_GROUPS_PER_DIV = 25;
const MAX_SECTIONS_PER_GROUP = 12;

// Small "this code has a spec document" indicator (also used as a roll-up on
// collapsed division/group rows). While a doc is attaching it flickers and
// shows a spinner instead of the paperclip.
function DocIndicator({ label, loading }: { label: string; loading?: boolean }) {
  return (
    <Box
      component="span"
      role="img"
      aria-label={loading ? 'Attaching document' : label}
      title={loading ? 'Attaching document' : label}
      sx={{
        display: 'inline-flex',
        flexShrink: 0,
        color: 'sidebar.indicator',
        ...(loading && {
          animation: 'docFlicker 1.1s ease-in-out infinite',
          '@keyframes docFlicker': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
        }),
      }}
    >
      {loading ? (
        <CircularProgress size={11} thickness={6} sx={{ color: 'sidebar.indicator' }} />
      ) : (
        <Paperclip size={11} weight="bold" />
      )}
    </Box>
  );
}

// ─── Level-3 section row ────────────────────────────────────────────────
interface SectionItemProps {
  section: CsiSection;
  isSelected: boolean;
  hasDoc: boolean;
  loading: boolean;
  onSelect: (code: string) => void;
}

const SectionItem = memo(function SectionItem({
  section,
  isSelected,
  hasDoc,
  loading,
  onSelect,
}: SectionItemProps) {
  return (
    <Box
      component="div"
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(section.code)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(section.code);
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        pl: 6,
        pr: 2,
        py: '5px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.1s',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: isSelected ? 'action.selected' : 'action.hover',
        },
        '&::before': isSelected
          ? {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '2.5px',
              height: 16,
              borderRadius: '0 2px 2px 0',
              bgcolor: 'sidebar.indicator',
            }
          : undefined,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: isSelected ? 'text.primary' : 'text.secondary',
          minWidth: 52,
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}
      >
        {section.code}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize: '0.75rem',
          fontWeight: isSelected ? 550 : 400,
          color: isSelected ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}
      >
        {section.name}
      </Typography>
      {(hasDoc || loading) && (
        <DocIndicator label="Has attached document" loading={loading} />
      )}
      {isSelected && (
        <Check
          size={12}
          weight="bold"
          color="var(--sidebar-indicator)"
          style={{ flexShrink: 0 }}
        />
      )}
    </Box>
  );
});

// ─── Filtering helpers ──────────────────────────────────────────────────
interface GroupView {
  code: string;
  name: string;
  sections: CsiSection[]; // sections to render for the current view
  hasChildren: boolean; // group has any Level-3 children at all (controls caret)
}

interface DivisionView {
  code: string;
  name: string;
  groups: GroupView[];
  leafCount: number; // selectable codes shown (groups + sections)
}

// ─── Main panel ─────────────────────────────────────────────────────────
interface CsiCodePanelProps {
  csiCode: string | null | undefined;
  taskId: string;
  ganttInstance: BryntumGanttInstance | null;
  /** Project the task belongs to — scopes the per-code spec document. */
  projectId: string;
  /** Whether the current user can upload/replace/remove the spec document. */
  canManage: boolean;
  /** Open the attached spec document in the popover's file preview panel. */
  onOpenDocument: (doc: PreviewDoc) => void;
  /**
   * Called with the newly-written code the moment it's set on the Bryntum
   * record, so the parent can show an optimistic + saving state on the chip
   * while autoSync persists it. `null` signals a removal.
   */
  onCodeChange?: (code: string | null) => void;
  onClose: () => void;
}

export default function CsiCodePanel({
  csiCode,
  taskId,
  ganttInstance,
  projectId,
  canManage,
  onOpenDocument,
  onCodeChange,
  onClose,
}: CsiCodePanelProps) {
  const { showSnackbar } = useSnackbar();
  // The full CSI dataset (names + tree) is lazy-loaded on mount — its 606KB JSON
  // lives in an async chunk, so opening the panel is what pulls it in.
  const csiData = useCsiData();
  const tree = csiData?.tree;
  const [search, setSearch] = useState('');
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [optimisticCode, setOptimisticCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (optimisticCode !== undefined && csiCode === optimisticCode) {
      setOptimisticCode(undefined);
    }
  }, [csiCode, optimisticCode]);

  const displayCode = optimisticCode !== undefined ? optimisticCode : csiCode;

  // Auto-expand the division — and the Level-2 group — containing the current
  // code so the selected row is visible when the panel opens.
  useEffect(() => {
    if (!displayCode || !csiData) return;
    const subEntry = csiData.subdivisionMap.get(displayCode);
    if (!subEntry) return;
    setExpandedDivision(subEntry.division.code);
    const yy = displayCode.split(' ')[1] ?? '00';
    const isGroupPair = yy === '00' || yy[0] === '0' || yy[1] === '0';
    if (!isGroupPair) {
      // Level-3 code — expand its parent Level-2 heading.
      const parentCode = `${subEntry.division.code} ${yy[0]}0 00`;
      setExpandedGroups((prev) => {
        if (prev.has(parentCode)) return prev;
        const next = new Set(prev);
        next.add(parentCode);
        return next;
      });
    }
  }, [displayCode, csiData]);

  // Defer the query so keystrokes stay responsive: at ~6,500 codes the filter
  // below is the expensive part, and useDeferredValue lets React paint the typed
  // character first, then run the filter without blocking input.
  const deferredSearch = useDeferredValue(search);
  const query = deferredSearch.toLowerCase();
  const isSearching = query.length > 0;

  const displayDivisions = useMemo<DivisionView[]>(() => {
    const result: DivisionView[] = [];
    if (!tree) return result;

    for (const div of tree) {
      const divMatches =
        !query || div.code.includes(query) || div.nameLower.includes(query);

      const groupViews: GroupView[] = [];
      let leafCount = 0;

      for (const group of div.groups) {
        const hasChildren = group.sections.length > 0;

        if (!query || divMatches) {
          // Show the whole group (heading + all its sections).
          const sections = isSearching
            ? group.sections.slice(0, MAX_SECTIONS_PER_GROUP)
            : group.sections;
          groupViews.push({
            code: group.code,
            name: group.name,
            sections,
            hasChildren,
          });
          leafCount += 1 + sections.length;
          continue;
        }

        const groupSelfMatch =
          group.code.includes(query) || group.nameLower.includes(query);
        const matchingSections = group.sections.filter(
          (s) => s.code.includes(query) || s.nameLower.includes(query),
        );

        if (groupSelfMatch) {
          const sections = group.sections.slice(0, MAX_SECTIONS_PER_GROUP);
          groupViews.push({
            code: group.code,
            name: group.name,
            sections,
            hasChildren,
          });
          leafCount += 1 + sections.length;
        } else if (matchingSections.length > 0) {
          const sections = matchingSections.slice(0, MAX_SECTIONS_PER_GROUP);
          groupViews.push({
            code: group.code,
            name: group.name,
            sections,
            hasChildren,
          });
          leafCount += sections.length;
        }
      }

      const show = !query || divMatches || groupViews.length > 0;
      if (!show) continue;

      result.push({
        code: div.code,
        name: div.name,
        groups: isSearching ? groupViews.slice(0, MAX_GROUPS_PER_DIV) : groupViews,
        leafCount,
      });
    }

    return result;
  }, [query, isSearching, tree]);

  // Mutate the Bryntum task record directly. autoSync flushes the change to
  // `gantt.sync` on its next tick (last-write-wins, no version check).
  const writeCsiCode = useCallback(
    (next: string | null) => {
      const taskStore = ganttInstance?.project?.taskStore as
        | { getById?: (id: string) => { csiCode?: string | null } | null | undefined }
        | undefined;
      const record = taskStore?.getById?.(taskId);
      if (!record) {
        showSnackbar('Could not find task in chart — try reloading', 'error');
        setOptimisticCode(undefined);
        return false;
      }
      record.csiCode = next;
      return true;
    },
    [ganttInstance, taskId, showSnackbar],
  );

  // Selecting any code (Level-2 heading or Level-3 detail) saves but keeps the
  // panel open, so the user can view or attach the document for the new code.
  const handleSelect = useCallback(
    (code: string) => {
      setOptimisticCode(code);
      const ok = writeCsiCode(code);
      // Notify the parent so the chip reflects the new code (with a saving
      // spinner) while autoSync persists it. The panel stays open.
      if (ok) onCodeChange?.(code);
    },
    [writeCsiCode, onCodeChange],
  );

  const toggleGroup = useCallback((code: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  // Removal keeps the panel open so the user can pick a replacement; the chip
  // still reflects the cleared state via onCodeChange.
  const handleRemoveCode = useCallback(() => {
    setOptimisticCode(null);
    const ok = writeCsiCode(null);
    if (ok) onCodeChange?.(null);
  }, [writeCsiCode, onCodeChange]);

  const hasCode = !!displayCode;
  const subEntry =
    hasCode && csiData ? csiData.subdivisionMap.get(displayCode!) : null;

  // ─── Per-code spec document (project + CSI code → one Document) ───────
  const utils = api.useUtils();
  // Always refetch on mount/selection: the global 30s staleTime would otherwise
  // let the banner show a stale "no document" while the tree indicator (and DB)
  // say otherwise.
  const specDocQuery = api.csiSpec.getForCode.useQuery(
    { projectId, csiCode: displayCode ?? '' },
    { enabled: hasCode, retry: false, staleTime: 0, refetchOnMount: 'always' },
  );
  const specDoc = specDocQuery.data ?? null;

  // All codes in the project that have a doc — drives the tree "has document"
  // indicators (and roll-ups on collapsed division/group rows).
  const codesWithDocQuery = api.csiSpec.listForProject.useQuery(
    { projectId },
    { retry: false, staleTime: 0, refetchOnMount: 'always' },
  );
  const docCodes = useMemo(
    () => new Set(codesWithDocQuery.data ?? []),
    [codesWithDocQuery.data],
  );
  // Roll-up sets for collapsed rows, computed from the actual tree structure
  // (NOT code prefixes — orphan Level-2 leaves share prefixes with siblings and
  // would otherwise all light up when only one has a doc). A division rolls up
  // if any of its codes has a doc; a group rolls up only if one of its own
  // section children has a doc.
  const docRollup = useMemo(() => {
    const divisions = new Set<string>();
    const groupsWithChildDoc = new Set<string>();
    for (const div of tree ?? []) {
      let divHasDoc = false;
      for (const group of div.groups) {
        if (docCodes.has(group.code)) divHasDoc = true;
        if (group.sections.some((s) => docCodes.has(s.code))) {
          divHasDoc = true;
          groupsWithChildDoc.add(group.code);
        }
      }
      if (divHasDoc) divisions.add(div.code);
    }
    return { divisions, groupsWithChildDoc };
  }, [docCodes, tree]);

  // Per-code in-flight add/remove, keyed by CSI code. Keying by code (not a
  // single panel-wide flag) is what stops the spinner/state from bleeding onto
  // the wrong code when the user switches codes mid-upload.
  const [pendingByCode, setPendingByCode] = useState<Map<string, 'add' | 'remove'>>(
    () => new Map(),
  );
  const setPending = useCallback((code: string, action: 'add' | 'remove') => {
    setPendingByCode((prev) => new Map(prev).set(code, action));
  }, []);
  const clearPending = useCallback((code: string) => {
    setPendingByCode((prev) => {
      if (!prev.has(code)) return prev;
      const next = new Map(prev);
      next.delete(code);
      return next;
    });
  }, []);

  // Latest displayCode, read inside async mutation callbacks without capturing a
  // stale value from the render that started the operation.
  const displayCodeRef = useRef(displayCode);
  useEffect(() => {
    displayCodeRef.current = displayCode;
  }, [displayCode]);

  // The spinner only shows for the code currently in view.
  const docBusy = displayCode ? pendingByCode.get(displayCode) ?? null : null;

  // Clear the *viewed* code's pending only once its refetched query settles, so
  // the row never flashes the pre-change UI. Codes switched away from are cleared
  // in the mutation callbacks below (where there's no row to flash).
  useEffect(() => {
    if (!displayCode) return;
    const action = pendingByCode.get(displayCode);
    if (!action) return;
    if (action === 'add' && specDoc) clearPending(displayCode);
    else if (action === 'remove' && !specDoc && !specDocQuery.isFetching) {
      clearPending(displayCode);
    }
  }, [pendingByCode, displayCode, specDoc, specDocQuery.isFetching, clearPending]);

  const settleMutation = useCallback(
    (code: string) => {
      void utils.csiSpec.listForProject.invalidate({ projectId });
      void utils.csiSpec.getForCode.invalidate({ projectId, csiCode: code });
      // If we've navigated away from the target code, clear here — the settle
      // effect above only observes the currently-viewed code.
      if (code !== displayCodeRef.current) clearPending(code);
    },
    [utils, projectId, clearPending],
  );

  const attachMutation = api.csiSpec.attach.useMutation({
    onSuccess: (_data, variables) => settleMutation(variables.csiCode),
    onError: (e, variables) => {
      clearPending(variables.csiCode);
      showSnackbar(e.message || 'Failed to attach document', 'error');
    },
  });
  const detachMutation = api.csiSpec.detach.useMutation({
    onSuccess: (_data, variables) => settleMutation(variables.csiCode),
    onError: (e, variables) => {
      clearPending(variables.csiCode);
      showSnackbar(e.message || 'Failed to remove document', 'error');
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // allow re-picking the same file
      const targetCode = displayCode; // bind to the code the upload started on
      if (!file || !targetCode) return;
      setPending(targetCode, 'add');
      const result = await trackUpload<{ id: string }>(
        file,
        () => {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('projectId', projectId);
          return fetch('/api/upload', { method: 'POST', body: fd });
        },
        { doneLabel: 'Spec document ready' },
      );
      if (result.ok && result.data?.id) {
        attachMutation.mutate({ projectId, csiCode: targetCode, documentId: result.data.id });
      } else {
        clearPending(targetCode); // upload failed — the global chip shows the error
      }
    },
    [displayCode, projectId, attachMutation, setPending, clearPending],
  );

  const handleDetachDoc = useCallback(() => {
    const targetCode = displayCode;
    if (!targetCode) return;
    setPending(targetCode, 'remove');
    detachMutation.mutate({ projectId, csiCode: targetCode });
  }, [displayCode, projectId, detachMutation, setPending]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        minWidth: 0,
        maxHeight: '85vh',
        animation: 'slideInRight 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes slideInRight': {
          from: { opacity: 0, transform: 'translateX(12px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '16px', py: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Tag size={14} weight="bold" color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>
            CSI Classification
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            border: 'none',
            bgcolor: 'transparent',
            cursor: 'pointer',
            color: 'text.secondary',
            flexShrink: 0,
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            transition: 'background-color 0.15s, color 0.15s',
          }}
          aria-label="Close CSI panel"
        >
          <X size={13} />
        </Box>
      </Box>

      {/* ── Current selection ── */}
      {/* Gated on hasCode (not subEntry): the spec-document controls must render
          immediately; only the human-readable name lazy-fills once the CSI
          dataset resolves. */}
      {hasCode && (
        <Box
          sx={{
            mx: '16px',
            mb: 1.5,
            px: 1.5,
            py: 1.25,
            borderRadius: '8px',
            bgcolor: 'action.selected',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Code + name + remove-classification */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Check size={13} weight="bold" color="var(--sidebar-indicator)" style={{ flexShrink: 0, marginTop: 1 }} />
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.02em',
                }}
              >
                {displayCode}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  lineHeight: 1.3,
                }}
              >
                {subEntry?.subdivision.name ?? ''}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.5625rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mt: '1px',
                }}
              >
                {subEntry?.division.name ?? ''}
              </Typography>
            </Box>
            <Box
              component="button"
              onClick={handleRemoveCode}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '5px',
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                color: 'text.secondary',
                flexShrink: 0,
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                transition: 'background-color 0.15s, color 0.15s',
              }}
              aria-label="Remove classification"
            >
              <Prohibit size={12} weight="bold" />
            </Box>
          </Box>

          {/* Spec document: open the attached doc, or upload one */}
          {docBusy ? (
            <Box
              data-testid="doc-loading"
              aria-busy="true"
              aria-label={docBusy === 'add' ? 'Attaching document' : 'Removing document'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.875,
                px: 1,
                py: 0.75,
                borderRadius: '6px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <CircularProgress size={13} thickness={5} sx={{ color: 'text.secondary' }} />
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary' }}>
                {docBusy === 'add' ? 'Attaching document…' : 'Removing document…'}
              </Typography>
            </Box>
          ) : specDoc ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                component="button"
                onClick={() => onOpenDocument(specDoc)}
                title={`Open ${specDoc.name}`}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.625,
                  px: 0.875,
                  py: 0.625,
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  cursor: 'pointer',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.15s',
                }}
              >
                <Paperclip size={12} weight="bold" style={{ flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                  }}
                >
                  {specDoc.name}
                </Typography>
                <CaretRight size={9} style={{ flexShrink: 0 }} />
              </Box>
              {canManage && (
                <Box
                  component="button"
                  onClick={handleDetachDoc}
                  disabled={detachMutation.isPending}
                  aria-label="Remove spec document"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: '5px',
                    border: 'none',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                    transition: 'background-color 0.15s, color 0.15s',
                  }}
                >
                  <Trash size={11} weight="bold" />
                </Box>
              )}
            </Box>
          ) : canManage ? (
            <Box
              component="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachMutation.isPending}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.625,
                px: 1,
                py: 0.75,
                borderRadius: '6px',
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'transparent',
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                transition: 'background-color 0.15s, color 0.15s',
              }}
            >
              <UploadSimple size={12} weight="bold" />
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'inherit' }}>
                Attach spec document
              </Typography>
            </Box>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFilePicked}
          />
        </Box>
      )}

      <Divider />

      {/* ── Search bar ── */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        <MagnifyingGlass
          size={14}
          color="var(--text-secondary)"
          style={{ flexShrink: 0 }}
        />
        <InputBase
          placeholder="Search divisions or codes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          fullWidth
          sx={{
            fontSize: '0.8125rem',
            '& .MuiInputBase-input': {
              p: 0,
              '&::placeholder': {
                color: 'text.disabled',
                opacity: 1,
              },
            },
          }}
        />
        {isSearching && (
          <IconButton
            size="small"
            onClick={() => setSearch('')}
            sx={{ p: 0.25, flexShrink: 0 }}
            aria-label="Clear search"
          >
            <X size={12} weight="bold" />
          </IconButton>
        )}
      </Box>

      {/* ── Division list ── */}
      <Box
        component="ul"
        role="listbox"
        sx={{ listStyle: 'none', m: 0, p: 0, overflowY: 'auto', flex: 1 }}
      >
        {displayDivisions.map((div, idx) => {
          const isDivExpanded = isSearching || expandedDivision === div.code;

          return (
            <Box component="li" key={div.code} sx={{ listStyle: 'none' }}>
              {/* Division header (expand-only) */}
              <Box
                role="button"
                tabIndex={isSearching ? -1 : 0}
                onClick={() => {
                  if (isSearching) return;
                  setExpandedDivision(expandedDivision === div.code ? null : div.code);
                }}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (isSearching) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedDivision(expandedDivision === div.code ? null : div.code);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: '8px',
                  cursor: isSearching ? 'default' : 'pointer',
                  borderTop: idx > 0 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  transition: 'background-color 0.1s',
                  userSelect: 'none',
                  '&:hover': {
                    bgcolor: isSearching ? 'transparent' : 'action.hover',
                  },
                }}
              >
                {isDivExpanded ? (
                  <CaretDown size={11} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                ) : (
                  <CaretRight size={11} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                )}
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.selected',
                    borderRadius: '4px',
                    px: 0.625,
                    py: '1px',
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {div.code}
                  </Typography>
                </Box>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {div.name}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                  {!isDivExpanded && docRollup.divisions.has(div.code) && (
                    <DocIndicator label="Contains attached documents" />
                  )}
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '0.5625rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {div.leafCount}
                  </Typography>
                </Box>
              </Box>

              {/* Level-2 groups + Level-3 sections */}
              {isDivExpanded &&
                div.groups.map((group) => {
                  const isGroupSelected = displayCode === group.code;
                  const isGroupExpanded = isSearching || expandedGroups.has(group.code);
                  const groupHasOwnDoc = docCodes.has(group.code);
                  const groupRollup =
                    !groupHasOwnDoc &&
                    !isGroupExpanded &&
                    docRollup.groupsWithChildDoc.has(group.code);
                  const groupLoading = pendingByCode.get(group.code) === 'add';

                  return (
                    <Box key={group.code}>
                      {/* Level-2 heading row — selectable, with optional caret */}
                      <Box
                        role="option"
                        aria-selected={isGroupSelected}
                        tabIndex={0}
                        onClick={() => handleSelect(group.code)}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelect(group.code);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          pl: 2.5,
                          pr: 2,
                          py: '6px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.1s',
                          bgcolor: isGroupSelected ? 'action.selected' : 'transparent',
                          '&:hover': {
                            bgcolor: isGroupSelected ? 'action.selected' : 'action.hover',
                          },
                          '&::before': isGroupSelected
                            ? {
                                content: '""',
                                position: 'absolute',
                                left: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '2.5px',
                                height: 16,
                                borderRadius: '0 2px 2px 0',
                                bgcolor: 'sidebar.indicator',
                              }
                            : undefined,
                        }}
                      >
                        {group.hasChildren ? (
                          <Box
                            component="button"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              if (isSearching) return;
                              toggleGroup(group.code);
                            }}
                            aria-label={isGroupExpanded ? 'Collapse section' : 'Expand section'}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 18,
                              height: 18,
                              p: 0,
                              border: 'none',
                              borderRadius: '4px',
                              bgcolor: 'transparent',
                              cursor: isSearching ? 'default' : 'pointer',
                              color: 'text.secondary',
                              flexShrink: 0,
                              '&:hover': {
                                bgcolor: isSearching ? 'transparent' : 'action.hover',
                              },
                            }}
                          >
                            {isGroupExpanded ? (
                              <CaretDown size={10} />
                            ) : (
                              <CaretRight size={10} />
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ width: 18, flexShrink: 0 }} />
                        )}
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: isGroupSelected ? 'text.primary' : 'text.secondary',
                            minWidth: 52,
                            flexShrink: 0,
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {group.code}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: isGroupSelected ? 600 : 550,
                            color: 'text.primary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {group.name}
                        </Typography>
                        {groupLoading ? (
                          <DocIndicator label="Attaching document" loading />
                        ) : groupHasOwnDoc ? (
                          <DocIndicator label="Has attached document" />
                        ) : groupRollup ? (
                          <DocIndicator label="Contains attached documents" />
                        ) : null}
                        {isGroupSelected && (
                          <Check
                            size={12}
                            weight="bold"
                            color="var(--sidebar-indicator)"
                            style={{ flexShrink: 0 }}
                          />
                        )}
                      </Box>

                      {/* Level-3 sections */}
                      {isGroupExpanded &&
                        group.sections.map((section) => (
                          <SectionItem
                            key={section.code}
                            section={section}
                            isSelected={displayCode === section.code}
                            hasDoc={docCodes.has(section.code)}
                            loading={pendingByCode.get(section.code) === 'add'}
                            onSelect={handleSelect}
                          />
                        ))}
                    </Box>
                  );
                })}
            </Box>
          );
        })}
      </Box>

      {/* ── Loading state (dataset still resolving) ── */}
      {!csiData && (
        <Box sx={{ px: 3, py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {/* ── Empty state ── */}
      {csiData && displayDivisions.length === 0 && (
        <Box
          sx={{
            px: 3,
            py: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <MagnifyingGlass
            size={20}
            color="var(--text-secondary)"
          />
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            No codes match &ldquo;{search}&rdquo;
          </Typography>
        </Box>
      )}
    </Box>
  );
}
