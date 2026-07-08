'use client';

import { Box, Stack, Typography } from '@mui/material';
import { ArrowRight, LinkSimple, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { LinkSelectionItem } from '../hooks/useTaskLinking';

interface TaskLinkingBarProps {
  selection: Pick<LinkSelectionItem, 'id' | 'name'>[];
  onLink: () => void;
  onClear: () => void;
}

// Position → badge color. Mirrors the `--gantt-link-c` values in globals.css:
// ① predecessor blue, ② successor violet, ③+ chain navy.
const DOT_COLORS = ['#2563eb', '#7c3aed', 'var(--accent-primary, #2B2D42)'] as const;

function dotColor(index: number): string {
  return DOT_COLORS[Math.min(index, DOT_COLORS.length - 1)]!;
}

function NumberDot({ index }: { index: number }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        width: 18,
        height: 18,
        borderRadius: '50%',
        bgcolor: dotColor(index),
        color: index >= 2 ? 'var(--accent-contrast, #fff)' : '#fff',
        fontSize: '0.6875rem',
        fontWeight: 800,
        lineHeight: '18px',
        textAlign: 'center',
      }}
    >
      {index < 9 ? index + 1 : '+'}
    </Box>
  );
}

export default function TaskLinkingBar({ selection, onLink, onClear }: TaskLinkingBarProps) {
  if (selection.length === 0) return null;

  const ready = selection.length >= 2;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        maxWidth: 'calc(100% - 24px)',
        px: 1.25,
        py: 1,
        pl: 1.75,
        borderRadius: '12px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'var(--shadow-overlay)',
        animation: 'gantt-link-bar-in 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
        '@keyframes gantt-link-bar-in': {
          from: { opacity: 0, transform: 'translate(-50%, 8px)' },
          to: { opacity: 1, transform: 'translate(-50%, 0)' },
        },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <LinkSimple size={16} weight="bold" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />

      {/* Selected tasks — names with direction arrows */}
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, overflow: 'hidden' }}>
        {selection.map((task, index) => (
          <Stack key={task.id} direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            {index > 0 && <ArrowRight size={13} weight="bold" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            <NumberDot index={index} />
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'text.primary',
                maxWidth: 150,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {task.name || 'Untitled task'}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {!ready && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap', flexShrink: 0 }}>
          — click the successor task
        </Typography>
      )}

      <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.25 }}>
        <Button
          variant="contained"
          size="small"
          onClick={onLink}
          disabled={!ready}
          startIcon={<LinkSimple size={13} weight="bold" />}
          sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600, px: 1.5, borderRadius: '8px', whiteSpace: 'nowrap' }}
        >
          Link
        </Button>
        <Box
          component="button"
          type="button"
          onClick={onClear}
          aria-label="Cancel linking"
          title="Cancel (Esc)"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '8px',
            border: 'none',
            bgcolor: 'transparent',
            color: 'text.secondary',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <X size={14} weight="bold" />
        </Box>
      </Box>
    </Box>
  );
}
