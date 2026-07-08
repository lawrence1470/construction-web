'use client';

import { EnvelopeSimple } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Box, Typography, Stack, Skeleton } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Button } from '@/components/ui/button';
import { useInvitationActions } from '@/hooks/useInvitationActions';
import { formatRole } from '@/lib/utils/formatting';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

interface PendingInvitesListProps {
  invitations: Invitation[];
  isLoading: boolean;
  projectId: string;
  canManage: boolean;
}

export default function PendingInvitesList({
  invitations,
  isLoading,
  projectId,
  canManage,
}: PendingInvitesListProps) {
  const theme = useTheme();
  const { revokeInvitation, resendInvitation, isRevoking, isResending } = useInvitationActions();

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        {[1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.75,
              borderRadius: '12px',
            }}
          >
            <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: '10px' }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="33%" height={16} sx={{ mb: 0.5 }} />
              <Skeleton width="25%" height={12} />
            </Box>
            <Skeleton width={80} height={24} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <Box
      component={motion.div}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.04,
          },
        },
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      {pendingInvitations.map((invitation) => (
        <Box
          key={invitation.id}
          component={motion.div}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0 },
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.75,
            borderRadius: '12px',
            transition: 'background-color 0.2s',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <EnvelopeSimple size={16} color={theme.palette.primary.main} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {invitation.email}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {formatRole(invitation.role)} • Sent {formatDate(invitation.createdAt)}
            </Typography>
          </Box>

          {canManage && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                size="small"
                loading={
                  isResending && resendInvitation.variables?.invitationId === invitation.id
                }
                loadingPosition="start"
                disabled={
                  isRevoking && revokeInvitation.variables?.invitationId === invitation.id
                }
                onClick={() =>
                  resendInvitation.mutate({
                    projectId,
                    invitationId: invitation.id,
                  })
                }
              >
                Resend
              </Button>
              <Button
                variant="text"
                size="small"
                loading={
                  isRevoking && revokeInvitation.variables?.invitationId === invitation.id
                }
                loadingPosition="start"
                disabled={
                  isResending && resendInvitation.variables?.invitationId === invitation.id
                }
                onClick={() =>
                  revokeInvitation.mutate({
                    projectId,
                    invitationId: invitation.id,
                  })
                }
                sx={{ color: 'text.secondary' }}
              >
                Revoke
              </Button>
            </Stack>
          )}
        </Box>
      ))}
    </Box>
  );
}
