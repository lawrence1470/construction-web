'use client';

import { useState } from 'react';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { Check } from '@phosphor-icons/react';
import { api } from '@/trpc/react';
import { canApproveDocuments } from '@/lib/permissions';
import { useSnackbar } from '@/hooks/useSnackbar';

type ApprovalStatus = 'approved' | 'unapproved' | string;

interface ApprovalToggleProps {
  documentId: string;
  approvalStatus: ApprovalStatus;
  organizationId: string;
  projectId: string;
  memberRole: string;
  size?: 'sm' | 'md';
}

export default function ApprovalToggle({
  documentId,
  approvalStatus,
  organizationId,
  projectId,
  memberRole,
  size = 'md',
}: ApprovalToggleProps) {
  const utils = api.useUtils();
  const { showSnackbar } = useSnackbar();
  const canApprove = canApproveDocuments(memberRole);
  const [optimistic, setOptimistic] = useState<ApprovalStatus | null>(null);

  const effectiveStatus = optimistic ?? approvalStatus;
  const isApproved = effectiveStatus === 'approved';

  const setStatus = api.approval.setStatus.useMutation({
    onSuccess: () => {
      void utils.approval.listAll.invalidate({ organizationId, projectId });
      void utils.approval.summary.invalidate({ organizationId, projectId });
      void utils.document.search.invalidate();
      void utils.document.aiSearch.invalidate();
      void utils.document.listByFolder.invalidate();
      void utils.document.listByTask.invalidate();
    },
    onError: (error) => {
      setOptimistic(null);
      showSnackbar(error.message || 'Failed to update approval', 'error');
    },
  });

  const handleClick = () => {
    if (!canApprove || setStatus.isPending) return;
    const next: ApprovalStatus = isApproved ? 'unapproved' : 'approved';
    setOptimistic(next);
    setStatus.mutate({
      documentId,
      organizationId,
      approved: !isApproved,
    });
  };

  const isPending = setStatus.isPending;
  const padX = size === 'sm' ? '8px' : '10px';
  const padY = size === 'sm' ? '3px' : '4px';
  const fontSize = size === 'sm' ? 10 : 11;
  const iconSize = size === 'sm' ? 11 : 12;

  // Read-only badge for non-approvers
  if (!canApprove) {
    return (
      <Tooltip title={isApproved ? 'Approved by an admin' : 'Awaiting approval from an admin'}>
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '999px',
            px: padX,
            py: padY,
            bgcolor: isApproved ? 'success.main' : 'action.selected',
            color: isApproved ? 'success.contrastText' : 'text.secondary',
            fontSize,
            fontWeight: 600,
            lineHeight: 1.2,
            userSelect: 'none',
          }}
        >
          {isApproved && <Check size={iconSize} />}
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
            {isApproved ? 'Approved' : 'Unapproved'}
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  // Interactive pill for approvers. Use the native `title` attribute so it's
  // greppable for tests; skip the MUI Tooltip wrapper to avoid double tooltips
  // and the disabled-child-in-Tooltip warning.
  const tooltipText = isPending
    ? 'Saving…'
    : isApproved
      ? 'Click to mark as unapproved'
      : 'Click to mark as approved';

  return (
    <Box
      component="button"
      type="button"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      title={tooltipText}
      aria-label={tooltipText}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '999px',
        px: padX,
        py: padY,
        border: '1px solid',
        borderColor: isApproved ? 'success.main' : 'divider',
        bgcolor: isApproved ? 'success.main' : 'background.paper',
        color: isApproved ? 'success.contrastText' : 'text.secondary',
        fontSize,
        fontWeight: 600,
        lineHeight: 1.2,
        cursor: isPending ? 'progress' : 'pointer',
        opacity: isPending ? 0.7 : 1,
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover': isPending
          ? {}
          : isApproved
            ? { bgcolor: 'success.dark' }
            : { borderColor: 'success.main', color: 'success.main' },
      }}
    >
      {isPending ? (
        <CircularProgress size={iconSize} thickness={5} sx={{ color: 'inherit' }} />
      ) : isApproved ? (
        <Check size={iconSize} />
      ) : null}
      <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
        {isApproved ? 'Approved' : 'Unapproved'}
      </Typography>
    </Box>
  );
}
