'use client';

import { Box, Typography, useTheme } from '@mui/material';

interface ProgressRingProps {
  /** 0–100 */
  percent: number;
  size?: number;
}

/** Static completion ring with the percent in the center. */
export default function ProgressRing({ percent, size = 132 }: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box
        component="svg"
        viewBox={`0 0 ${size} ${size}`}
        sx={{ display: 'block', width: size, height: size, transform: 'rotate(-90deg)' }}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : theme.palette.divider}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.palette.warm.main}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.25,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '1.625rem',
            fontWeight: 590,
            lineHeight: 1,
            color: 'text.primary',
            letterSpacing: '-0.02em',
          }}
        >
          {clamped}%
        </Typography>
        <Typography
          sx={{
            fontSize: '0.5625rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          Complete
        </Typography>
      </Box>
    </Box>
  );
}
