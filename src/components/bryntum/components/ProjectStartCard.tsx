'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { CalendarBlank, PencilSimple, Check, X } from '@phosphor-icons/react';
import { TRPCClientError } from '@trpc/client';
import { format } from 'date-fns';
import { api } from '@/trpc/react';
import { useSnackbar } from '@/hooks/useSnackbar';
import { Button } from '@/components/ui/button';
import DatePickerMaxHint from '@/components/ui/DatePickerMaxHint';

interface ProjectStartCardProps {
  projectId: string;
  /** Owners/admins can edit; everyone else sees the date read-only. */
  canEdit: boolean;
  /** Live Bryntum instance accessor — used to move the scheduling floor without a reload. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getGanttInstance: () => any;
}

/** Date | ISO-string | null → a Date for the picker, or null. */
function toDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date | ISO-string | null → a human label, or null when unset. */
function toDisplay(d: string | Date | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : format(date, 'MMM d, yyyy');
}

/**
 * The latest selectable day, derived from the earliest task's ISO timestamp.
 * Uses the task's UTC calendar day rebuilt as a LOCAL date so the picker's day
 * boundary matches exactly what the server accepts (it parses the picked
 * `yyyy-MM-dd` as UTC midnight). Without this, a stored time component shifts
 * the local calendar day and the picker disables one day too many.
 */
function toMaxSelectable(iso: string | null | undefined): { date: Date; label: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { date: local, label: format(local, 'MMM d, yyyy') };
}

export default function ProjectStartCard({ projectId, canEdit, getGanttInstance }: ProjectStartCardProps) {
  const utils = api.useUtils();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  const { data: project } = api.project.getById.useQuery(
    { id: projectId },
    { retry: false, enabled: !!projectId },
  );
  const startDate = project?.startDate ?? null;
  const display = toDisplay(startDate);

  // The earliest scheduled task caps how late the project start may be set — a
  // project can't start after its first task. Drives the picker `max` + tooltip.
  const { data: earliest } = api.project.earliestTaskStart.useQuery(
    { projectId },
    { retry: false, enabled: !!projectId },
  );
  const maxSelectable = toMaxSelectable(earliest?.date ?? null);
  const maxDate = maxSelectable?.date;
  const limitLabel = maxSelectable?.label ?? null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the draft from the current value each time the editor opens.
  useEffect(() => {
    if (editing) {
      setDraft(toDate(startDate));
      setError(null);
    }
  }, [editing, startDate]);

  const updateMutation = api.project.update.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: projectId });
      void utils.project.getBySlug.invalidate();
      void utils.project.getActive.invalidate();
      void utils.project.list.invalidate();

      // Move the live scheduling floor so bars can immediately slide to it —
      // no page reload. Independent leaf tasks are manuallyScheduled (see
      // gantt.load), so lowering the floor no longer collapses them onto it.
      if (draft) {
        const gantt = getGanttInstance();
        if (gantt?.project) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            gantt.project.startDate = draft;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            void gantt.project.commitAsync?.();
          } catch {
            /* live-apply is best-effort; the value is persisted regardless */
          }
        }
      }

      // Re-run the server layout so the project context (read by Settings and
      // the project shell) reflects the new start date. The Gantt is a client
      // component, so its state is preserved across the refresh.
      router.refresh();

      setEditing(false);
      setError(null);
      showSnackbar('Project start date updated', 'success');
    },
    onError: (err) => {
      setError(
        err instanceof TRPCClientError
          ? err.message
          : 'Failed to update project start date',
      );
    },
  });

  const handleSave = () => {
    setError(null);
    updateMutation.mutate({
      projectId,
      startDate: draft ? format(draft, 'yyyy-MM-dd') : null,
    });
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.75,
        py: 0.875,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 44,
      }}
    >
      <CalendarBlank size={15} weight="bold" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          userSelect: 'none',
        }}
      >
        Project start
      </Typography>

      {editing ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <DatePicker
            value={draft}
            onChange={(d) => setDraft(d)}
            maxDate={maxDate}
            disabled={updateMutation.isPending}
            slots={limitLabel ? { actionBar: () => <DatePickerMaxHint limitLabel={limitLabel} /> } : undefined}
            slotProps={{
              textField: {
                size: 'small',
                error: !!error,
                sx: { width: 168, '& input': { py: 0.75, fontSize: '0.8125rem' } },
              },
            }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            loading={updateMutation.isPending}
            loadingPosition="start"
            startIcon={<Check size={14} weight="bold" />}
          >
            Save
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setEditing(false)}
            disabled={updateMutation.isPending}
            startIcon={<X size={14} weight="bold" />}
          >
            Cancel
          </Button>
          {error && (
            <Typography sx={{ fontSize: '0.6875rem', color: 'error.main' }}>{error}</Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 550, color: display ? 'text.primary' : 'text.secondary' }}>
            {display ?? 'Not set'}
          </Typography>
          {canEdit && (
            <Box
              component="button"
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Change project start date"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                py: 0.25,
                border: 'none',
                borderRadius: '6px',
                bgcolor: 'transparent',
                color: 'text.secondary',
                cursor: 'pointer',
                fontSize: '0.6875rem',
                fontWeight: 600,
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              <PencilSimple size={13} weight="bold" />
              {display ? 'Change' : 'Set date'}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
