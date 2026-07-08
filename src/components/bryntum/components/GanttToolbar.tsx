'use client';

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Box, MenuItem, Select, Stack, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Button } from '@/components/ui/button';
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowsInLineVertical,
  ArrowsOutLineVertical,
  ArrowsOutSimple,
  CalendarDot,
  CaretDoubleLeft,
  CaretDoubleRight,
  DownloadSimple,
  Columns,
  DotsThreeVertical,
  LinkSimple,
  Lock,
  LockOpen,
  Minus,
  Plus,
} from '@phosphor-icons/react';

// ─── Pulse variants — semantic motion per action ──────────────────────────────
type PulseVariant = 'scale-out' | 'scale-in' | 'wobble' | 'slide-left' | 'slide-right';

// ─── Constants ────────────────────────────────────────────────────────────────
const VIEW_PRESETS = [
  { label: 'Day',   value: 'hourAndDay' },
  { label: 'Week',  value: 'weekAndDayLetterCompact' },
  { label: 'Month', value: 'weekAndMonth' },
  { label: 'Year',  value: 'monthAndYear' },
] as const;

// ─── Shared card styles (matches VersionControlBar / TaskProgressCard) ────────

/** Card container — groups related controls into a single rounded pill */
const cardContainerSx = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 34,
  bgcolor: 'var(--bg-card)',
  borderRadius: '10px',
  border: '1px solid var(--border-color)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
  flexShrink: 0,
} as const;

/** Borderless button inside a card container */
const cardItemSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  px: 1.25,
  border: 'none',
  bgcolor: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '0.6875rem',
  fontWeight: 500,
  fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  letterSpacing: '-0.01em',
  lineHeight: 1,
  transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.12s ease',
  outline: 'none',
  '&:hover': {
    bgcolor: 'action.hover',
    color: 'var(--text-primary)',
  },
  '&:active': {
    transform: 'scale(0.9)',
  },
  '&:focus-visible': {
    boxShadow: 'inset 0 0 0 2px var(--focus-ring, rgba(43, 45, 66, 0.45))',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'background-color 0.01s, color 0.01s',
    '&:active': { transform: 'none' },
  },
} as const;

/**
 * Toolbar button that re-runs a pulse animation on every click via a key-bump.
 * `:active` alone is too brief (~80ms held) for noticeable motion — remounting
 * the inner span on each click cleanly restarts the CSS animation.
 */
function ToolbarPulseButton({
  onClick,
  ariaLabel,
  tooltip,
  shortcut,
  pulseVariant,
  children,
}: {
  onClick?: () => void;
  ariaLabel: string;
  tooltip: string;
  shortcut?: string;
  pulseVariant: PulseVariant;
  children: ReactNode;
}) {
  const [pulseKey, setPulseKey] = useState(0);
  const handleClick = () => {
    setPulseKey((k) => k + 1);
    onClick?.();
  };
  const tooltipTitle = shortcut ? `${tooltip} (${shortcut})` : tooltip;
  return (
    <Tooltip title={tooltipTitle} placement="bottom" enterDelay={400} enterNextDelay={200} arrow>
      <Box
        component="button"
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        sx={cardItemSx}
      >
        <Box
          key={pulseKey}
          aria-hidden
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            willChange: pulseKey > 0 ? 'transform' : 'auto',
            animation:
              pulseKey > 0
                ? `gantt-pulse-${pulseVariant} 0.34s cubic-bezier(0.2, 0.9, 0.3, 1.2) both`
                : 'none',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {children}
        </Box>
      </Box>
    </Tooltip>
  );
}

