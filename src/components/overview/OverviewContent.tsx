'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Box, Typography } from '@mui/material';
import {
  ListChecks,
  CheckCircle,
  ClockCountdown,
  FileArrowUp,
  CalendarBlank,
} from '@phosphor-icons/react';
import { api } from '@/trpc/react';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import OverviewHero from './OverviewHero';
import OverviewCard from './OverviewCard';
import StatCard from './StatCard';
import ProgressRing from './ProgressRing';
import NeedsAttentionCard from './NeedsAttentionCard';
import SiteCard from './SiteCard';

/** Week-over-week percent change; null when there is no meaningful baseline. */
function weekDelta(series: number[]): number | null {
  if (series.length < 2) return null;
  const current = series[series.length - 1]!;
  const previous = series[series.length - 2]!;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function OverviewContent() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params.orgSlug;
  const { projectId, projectName, projectSlug, projectImageUrl, projectLocation, organizationId } =
    useProjectContext();

  const { data: overview } = api.project.overview.useQuery(
    { projectId },
    { enabled: !!projectId, retry: false },
  );
  const { data: requirementStats } = api.gantt.requirementStats.useQuery(
    { organizationId, projectId },
    { enabled: !!organizationId && !!projectId, retry: false },
  );

  const scheduledSeries = overview?.weekly.map((w) => w.scheduled) ?? [];
  const completedSeries = overview?.weekly.map((w) => w.completed) ?? [];

  const taskCount = overview?.taskCount ?? 0;
  const completedCount = overview?.completedCount ?? 0;
  const overdueCount = overview?.overdueCount ?? 0;
  const completedShare = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  const ganttHref = `/${orgSlug}/projects/${projectSlug}/gantt`;

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <OverviewHero name={projectName} location={projectLocation} imageUrl={projectImageUrl} />

        {/* Stat cards */}
        <Box
          className="stagger-in"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <StatCard
            label="Total tasks"
            value={taskCount}
            icon={ListChecks}
            sublabel={`${overview?.inProgressCount ?? 0} in progress`}
            spark={scheduledSeries}
          />
          <StatCard
            label="Completed"
            value={completedCount}
            icon={CheckCircle}
            tone="success"
            sublabel={`${completedShare}% of all tasks`}
            deltaPercent={weekDelta(completedSeries)}
            positiveIsGood
            spark={completedSeries}
          />
          <StatCard
            label="Behind schedule"
            value={overdueCount}
            icon={ClockCountdown}
            tone={overdueCount > 0 ? 'danger' : 'success'}
            sublabel={overdueCount > 0 ? 'tasks past their finish date' : 'everything on track'}
          />
          <StatCard
            label="Docs received"
            value={requirementStats?.totalUploaded ?? 0}
            icon={FileArrowUp}
            tone="accent"
            sublabel={`of ${requirementStats?.totalRequired ?? 0} required`}
          />
        </Box>

        {/* Panels */}
        <Box
          className="stagger-in"
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              lg: 'minmax(0, 5fr) minmax(0, 4fr) minmax(0, 3fr)',
            },
            gap: 2,
            alignItems: 'stretch',
          }}
        >
          {/* Progress + up next */}
          <OverviewCard title="Progress">
            <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flex: 1, minWidth: 0 }}>
              <ProgressRing percent={overview?.completionPercent ?? 0} />
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
                  Up next
                </Typography>
                {overview && overview.upcoming.length > 0 ? (
                  overview.upcoming.slice(0, 4).map((task) => (
                    <Link
                      key={task.id}
                      href={ganttHref}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1,
                          py: 0.625,
                          mx: -1,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Typography
                          sx={{
                            flex: 1,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'text.primary',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.name}
                        </Typography>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.375,
                            flexShrink: 0,
                            color: 'text.secondary',
                          }}
                        >
                          <CalendarBlank size={10} weight="bold" />
                          <Typography
                            sx={{
                              fontSize: '0.625rem',
                              fontWeight: 500,
                              lineHeight: 1,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {format(new Date(task.endDate), 'MMM d')}
                          </Typography>
                        </Box>
                      </Box>
                    </Link>
                  ))
                ) : (
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.4 }}>
                    No upcoming deadlines
                  </Typography>
                )}
              </Box>
            </Box>
          </OverviewCard>

          <NeedsAttentionCard orgSlug={orgSlug} />
          <SiteCard orgSlug={orgSlug} />
        </Box>
      </Box>
    </Box>
  );
}
