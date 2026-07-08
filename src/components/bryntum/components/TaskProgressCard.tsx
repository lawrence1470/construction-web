'use client';

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';

interface TaskProgressCardProps {
  uploaded: number;
  required: number;
}

export default function TaskProgressCard({ uploaded, required }: TaskProgressCardProps) {
  const percent = required > 0 ? Math.min(Math.round((uploaded / required) * 100), 100) : 0;
  const isFulfilled = required > 0 && uploaded >= required;
  const remaining = Math.max(required - uploaded, 0);

  const accentColor = useMemo(() => {
    if (isFulfilled) return 'var(--status-green)';
    if (percent >= 50) return 'var(--status-amber)';
    return 'var(--accent-primary)';
  }, [percent, isFulfilled]);

  if (required === 0) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 34,
          px: 1.5,
          borderRadius: '10px',
          bgcolor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: 'text.secondary', lineHeight: 1, whiteSpace: 'nowrap' }}>
          No requirements set
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        height: 34,
        pl: 1.25,
        pr: 1.5,
        borderRadius: '10px',
        bgcolor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        flexShrink: 0,
      }}
    >
      {/* Big remaining number — the hero */}
      <Typography
        sx={{
          fontSize: '1.0625rem',
          fontWeight: 700,
          color: isFulfilled ? 'var(--status-green)' : 'text.primary',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
        }}
      >
        {remaining}
      </Typography>

      {/* Right side: bar + label */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 52 }}>
        {/* Progress bar */}
        <Box
          sx={{
            width: '100%',
            height: 3,
            borderRadius: '1.5px',
            bgcolor: 'action.selected',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              borderRadius: '1.5px',
              bgcolor: accentColor,
              width: `${percent}%`,
              minWidth: uploaded > 0 ? 3 : 0,
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
            }}
          />
        </Box>

        {/* Label */}
        <Typography
          sx={{
            fontSize: '0.5rem',
            fontWeight: 600,
            color: isFulfilled ? 'var(--status-green)' : 'text.secondary',
            lineHeight: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}
        >
          {isFulfilled ? 'all complete' : `remaining of ${required}`}
        </Typography>
      </Box>
    </Box>
  );
}
