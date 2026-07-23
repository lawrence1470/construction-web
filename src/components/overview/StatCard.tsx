'use client';

import { Box, Paper, Skeleton, Typography, useTheme, alpha } from '@mui/material';
import { type Icon } from '@phosphor-icons/react';

export type StatTone = 'default' | 'accent' | 'danger' | 'success';

interface StatCardProps {
  label: string;
  value: number;
  icon: Icon;
  tone?: StatTone;
  /** Small line under the value, e.g. "12 in progress" */
  sublabel?: string;
  /** When true, renders a skeleton in the value slot instead of the number */
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: IconComponent,
  tone = 'default',
  sublabel,
  loading = false,
}: StatCardProps) {
  const theme = useTheme();

  const toneColors: Record<StatTone, { fg: string; bg: string }> = {
    default: { fg: theme.palette.text.secondary, bg: theme.palette.action.hover },
    accent: { fg: theme.palette.warm.main, bg: theme.palette.warm.subtle },
    danger: { fg: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.1) },
    success: { fg: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.12) },
  };
  const { fg, bg } = toneColors[tone];

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
        {loading ? <Skeleton variant="text" width={48} /> : value.toLocaleString()}
      </Typography>

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
    </Paper>
  );
}
