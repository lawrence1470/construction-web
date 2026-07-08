'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Tabs, Tab, ToggleButton, ToggleButtonGroup, Alert, Skeleton, alpha } from '@mui/material';
import { SealCheck, Clock, WarningCircle, PaperPlaneTilt, ClipboardText } from '@phosphor-icons/react';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '@/trpc/react';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import { useOrgContext } from '@/components/providers/OrgProvider';
import { canApproveDocuments } from '@/lib/permissions';
import ReviewCard, { type ReviewDocument } from './ReviewCard';

type StatusTab = 'unapproved' | 'approved' | 'overdue';
type CategoryFilter = 'all' | 'submittals' | 'inspections';

export default function ReviewQueueContent() {
  const { projectId, projectName, organizationId } = useProjectContext();
  const { memberRole } = useOrgContext();
  const canApprove = canApproveDocuments(memberRole);

  const [status, setStatus] = useState<StatusTab>('unapproved');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const { data: summary } = api.approval.summary.useQuery(
    { organizationId, projectId },
    { enabled: !!organizationId && !!projectId },
  );

  const { data, isLoading } = api.approval.listAll.useQuery(
    { organizationId, projectId, status: status === 'overdue' ? 'unapproved' : status, category },
    { enabled: !!organizationId && !!projectId && status !== 'overdue' },
  );

  const { data: overdueSlots, isLoading: overdueLoading } = api.approval.listOverdueSlots.useQuery(
    { organizationId, projectId },
    { enabled: !!organizationId && !!projectId && status === 'overdue' },
  );

  const documents = (data?.documents ?? []) as ReviewDocument[];
  const pendingCount = summary?.pending ?? 0;
  const approvedCount = summary?.approved ?? 0;
  const overdueCount = summary?.overdue ?? 0;
  const filteredOverdue = (overdueSlots ?? []).filter((s) => {
    if (category === 'all') return true;
    if (category === 'submittals') return s.kind === 'submittal';
    return s.kind === 'inspection';
  });

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{ p: 3 }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Review Queue
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {projectName}
        </Typography>
      </Box>

      {!canApprove && (
        <Alert severity="info" sx={{ mb: 3, fontSize: 13 }}>
          You can view items here, but only owners and admins can approve them.
        </Alert>
      )}

      {/* Status Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={status}
          onChange={(_, v: StatusTab) => setStatus(v)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', minHeight: 40 },
          }}
        >
          <Tab
            value="unapproved"
            iconPosition="start"
            icon={<Clock size={14} />}
            label={`Pending (${pendingCount})`}
          />
          <Tab
            value="overdue"
            iconPosition="start"
            icon={<WarningCircle size={14} />}
            label={`Overdue (${overdueCount})`}
            sx={overdueCount > 0 ? { color: 'warning.main' } : undefined}
          />
          <Tab
            value="approved"
            iconPosition="start"
            icon={<SealCheck size={14} />}
            label={`Approved (${approvedCount})`}
          />
        </Tabs>
      </Box>

      {/* Category filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, v: CategoryFilter | null) => v && setCategory(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontSize: 12,
              px: 1.5,
              py: 0.5,
              border: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="submittals">Submittals</ToggleButton>
          <ToggleButton value="inspections">Inspections</ToggleButton>
        </ToggleButtonGroup>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {status === 'overdue'
            ? `${filteredOverdue.length} item${filteredOverdue.length === 1 ? '' : 's'}`
            : `${documents.length} item${documents.length === 1 ? '' : 's'}`}
        </Typography>
      </Box>

      {/* Overdue tab body */}
      {status === 'overdue' ? (
        overdueLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: '12px' }} />
            ))}
          </Box>
        ) : filteredOverdue.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1, textAlign: 'center' }}>
            <SealCheck size={40} weight="duotone" />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>Nothing overdue</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              All required submittals and inspections are on schedule.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredOverdue.map((slot) => (
              <OverdueSlotRow key={slot.id} slot={slot} />
            ))}
          </Box>
        )
      ) : isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: '12px' }} />
          ))}
        </Box>
      ) : documents.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center',
            gap: 1,
          }}
        >
          <SealCheck size={40} weight="duotone" />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            {status === 'unapproved' ? 'Nothing waiting on you' : 'No approved items yet'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {status === 'unapproved'
              ? 'New submittals and inspections will appear here.'
              : 'Once items are approved they will show up here.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {documents.map((doc) => (
            <ReviewCard
              key={doc.id}
              doc={doc}
              organizationId={organizationId}
              projectId={projectId}
              memberRole={memberRole}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

interface OverdueSlot {
  id: string;
  taskId: string;
  taskName: string;
  kind: 'submittal' | 'inspection';
  index: number;
  name: string | null;
  dueDate: Date | string;
}

function OverdueSlotRow({ slot }: { slot: OverdueSlot }) {
  const isSubmittal = slot.kind === 'submittal';
  const Icon = isSubmittal ? PaperPlaneTilt : ClipboardText;
  const accentColor = isSubmittal ? '#2563EB' : '#8E44AD';
  const due = new Date(slot.dueDate);
  const displayName = slot.name?.trim()
    || `${isSubmittal ? 'Submittal' : 'Inspection'} ${slot.index + 1}`;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.75,
        py: 1.25,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette.warm.main, 0.35),
        bgcolor: 'warm.subtle',
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '8px',
          bgcolor: `${accentColor}1F`,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            mt: 0.25,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {slot.taskName}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'warning.main' }}>
          Due {format(due, 'MMM d')}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>
          {formatDistanceToNow(due, { addSuffix: true })}
        </Typography>
      </Box>
    </Box>
  );
}
