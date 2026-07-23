'use client';

import Link from 'next/link';
import { Box, Skeleton, Typography, useTheme, alpha } from '@mui/material';
import { CheckCircle, FileArrowUp, SealCheck, CaretRight } from '@phosphor-icons/react';
import { api } from '@/trpc/react';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import OverviewCard from './OverviewCard';

const MAX_ROWS = 6;
const DAY_MS = 86_400_000;

interface NeedsAttentionCardProps {
  orgSlug: string;
}

/** Overdue requirement slots — the "what's on fire" panel, linking into the Review Queue. */
export default function NeedsAttentionCard({ orgSlug }: NeedsAttentionCardProps) {
  const theme = useTheme();
  const { projectId, projectSlug, organizationId } = useProjectContext();

  const { data: overdueSlots = [], isLoading } = api.approval.listOverdueSlots.useQuery(
    { organizationId, projectId },
    { enabled: !!organizationId && !!projectId, retry: false },
  );

  const reviewsHref = `/${orgSlug}/projects/${projectSlug}/reviews`;
  const visible = overdueSlots.slice(0, MAX_ROWS);
  const hiddenCount = overdueSlots.length - visible.length;

  return (
    <OverviewCard
      title="Needs attention"
      action={
        overdueSlots.length > 0 ? (
          <Link href={reviewsHref} style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'text.primary',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Review queue
              <CaretRight size={10} weight="bold" />
            </Typography>
          </Link>
        ) : undefined
      }
    >
      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 0.5 }}>
          <Skeleton variant="rounded" height={34} />
          <Skeleton variant="rounded" height={34} />
        </Box>
      ) : overdueSlots.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 3,
            textAlign: 'center',
          }}
        >
          <CheckCircle size={28} weight="fill" color={theme.palette.success.main} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 550, color: 'text.primary', lineHeight: 1.2 }}>
            All clear
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', lineHeight: 1.2 }}>
            Nothing overdue on this project
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {visible.map((slot) => {
            const daysLate = Math.floor(
              (Date.now() - new Date(slot.dueDate).getTime()) / DAY_MS,
            );
            const KindIcon = slot.kind === 'inspection' ? SealCheck : FileArrowUp;
            const label = slot.name?.trim()
              ? slot.name
              : `${slot.kind === 'inspection' ? 'Inspection' : 'Submittal'} #${slot.index + 1}`;

            return (
              <Link
                key={slot.id}
                href={reviewsHref}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.875,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '6px',
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: 'error.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <KindIcon size={12} weight="bold" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'text.primary',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.6875rem',
                        color: 'text.secondary',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {slot.taskName}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      color: 'error.main',
                      lineHeight: 1,
                      px: 0.75,
                      py: 0.5,
                      borderRadius: 'var(--radius-pill)',
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {daysLate < 1 ? 'due today' : `${daysLate}d late`}
                  </Typography>
                </Box>
              </Link>
            );
          })}
          {hiddenCount > 0 && (
            <Link href={reviewsHref} style={{ textDecoration: 'none' }}>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                  px: 1,
                  py: 0.875,
                  lineHeight: 1,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                +{hiddenCount} more overdue
              </Typography>
            </Link>
          )}
        </Box>
      )}
    </OverviewCard>
  );
}
