'use client';

import { Box, Paper, Skeleton, Typography, useTheme, alpha } from '@mui/material';
import { TrendUp, TrendDown, type Icon } from '@phosphor-icons/react';
import Sparkline from './Sparkline';
import { useCountUp } from './hooks/useCountUp';

export type StatTone = 'default' | 'accent' | 'danger' | 'success';

interface StatCardProps {
  label: string;
  value: number;
  icon: Icon;
  tone?: StatTone;
  /** Small line under the value, e.g. "12 in progress" */
  sublabel?: string;
  /** Week-over-week change in percent; sign picks the arrow */
  deltaPercent?: number | null;
  /** When true, a positive delta renders green (throughput); when false, red (backlog) */
  positiveIsGood?: boolean;
  spark?: number[];
  /** When true, renders a skeleton in the value slot instead of the number */
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: IconComponent,
  tone = 'default',
  sublabel,
  deltaPercent,
  positiveIsGood = true,
  spark,
  loading = false,
}: StatCardProps) {
  const theme = useTheme();
  const displayed = useCountUp(value);

  const toneColors: Record<StatTone, { fg: string; bg: string }> = {
    default: { fg: theme.palette.text.secondary, bg: theme.palette.action.hover },
    accent: { fg: theme.palette.warm.main, bg: theme.palette.warm.subtle },
    danger: { fg: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.1) },
    success: { fg: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.12) },
  };
  const { fg, bg } = toneColors[tone];

  const showDelta = deltaPercent != null && Number.isFinite(deltaPercent) && deltaPercent !== 0;
  const deltaIsGood = showDelta && (deltaPercent > 0) === positiveIsGood;
  const deltaColor = deltaIsGood ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
          boxShadow: 'var(--shadow-card-hover)',
          transform: 'translateY(-1px)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: 'text.secondary',
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '8px',
            bgcolor: bg,
            color: fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconComponent size={14} weight="bold" />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '1.75rem',
            fontWeight: 590,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {loading ? <Skeleton variant="text" width={48} /> : displayed.toLocaleString()}
        </Typography>
        {!loading && showDelta && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.375,
              px: 0.75,
              py: 0.375,
              borderRadius: 'var(--radius-pill)',
              bgcolor: alpha(deltaColor, 0.12),
              color: deltaColor,
              flexShrink: 0,
            }}
          >
            {deltaPercent > 0 ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />}
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Math.abs(deltaPercent)}%
            </Typography>
          </Box>
        )}
      </Box>

      {sublabel && (
        <Typography
          sx={{
            fontSize: '0.6875rem',
            color: 'text.secondary',
            lineHeight: 1.2,
            mt: -0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sublabel}
        </Typography>
      )}

      {spark && (
        <Box sx={{ mt: 'auto', height: 32 }}>
          {spark.some((v) => v > 0) && (
            <Sparkline values={spark} color={tone === 'default' ? theme.palette.warm.main : fg} />
          )}
        </Box>
      )}
    </Paper>
  );
}
