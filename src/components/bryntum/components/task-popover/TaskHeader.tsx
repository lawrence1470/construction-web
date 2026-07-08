'use client';

import { Box, CircularProgress, Skeleton, Typography } from '@mui/material';
import { X, CalendarBlank, Timer, Tag, CaretRight, Plus, Check } from '@phosphor-icons/react';
import type { Theme } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { useCsiData } from '@/lib/constants/useCsiData';

type Status = 'not-started' | 'in-progress' | 'complete';

function getStatus(percentDone: number, hasRequirements: boolean): Status {
  if (!hasRequirements) return 'not-started';
  if (percentDone >= 100) return 'complete';
  if (percentDone > 0) return 'in-progress';
  return 'not-started';
}

function getStatusStyles(status: Status, palette: Theme['palette']) {
  switch (status) {
    case 'complete':
      return {
        bg: palette.status.activeBg,
        fg: palette.status.activeText,
        dot: palette.status.active,
        label: 'Complete',
      };
    case 'in-progress':
      return {
        bg: palette.status.inProgressBg,
        fg: palette.status.inProgressText,
        dot: palette.status.inProgress,
        label: 'In progress',
      };
    case 'not-started':
    default:
      return {
        bg: palette.action.selected,
        fg: palette.text.secondary,
        dot: palette.text.disabled,
        label: 'Not started',
      };
  }
}

