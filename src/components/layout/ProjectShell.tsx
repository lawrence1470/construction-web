'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Box, Typography, Tooltip } from '@mui/material';
import { CalendarDots } from '@phosphor-icons/react';
import { differenceInCalendarDays } from 'date-fns';
import FilesContent from '@/components/files/FilesContent';
import { IBeamLoader } from '@/components/ui/IBeamLoader';
import TaskProgressCard from '@/components/bryntum/components/TaskProgressCard';
import TaskCountPill from '@/components/layout/TaskCountPill';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useProjectSwitcher } from '@/hooks/useProjectSwitcher';
import { api } from '@/trpc/react';

const BryntumGanttWrapper = dynamic(
  () => import('@/components/bryntum/BryntumGanttWrapper'),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
        <IBeamLoader size={32} />
      </Box>
    ),
  }
);

interface ProjectShellProps {
  children: ReactNode;
  projectId: string;
  projectName: string;
}

const SCHEDULE_TOOLTIP = 'Based on the latest task end date in your schedule';

function SchedulePill({ endDate }: { endDate: string | null }) {
  if (!endDate) {
    return (
      <Tooltip title="Add tasks with end dates to track your project timeline" arrow placement="bottom">
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
          <CalendarDots size={13} style={{ flexShrink: 0, opacity: 0.4 }} />
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 500, color: 'text.secondary', lineHeight: 1, whiteSpace: 'nowrap' }}>
            No end date
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  const daysLeft = differenceInCalendarDays(new Date(endDate), new Date());
  const label =
    daysLeft > 0
      ? `${daysLeft}d left`
      : daysLeft === 0
        ? 'Due today'
        : `${Math.abs(daysLeft)}d overdue`;
  const color =
    daysLeft > 0 ? 'text.secondary' : daysLeft === 0 ? 'var(--status-amber)' : 'var(--status-red)';

  return (
    <Tooltip title={SCHEDULE_TOOLTIP} arrow placement="bottom">
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
        <CalendarDots size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color, lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default function ProjectShell({ children, projectId, projectName }: ProjectShellProps) {
  const pathname = usePathname();
  const { activeOrganizationId, orgSlug } = useOrgFromUrl();
  const { currentProject } = useProjectSwitcher(activeOrganizationId, orgSlug);
  const isGanttRoute = pathname.endsWith('/gantt');
  const isFilesRoute = pathname.endsWith('/files');
  const [ganttMounted, setGanttMounted] = useState(false);
  const [filesMounted, setFilesMounted] = useState(false);

  const { data: reqStats } = api.gantt.requirementStats.useQuery(
    { organizationId: activeOrganizationId!, projectId },
    { enabled: !!activeOrganizationId }
  );

  // Lazy-mount each tab on first visit — avoids loading heavy bundles until needed
  useEffect(() => {
    if (isGanttRoute && !ganttMounted) {
      setGanttMounted(true);
    }
    if (isFilesRoute && !filesMounted) {
      setFilesMounted(true);
    }
  }, [isGanttRoute, isFilesRoute, ganttMounted, filesMounted]);

  return (
    <>
      {/* Gantt tab — kept alive after first visit */}
      {ganttMounted && (
        <Box
          sx={{
            flex: 1,
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'clip',
            width: '100%',
            p: 3,
            display: isGanttRoute ? 'flex' : 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexShrink: 0 }}>
            {currentProject && activeOrganizationId && (
              <>
                <TaskCountPill organizationId={activeOrganizationId} projectId={projectId} />
                <TaskProgressCard
                  uploaded={reqStats?.totalUploaded ?? 0}
                  required={reqStats?.totalRequired ?? 0}
                />
                <SchedulePill endDate={reqStats?.latestEndDate ? String(reqStats.latestEndDate) : null} />
              </>
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <BryntumGanttWrapper
              projectId={projectId}
              isVisible={isGanttRoute}
            />
          </Box>
        </Box>
      )}

      {/* Files tab — kept alive after first visit */}
      {filesMounted && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            overflow: 'hidden',
            display: isFilesRoute ? 'flex' : 'none',
          }}
        >
          <FilesContent />
        </Box>
      )}

      {/* Other pages render normally via Next.js routing */}
      {children}
    </>
  );
}
