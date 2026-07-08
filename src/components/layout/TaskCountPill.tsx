'use client';

import { ListChecks } from '@phosphor-icons/react';
import { Box, Tooltip, Typography } from '@mui/material';
import { keepPreviousData } from '@tanstack/react-query';
import { api } from '@/trpc/react';

interface TaskCountPillProps {
  organizationId: string;
  projectId: string;
}

export default function TaskCountPill({ organizationId, projectId }: TaskCountPillProps) {
  const { data: tasks } = api.gantt.tasks.useQuery(
    { organizationId, projectId },
    { enabled: !!organizationId && !!projectId, placeholderData: keepPreviousData },
  );

  if (!tasks) return null;

  const count = tasks.length;
  const label = count === 1 ? 'task' : 'tasks';

  return (
    <Tooltip title="Total tasks in this Gantt" arrow placement="bottom">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.625,
          height: 34,
          px: 1.25,
          borderRadius: '10px',
          bgcolor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          flexShrink: 0,
        }}
      >
        <ListChecks size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
          }}
        >
          {count}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: 'text.secondary',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}