/** Thin vertical separator inside a card */
const cardDividerSx = {
  width: '1px',
  height: 14,
  bgcolor: 'divider',
  flexShrink: 0,
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
type GanttToolbarProps = {
  onAddTask?: () => void;
  onPresetChange?: (preset: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
  onShiftPrevious?: () => void;
  onShiftNext?: () => void;
  /** Scroll the timeline so today's date is centered in view. */
  onScrollToToday?: () => void;
  /** Collapse all parent tasks, or expand them again if already collapsed. */
  onToggleCollapseAll?: () => void;
  /** Whether all parent tasks are currently collapsed (drives icon + label). */
  allCollapsed?: boolean;
  onExport?: () => void;
  onColumnsClick?: (event: MouseEvent<HTMLElement>) => void;
  onMoreClick?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Whether the current user has permission to unlock the chart for editing. */
  canEditChart?: boolean;
  /** Whether the chart is currently unlocked for editing. */
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  /** Whether dependency-link mode is active (plain click selects tasks to link). */
  linkMode?: boolean;
  /** Whether linking is visually active — Link mode on, Shift held, or a link
   *  selection in progress. Drives the button's colorful state + "Linking"
   *  label independently of the persistent `linkMode` toggle. */
  linkActive?: boolean;
  onToggleLinkMode?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function GanttToolbar({
  onAddTask,
  onPresetChange,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onShiftPrevious,
  onShiftNext,
  onScrollToToday,
  onToggleCollapseAll,
  allCollapsed = false,
  onExport,
  onColumnsClick,
  onMoreClick,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  canEditChart = false,
  isEditMode = false,
  onToggleEditMode,
  linkMode = false,
  linkActive = false,
  onToggleLinkMode,
}: GanttToolbarProps) {
  const editingActive = canEditChart && isEditMode;
  const [activePreset, setActivePreset] = useState('weekAndDayLetterCompact');
  const theme = useTheme();

  // Segmented control: measure active segment so a single shared indicator can
  // slide between presets (instead of each segment owning its own background).
  const segmentTrackRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef<Record<string, HTMLLabelElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const measureIndicator = () => {
    const track = segmentTrackRef.current;
    const target = segmentRefs.current[activePreset];
    if (!track || !target) return;
    const trackRect = track.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const next = {
      left: targetRect.left - trackRect.left,
      width: targetRect.width,
    };
    setIndicator((prev) => {
      if (prev && prev.left === next.left && prev.width === next.width) return prev;
      return next;
    });
  };

  useLayoutEffect(() => {
    measureIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreset]);

  useEffect(() => {
    const track = segmentTrackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureIndicator());
    ro.observe(track);
    Object.values(segmentRefs.current).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreset]);

  const handlePresetClick = (preset: string) => {
    setActivePreset(preset);
    onPresetChange?.(preset);
  };

  const getSegmentSx = (isActive: boolean) => ({
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: '14px',
    height: 26,
    fontSize: '12px',
    fontWeight: isActive ? 600 : 450,
    fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    cursor: 'pointer',
    userSelect: 'none' as const,
    color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
    borderRadius: '6px',
    transition:
      'color 0.28s cubic-bezier(0.16, 1, 0.3, 1), font-weight 0.28s ease, letter-spacing 0.28s ease, transform 0.12s ease',
    zIndex: 1,
    lineHeight: 1,
    letterSpacing: isActive ? '-0.01em' : '0',
    ...(!isActive && {
      '&:hover': {
        color: theme.palette.text.primary,
      },
    }),
    '&:active': {
      transform: 'scale(0.94)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'color 0.01s, font-weight 0.01s',
      '&:active': { transform: 'none' },
    },
  });

  const hasRightControls = onExport || onMoreClick;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        px: 2,
        py: 1,
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        // Warm the toolbar with a faint accent wash while editing — part of the
        // "edit mode the whole card announces" treatment (Direction 1).
        bgcolor: editingActive ? 'var(--accent-subtle)' : 'var(--gantt-toolbar-bg)',
        transition: 'background-color 0.28s ease',
        containerType: 'inline-size',
        containerName: 'gantt-toolbar',
      }}
    >
      {/* ── Columns config — first control, left of the time-scale picker.
         In edit mode the left view-tools yield to protect the edit actions
         (Link / Add Task / Edit) on the right, so Columns collapses to its
         icon and the scale picker becomes the compact dropdown below. ── */}
      {onColumnsClick && (
        <Box sx={cardContainerSx}>
          <Box
            component="button"
            sx={{ ...cardItemSx, gap: 0.5, px: editingActive ? 1.25 : 1.5 }}
            onClick={onColumnsClick}
            title="Configure columns"
            aria-label="Configure columns"
          >
            <Columns size={12} weight="bold" />
            {!editingActive && 'Columns'}
          </Box>
        </Box>
      )}

      {/* ── View Preset Picker — segmented (hidden ≤560px, and in edit mode
         where the compact dropdown takes over to free horizontal room) ── */}
      <Box
        ref={segmentTrackRef}
        sx={{
          position: 'relative',
          display: editingActive ? 'none' : 'flex',
          alignItems: 'center',
          height: 32,
          bgcolor: 'action.selected',
          borderRadius: '8px',
          p: '3px',
          gap: '2px',
          flexShrink: 0,
          '@container gantt-toolbar (max-width: 560px)': {
            display: 'none',
          },
        }}
      >
        {/* Shared sliding indicator — translateX is GPU-composited (skips layout/paint) */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: 0,
            width: indicator?.width ?? 0,
            transform: `translate3d(${indicator?.left ?? 0}px, 0, 0)`,
            bgcolor: 'background.paper',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0.5px 1px rgba(0,0,0,0.04)',
            willChange: 'transform, width',
            transition:
              'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), width 0.32s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease',
            opacity: indicator ? 1 : 0,
            zIndex: 0,
            pointerEvents: 'none',
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'opacity 0.2s ease',
            },
          }}
        >
          {/* Activation pulse — animates opacity + scale (GPU), not box-shadow (paint) */}
          <Box
            key={activePreset}
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              border: '1.5px solid var(--focus-ring)',
              pointerEvents: 'none',
              willChange: 'transform, opacity',
              animation: 'gantt-segment-pulse 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          />
        </Box>

        {VIEW_PRESETS.map((preset) => {
          const isActive = activePreset === preset.value;
          return (
            <Box
              key={preset.value}
              component="label"
              ref={(el: HTMLLabelElement | null) => {
                segmentRefs.current[preset.value] = el;
              }}
              sx={getSegmentSx(isActive)}
            >
              <input
                type="radio"
                name="gantt-view-preset"
                value={preset.value}
                checked={isActive}
                onChange={() => handlePresetClick(preset.value)}
                style={{ display: 'none' }}
              />
              {preset.label}
            </Box>
          );
        })}
      </Box>

      {/* ── View Preset Picker — select fallback (shown ≤560px, and in edit
         mode at any width so the segmented control's footprint is reclaimed) ── */}
      <Select
        value={activePreset}
        onChange={(e) => handlePresetClick(e.target.value as string)}
        size="small"
        aria-label="Time scale"
        sx={{
          display: editingActive ? 'inline-flex' : 'none',
          flexShrink: 0,
          height: 32,
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
          letterSpacing: '-0.01em',
          bgcolor: 'background.paper',
          '& .MuiSelect-select': {
            py: 0,
            display: 'flex',
            alignItems: 'center',
          },
          '@container gantt-toolbar (max-width: 560px)': {
            display: 'inline-flex',
          },
        }}
      >
        {VIEW_PRESETS.map((preset) => (
          <MenuItem key={preset.value} value={preset.value} sx={{ fontSize: '12px' }}>
            {preset.label}
          </MenuItem>
        ))}
      </Select>

      {/* ── Zoom group — scale controls (− + Fit) ──────────────────────────
         Split from the time-pan group below: a gap between the two pills
         signals "different function," while the dividers inside each signal
         "related buttons." Matches the toolbar's grouped-pill rhythm. */}
      <Box
        sx={{
          ...cardContainerSx,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'var(--border-color)',
            boxShadow:
              '0 2px 6px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <ToolbarPulseButton
          ariaLabel="Zoom out"
          tooltip="Zoom out"
          pulseVariant="scale-in"
          onClick={onZoomOut}
        >
          <Minus size={12} weight="bold" />
        </ToolbarPulseButton>
        <Box sx={cardDividerSx} />
        <ToolbarPulseButton
          ariaLabel="Zoom in"
          tooltip="Zoom in"
          pulseVariant="scale-out"
          onClick={onZoomIn}
        >
          <Plus size={12} weight="bold" />
        </ToolbarPulseButton>
        <Box sx={cardDividerSx} />
        <ToolbarPulseButton
          ariaLabel="Fit all tasks"
          tooltip="Fit all tasks"
          pulseVariant="wobble"
          onClick={onZoomToFit}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <ArrowsOutSimple size={11} weight="bold" />
            <Box component="span">Fit</Box>
          </Box>
        </ToolbarPulseButton>
      </Box>

      {/* ── Time-pan group — move through the calendar (« ») ──────────────── */}
      <Box
        sx={{
          ...cardContainerSx,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'var(--border-color)',
            boxShadow:
              '0 2px 6px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <ToolbarPulseButton
          ariaLabel="Previous time span"
          tooltip="Previous time span"
          pulseVariant="slide-left"
          onClick={onShiftPrevious}
        >
          <CaretDoubleLeft size={12} weight="bold" />
        </ToolbarPulseButton>
        {onScrollToToday && (
          <>
            <Box sx={cardDividerSx} />
            <ToolbarPulseButton
              ariaLabel="Scroll to today"
              tooltip="Scroll to today"
              pulseVariant="wobble"
              onClick={onScrollToToday}
            >
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarDot size={12} weight="bold" />
                <Box component="span">Today</Box>
              </Box>
            </ToolbarPulseButton>
          </>
        )}
        <Box sx={cardDividerSx} />
        <ToolbarPulseButton
          ariaLabel="Next time span"
          tooltip="Next time span"
          pulseVariant="slide-right"
          onClick={onShiftNext}
        >
          <CaretDoubleRight size={12} weight="bold" />
        </ToolbarPulseButton>
      </Box>

      {/* ── Collapse / expand all parent tasks — one button toggles the
         whole tree. Lets users flatten a deep project to scan top-level
         phases, then expand back. ─────────────────────────────────────── */}
      {onToggleCollapseAll && (
        <Box sx={cardContainerSx}>
          <ToolbarPulseButton
            ariaLabel={allCollapsed ? 'Expand all tasks' : 'Collapse all tasks'}
            tooltip={allCollapsed ? 'Expand all tasks' : 'Collapse all tasks'}
            pulseVariant="wobble"
            onClick={onToggleCollapseAll}
          >
            {allCollapsed ? (
              <ArrowsOutLineVertical size={12} weight="bold" />
            ) : (
              <ArrowsInLineVertical size={12} weight="bold" />
            )}
          </ToolbarPulseButton>
        </Box>
      )}

      {/* ── Undo / Redo (only active in edit mode) ───────────────────── */}
      {editingActive && (
        <Box sx={{ ...cardContainerSx, animation: 'gantt-tool-pop-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2) both' }}>
          <Box
            component="button"
            sx={{ ...cardItemSx, opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'default' }}
            onClick={canUndo ? onUndo : undefined}
            title="Undo (Ctrl+Z)"
          >
            <ArrowUUpLeft size={13} weight="bold" />
          </Box>
          <Box sx={cardDividerSx} />
          <Box
            component="button"
            sx={{ ...cardItemSx, opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'default' }}
            onClick={canRedo ? onRedo : undefined}
            title="Redo (Ctrl+Y)"
          >
            <ArrowUUpRight size={13} weight="bold" />
          </Box>
        </Box>
      )}

      {/* ── Spacer ─────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1 }} />

      {/* ── Right Controls ─────────────────────────────────────────────── */}
      {hasRightControls && (
        <Box sx={cardContainerSx}>
          {onExport && (
            <Box component="button" sx={cardItemSx} onClick={onExport} title="Export">
              <DownloadSimple size={12} weight="bold" />
            </Box>
          )}
          {onExport && onMoreClick && <Box sx={cardDividerSx} />}
          {onMoreClick && (
            <Box component="button" sx={cardItemSx} onClick={onMoreClick} title="More options">
              <DotsThreeVertical size={12} weight="bold" />
            </Box>
          )}
        </Box>
      )}

      {/* ── Link toggle (appears in edit mode, to the LEFT of the pinned Edit
         switch so revealing it never shifts Edit). Lit while linking. ─────── */}
      {onToggleLinkMode && editingActive && (
        <Tooltip
          title={
            linkMode
              ? 'Linking on — click tasks in order to chain them. Tip: Shift-click works any time, even with this off.'
              : 'Link tasks — click two tasks in order to connect them. Tip: Shift-click any task to link without this button.'
          }
          placement="bottom"
          enterDelay={400}
          arrow
        >
          <Box
            component="button"
            type="button"
            onClick={onToggleLinkMode}
            aria-label={linkMode ? 'Exit link mode' : 'Link tasks'}
            aria-pressed={linkMode}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              height: 34,
              px: '14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              animation: 'gantt-tool-pop-in 0.24s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
              transition:
                'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
              '&:active': { transform: 'scale(0.96)' },
              '@container gantt-toolbar (max-width: 720px)': { px: 0, gap: 0, width: 34 },
              ...(linkActive
                ? {
                    bgcolor: 'action.selected',
                    color: 'var(--accent-primary, #2B2D42)',
                    border: '1px solid var(--accent-primary, #2B2D42)',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: 'action.selected', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
                  }
                : {
                    bgcolor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-card)',
                    '&:hover': { bgcolor: 'action.hover' },
                  }),
            }}
          >
            <LinkSimple size={13} weight="bold" />
            <Box
              component="span"
              sx={{ '@container gantt-toolbar (max-width: 720px)': { display: 'none' } }}
            >
              {linkActive ? 'Linking' : 'Link'}
            </Box>
          </Box>
        </Tooltip>
      )}

      {/* ── Add Task (only active in edit mode) ────────────────────────── */}
      {onAddTask && editingActive && (
        <Button
          variant="contained"
          size="small"
          disableElevation
          startIcon={<Plus size={12} />}
          onClick={onAddTask}
          aria-label="Add task"
          sx={{
            px: '14px',
            py: '6px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
            textTransform: 'none',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-primary, #2B2D42)',
            color: 'var(--accent-contrast, #fff)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            // Subtle elevation marks this as the sole primary action — toggles
            // are flat/tinted, so the lift reinforces the hierarchy.
            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
            transition: 'filter 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease',
            animation: 'gantt-tool-pop-in 0.26s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
            '&:hover': {
              backgroundColor: 'var(--accent-primary, #2B2D42)',
              filter: 'brightness(0.92)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.16)',
            },
            '&:active': { transform: 'scale(0.97)' },
            '@container gantt-toolbar (max-width: 720px)': {
              minWidth: 0,
              width: 34,
              height: 34,
              px: 0,
              '& .MuiButton-startIcon': { mr: 0, ml: 0 },
            },
          }}
        >
          <Box
            component="span"
            sx={{
              '@container gantt-toolbar (max-width: 720px)': {
                display: 'none',
              },
            }}
          >
            Add Task
          </Box>
        </Button>
      )}

      {/* ── Edit mode switch — the lock icon rides the sliding knob ──────────
         Pinned as the RIGHTMOST control with a FIXED width, so revealing Link /
         Add Task to its left never shifts it. Off → knob left (locked); on →
         knob slides right, lock opens, track fills accent. */}
      {canEditChart && (
        <Tooltip
          title={editingActive ? 'Lock chart (exit edit mode)' : 'Edit chart — unlock to make changes'}
          placement="bottom"
          enterDelay={400}
          arrow
        >
          <Box
            component="button"
            type="button"
            role="switch"
            aria-checked={editingActive}
            aria-label="Edit mode"
            onClick={onToggleEditMode}
            sx={{
              position: 'relative',
              flexShrink: 0,
              width: 104,
              height: 34,
              p: 0,
              borderRadius: '999px',
              border: '1px solid',
              borderColor: editingActive ? 'var(--accent-primary, #2B2D42)' : 'var(--border-color)',
              bgcolor: editingActive ? 'var(--accent-primary, #2B2D42)' : 'var(--bg-input)',
              cursor: 'pointer',
              transition: 'background-color 0.28s ease, border-color 0.28s ease, transform 0.12s ease',
              '&:active': { transform: 'scale(0.97)' },
              '@container gantt-toolbar (max-width: 720px)': { width: 34 },
            }}
          >
            {/* Label — sits opposite the knob; crossfades on flip, hidden when collapsed */}
            <Box
              component="span"
              key={editingActive ? 'on' : 'off'}
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: editingActive ? '12px' : '34px',
                right: editingActive ? '34px' : '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                color: editingActive ? 'var(--accent-contrast, #fff)' : 'var(--text-secondary)',
                animation: 'gantt-label-fade 0.28s ease both',
                '@container gantt-toolbar (max-width: 720px)': { display: 'none' },
              }}
            >
              {editingActive ? 'Editing' : 'Edit'}
            </Box>

            {/* Knob — slides L↔R; the lock icon rides it and pops on flip */}
            <Box
              sx={{
                position: 'absolute',
                top: 2,
                left: 2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'var(--bg-card)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: editingActive ? 'var(--accent-primary, #2B2D42)' : 'var(--text-secondary)',
                transform: editingActive ? 'translateX(70px)' : 'translateX(0)',
                transition: 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), color 0.28s ease',
                '@container gantt-toolbar (max-width: 720px)': { transform: 'translateX(0)' },
              }}
            >
              <Box
                key={editingActive ? 'open' : 'closed'}
                sx={{
                  display: 'inline-flex',
                  animation: 'gantt-lock-pop 0.34s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}
              >
                {editingActive ? <LockOpen size={15} weight="bold" /> : <Lock size={15} weight="bold" />}
              </Box>
            </Box>
          </Box>
        </Tooltip>
      )}

      {/* Keyframes for the toolbar micro-animations — scoped via a global <style>. */}
      <Box
        component="style"
        sx={{ display: 'none' }}
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes gantt-tool-pop-in {
              0%   { opacity: 0; transform: scale(0.9) translateY(2px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes gantt-lock-pop {
              0%   { opacity: 0; transform: translateY(2px) scale(0.94); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes gantt-label-fade {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes gantt-segment-pulse {
              0%   { opacity: 0.55; transform: scale(1); }
              100% { opacity: 0;    transform: scale(1.22); }
            }
            @keyframes gantt-pulse-scale-out {
              0%   { transform: scale(1); }
              40%  { transform: scale(1.35); }
              100% { transform: scale(1); }
            }
            @keyframes gantt-pulse-scale-in {
              0%   { transform: scale(1); }
              40%  { transform: scale(0.65); }
              100% { transform: scale(1); }
            }
            @keyframes gantt-pulse-wobble {
              0%   { transform: scale(1, 1); }
              30%  { transform: scale(1.12, 0.92); }
              60%  { transform: scale(0.96, 1.06); }
              100% { transform: scale(1, 1); }
            }
            @keyframes gantt-pulse-slide-left {
              0%   { transform: translateX(0); }
              40%  { transform: translateX(-4px); }
              100% { transform: translateX(0); }
            }
            @keyframes gantt-pulse-slide-right {
              0%   { transform: translateX(0); }
              40%  { transform: translateX(4px); }
              100% { transform: translateX(0); }
            }
            @media (prefers-reduced-motion: reduce) {
              @keyframes gantt-tool-pop-in       { from, to { opacity: 1; transform: none; } }
              @keyframes gantt-lock-pop          { from, to { opacity: 1; transform: none; } }
              @keyframes gantt-label-fade        { from, to { opacity: 1; } }
              @keyframes gantt-segment-pulse     { from, to { opacity: 0; transform: none; } }
              @keyframes gantt-pulse-scale-out   { from, to { transform: none; } }
              @keyframes gantt-pulse-scale-in    { from, to { transform: none; } }
              @keyframes gantt-pulse-wobble      { from, to { transform: none; } }
              @keyframes gantt-pulse-slide-left  { from, to { transform: none; } }
              @keyframes gantt-pulse-slide-right { from, to { transform: none; } }
            }
          `,
        }}
      />
    </Stack>
  );
}