function getRingColor(status: Status, palette: Theme['palette']): string {
  if (status === 'complete') return palette.status.active;
  if (status === 'in-progress') return palette.status.inProgress;
  return palette.text.disabled;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(duration: number | null | undefined, unit: string): string {
  if (!duration) return '';
  const rounded = Math.round(duration);
  const u = unit === 'day' ? 'day' : unit;
  return `${rounded} ${u}${rounded !== 1 ? 's' : ''}`;
}

function avatarGradient(seed: string): string {
  // Stable hash-based pick from a small palette
  const palette = [
    'linear-gradient(135deg, #93c5fd, #6366f1)',
    'linear-gradient(135deg, #fbbf24, #f97316)',
    'linear-gradient(135deg, #34d399, #059669)',
    'linear-gradient(135deg, #f472b6, #db2777)',
    'linear-gradient(135deg, #a78bfa, #7c3aed)',
    'linear-gradient(135deg, #5eead4, #0891b2)',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const MAX_VISIBLE_AVATARS = 4;

interface Assignee {
  id: string;
  name: string;
  image: string | null;
}

interface TaskHeaderProps {
  taskName: string;
  taskDetail: {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    duration?: number | null;
    durationUnit?: string;
    csiCode?: string | null;
    percentDone?: number;
    requiredSubmittals?: number | null;
    requiredInspections?: number | null;
    assignees?: Assignee[];
    hasChildren?: boolean;
  } | null | undefined;
  taskDetailLoading: boolean;
  /** Optimistic CSI code (pending value if a save is in flight, else the saved value). */
  effectiveCsiCode: string | null;
  /** True while a CSI change is being persisted — drives the chip spinner. */
  isSavingCsi: boolean;
  onClose: () => void;
  /** Opens the CSI picker side panel. */
  onOpenCsiPanel: () => void;
  onScrollToRequirements?: () => void;
  /**
   * Open the Manage submittals/inspections drawer. When provided, the empty
   * "No requirements yet" CTA uses this instead of `onScrollToRequirements`
   * so admins can create their first slot directly.
   */
  onOpenRequirementsDrawer?: () => void;
  /** Number of documents uploaded across all submittal folders */
  submittalsCurrent?: number;
  /** Number of documents uploaded across all inspection folders */
  inspectionsCurrent?: number;
}

export default function TaskHeader({
  taskName,
  taskDetail,
  taskDetailLoading,
  effectiveCsiCode,
  isSavingCsi,
  onClose,
  onOpenCsiPanel,
  onScrollToRequirements,
  onOpenRequirementsDrawer,
  submittalsCurrent = 0,
  inspectionsCurrent = 0,
}: TaskHeaderProps) {
  const emptyCtaAction = onOpenRequirementsDrawer ?? onScrollToRequirements;
  const theme = useTheme();

  // Progress derived from requirements
  const requiredSubmittals = taskDetail?.requiredSubmittals ?? 0;
  const requiredInspections = taskDetail?.requiredInspections ?? 0;
  const totalRequired = requiredSubmittals + requiredInspections;
  const hasRequirements = totalRequired > 0;
  const totalUploaded =
    Math.min(submittalsCurrent, requiredSubmittals) +
    Math.min(inspectionsCurrent, requiredInspections);
  const percentDone = hasRequirements
    ? Math.round((totalUploaded / totalRequired) * 100)
    : 0;

  const status = getStatus(percentDone, hasRequirements);
  const statusStyles = getStatusStyles(status, theme.palette);
  const ringColor = getRingColor(status, theme.palette);

  const assignees = taskDetail?.assignees ?? [];
  const visibleAssignees = assignees.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = Math.max(0, assignees.length - MAX_VISIBLE_AVATARS);

  const hasChildren = !!taskDetail?.hasChildren;
  const showEmptyProgressCta = !hasRequirements && !hasChildren;

  // Sub-line breakdown
  const subPending: string[] = [];
  if (requiredSubmittals > 0) {
    const pending = Math.max(0, requiredSubmittals - Math.min(submittalsCurrent, requiredSubmittals));
    if (pending > 0) subPending.push(`${pending} submittal${pending !== 1 ? 's' : ''} pending`);
  }
  if (requiredInspections > 0) {
    const pending = Math.max(0, requiredInspections - Math.min(inspectionsCurrent, requiredInspections));
    if (pending > 0) subPending.push(`${pending} inspection${pending !== 1 ? 's' : ''} pending`);
  }
  const subLine =
    status === 'complete' ? 'All requirements complete' : subPending.join(' · ');

  // CSI lookup — uses the effective (optimistic) code so the chip reflects the
  // just-picked value before the server round-trip lands.
  const csiData = useCsiData();
  const csiEntry = effectiveCsiCode
    ? csiData?.subdivisionMap.get(effectiveCsiCode)
    : null;
  const csiName = csiEntry?.subdivision.name ?? null;

  const metaDateRange = [
    taskDetail?.startDate ? formatDate(taskDetail.startDate) : null,
    taskDetail?.endDate ? formatDate(taskDetail.endDate) : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const durationLabel = formatDuration(
    taskDetail?.duration,
    taskDetail?.durationUnit ?? 'day'
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Banner: status pill + assignees ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: '14px',
          py: '7px',
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            px: '7px',
            py: '2.5px',
            borderRadius: '999px',
            bgcolor: statusStyles.bg,
            color: statusStyles.fg,
            fontSize: '0.625rem',
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '0.01em',
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusStyles.dot }} />
          {statusStyles.label}
        </Box>

        <Box sx={{ flex: 1 }} />

        {visibleAssignees.length > 0 && (
          <Box sx={{ display: 'inline-flex' }}>
            {visibleAssignees.map((a, idx) => (
              <Box
                key={a.id}
                title={a.name}
                sx={{
                  position: 'relative',
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '1.5px solid',
                  borderColor: 'background.paper',
                  marginLeft: idx === 0 ? 0 : '-5px',
                  background: a.image ? 'transparent' : avatarGradient(a.id),
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {a.image ? (
                  <Box
                    component="img"
                    src={a.image}
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  initialsFromName(a.name)
                )}
              </Box>
            ))}
            {overflowCount > 0 && (
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '1.5px solid',
                  borderColor: 'background.paper',
                  marginLeft: '-5px',
                  bgcolor: 'action.selected',
                  color: 'text.secondary',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                +{overflowCount}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Header body ── */}
      <Box sx={{ p: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {/* Title row */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: 'text.primary',
                wordBreak: 'break-word',
              }}
            >
              {taskName}
            </Typography>

            {taskDetailLoading ? (
              <Skeleton variant="text" width={200} height={14} sx={{ borderRadius: '4px' }} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, flexWrap: 'wrap' }}>
                {metaDateRange && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CalendarBlank size={12} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 500, color: 'text.secondary', lineHeight: 1 }}>
                      {metaDateRange}
                    </Typography>
                  </Box>
                )}
                {metaDateRange && durationLabel && (
                  <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                )}
                {durationLabel && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Timer size={12} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 500, color: 'text.secondary', lineHeight: 1 }}>
                      {durationLabel}
                    </Typography>
                  </Box>
                )}
                {(metaDateRange || durationLabel) && (
                  <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                )}

                {/* CSI inline chip — code + truncated name (or dashed empty) */}
                {effectiveCsiCode ? (
                  <Box
                    component="button"
                    onClick={onOpenCsiPanel}
                    title={
                      isSavingCsi
                        ? 'Saving CSI code…'
                        : csiName
                          ? `${effectiveCsiCode} — ${csiName}`
                          : effectiveCsiCode
                    }
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: 20,
                      px: '7px',
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: isSavingCsi ? 'primary.main' : 'divider',
                      bgcolor: 'transparent',
                      color: 'text.secondary',
                      cursor: 'pointer',
                      lineHeight: 1,
                      maxWidth: '100%',
                      opacity: isSavingCsi ? 0.85 : 1,
                      transition: 'background-color 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: isSavingCsi ? 'primary.main' : 'text.disabled',
                        color: 'text.primary',
                      },
                    }}
                  >
                    {isSavingCsi ? (
                      <CircularProgress
                        size={10}
                        thickness={6}
                        sx={{ color: 'primary.main', flexShrink: 0 }}
                      />
                    ) : (
                      <Tag size={11} weight="fill" color="currentColor" style={{ flexShrink: 0 }} />
                    )}
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {effectiveCsiCode}
                    </Typography>
                    {csiName && (
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.6875rem',
                          fontWeight: 500,
                          color: 'text.secondary',
                          lineHeight: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 160,
                        }}
                      >
                        {csiName}
                      </Typography>
                    )}
                    <CaretRight size={9} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </Box>
                ) : (
                  <Box
                    component="button"
                    onClick={onOpenCsiPanel}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: 20,
                      px: '8px',
                      borderRadius: '5px',
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'transparent',
                      color: 'text.secondary',
                      cursor: 'pointer',
                      lineHeight: 1,
                      transition: 'all 0.15s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: 'text.disabled',
                        borderStyle: 'solid',
                        color: 'text.primary',
                      },
                    }}
                  >
                    <Plus size={10} weight="bold" color="currentColor" style={{ flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: 'inherit', lineHeight: 1 }}>
                      CSI code
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Close button */}
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
              mt: '1px',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              transition: 'background-color 0.15s, color 0.15s',
            }}
            aria-label="Close"
          >
            <X size={13} />
          </Box>
        </Box>

        {/* Progress: ring + fraction + sub-line + view-all */}
        {taskDetailLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width={120} height={12} />
              <Skeleton variant="text" width={160} height={10} />
            </Box>
          </Box>
        ) : hasRequirements ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <ProgressRing percent={percentDone} color={ringColor} done={status === 'complete'} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0, lineHeight: 1.2 }}>
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', lineHeight: 1.2 }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {totalUploaded} of {totalRequired}
                </Box>{' '}
                requirements{status === 'complete' ? ' complete' : ''}
              </Typography>
              {subLine && (
                <Typography
                  sx={{
                    fontSize: '0.625rem',
                    color: status === 'complete' ? 'success.main' : 'text.disabled',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {subLine}
                </Typography>
              )}
            </Box>
            {emptyCtaAction && (
              <Box
                component="button"
                onClick={emptyCtaAction}
                sx={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'primary.main',
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  lineHeight: 1,
                  padding: '4px 0',
                  flexShrink: 0,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View all
              </Box>
            )}
          </Box>
        ) : showEmptyProgressCta ? (
          <Box
            component="button"
            onClick={emptyCtaAction}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              px: '10px',
              py: '8px',
              borderRadius: '8px',
              border: '1px dashed',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              cursor: emptyCtaAction ? 'pointer' : 'default',
              textAlign: 'left',
              transition: 'all 0.15s',
              width: '100%',
              '&:hover': emptyCtaAction
                ? {
                    borderColor: 'text.disabled',
                    borderStyle: 'solid',
                    bgcolor: 'action.selected',
                  }
                : undefined,
            }}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: 'action.selected',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                flexShrink: 0,
              }}
            >
              <CircleDashedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              <Typography component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.primary' }}>
                No requirements yet.
              </Typography>{' '}
              <Typography component="span" sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>
                Add submittals or inspections to track progress.
              </Typography>
            </Box>
            {emptyCtaAction && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: 'primary.main',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                + Add
              </Typography>
            )}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

// Inline icon — Phosphor's CircleDashed but lighter weight inline
function CircleDashedIcon() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    </svg>
  );
}

// Conic-gradient progress ring; checkmark fills the center at 100%.
function ProgressRing({
  percent,
  color,
  done,
}: {
  percent: number;
  color: string;
  done: boolean;
}) {
  const theme = useTheme();
  const trackColor = theme.palette.action.selected;
  const innerBg = theme.palette.background.paper;

  return (
    <Box
      sx={{
        position: 'relative',
        width: 32,
        height: 32,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `conic-gradient(${color} ${percent}%, ${trackColor} 0)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: 25,
            height: 25,
            borderRadius: '50%',
            bgcolor: innerBg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? (
            <Check size={13} weight="bold" color={color} />
          ) : (
            <Typography
              sx={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {Math.round(percent)}%
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
