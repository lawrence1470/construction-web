'use client';

import { Box, Paper, Typography } from '@mui/material';

interface OverviewCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared shell for overview panels — soft elevation, hover lift, compact header. */
export default function OverviewCard({ title, action, children }: OverviewCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.15s ease',
        '&:hover': { boxShadow: 'var(--shadow-card-hover)' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 2,
          pt: 1.75,
          pb: 1.25,
        }}
      >
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
          {title}
        </Typography>
        {action}
      </Box>
      <Box sx={{ px: 2, pb: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Paper>
  );
}
