'use client';

import { useState } from 'react';
import { Buildings, Info } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Box, Tooltip, Typography, Skeleton } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { formatRole } from '@/lib/utils/formatting';
import UserAvatar from '@/components/ui/UserAvatar';
import MemberProjectStack, {
  type MemberProject,
} from '@/components/team/MemberProjectStack';
import EditUserDialog from '@/components/team/EditUserDialog';
import RemoveFromOrgDialog from '@/components/team/RemoveFromOrgDialog';

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MembersListProps {
  members: Member[];
  isLoading: boolean;
  projectsByUserId?: Record<string, MemberProject[]>;
  currentProjectId?: string;
  /** Whether the current user has permission to remove members. */
  canRemove?: boolean;
  /** Whether the current user has permission to edit other members (role + project memberships). */
  canEdit?: boolean;
  /** Current user's id — used to suppress self-edits and self-removal. */
  currentUserId?: string;
  /** Map of userId → org-level role. */
  orgRoleByUserId?: Record<string, string>;
  /** Org id; required when canEdit or canRemove is enabled. */
  organizationId?: string;
  /** Org display name; used in the destructive remove dialog copy. */
  organizationName?: string;
}

export default function MembersList({
  members,
  isLoading,
  projectsByUserId,
  currentProjectId,
  canRemove = false,
  canEdit = false,
  currentUserId,
  orgRoleByUserId,
  organizationId,
  organizationName,
}: MembersListProps) {
  const theme = useTheme();
  const [activeAction, setActiveAction] = useState<{
    action: 'edit' | 'remove';
    member: Member;
  } | null>(null);

  const getRoleDescription = (role: string | undefined): string => {
    switch (role) {
      case 'owner':
        return 'Full access — manage members, roles, projects, and organization settings';
      case 'admin':
        return 'Manage members, roles, and projects — cannot change organization settings';
      case 'member':
        return 'View projects they are invited to and upload documents';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
            <Skeleton variant="circular" width={38} height={38} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="rounded" width={120} height={14} sx={{ borderRadius: '4px' }} />
                <Skeleton variant="rounded" width={50} height={18} sx={{ borderRadius: '999px' }} />
              </Box>
              <Skeleton variant="rounded" width={180} height={12} sx={{ borderRadius: '4px', mt: 0.75 }} />
            </Box>
          </Box>
        ))}
      </Box>
    );
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
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
    >
      {members.map((member) => {
        const clickable =
          canEdit &&
          member.user.id !== currentUserId &&
          orgRoleByUserId?.[member.user.id] !== 'owner';

        return (
          <Box
            key={member.id}
            component={motion.div}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
            whileHover={
              clickable
                ? { y: -2, transition: { duration: 0.15, ease: 'easeOut' } }
                : undefined
            }
            whileTap={
              clickable
                ? { scale: 0.985, transition: { duration: 0.1 } }
                : undefined
            }
            onClick={
              clickable ? () => setActiveAction({ action: 'edit', member }) : undefined
            }
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.75,
              borderRadius: '12px',
              border: '1px solid transparent',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
              ...(clickable && {
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'divider',
                  boxShadow: 'var(--shadow-card-hover)',
                },
              }),
            }}
          >
            <UserAvatar user={member.user} size={38} />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {member.user.name || member.user.email}
                </Typography>
                <Tooltip
                  title={getRoleDescription(orgRoleByUserId?.[member.user.id])}
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      cursor: 'default',
                    }}
                  >
                    {formatRole(orgRoleByUserId?.[member.user.id] ?? member.role)}
                  </Box>
                </Tooltip>
                {member.user.id === currentUserId && (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: '999px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    You
                  </Box>
                )}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {member.user.email}
              </Typography>
              {projectsByUserId &&
                (orgRoleByUserId?.[member.user.id] === 'owner' ? (
                  <OwnerProjectsBadge
                    count={(projectsByUserId[member.user.id] ?? []).length}
                  />
                ) : (
                  <MemberProjectStack
                    projects={projectsByUserId[member.user.id] ?? []}
                    currentProjectId={currentProjectId}
                    userName={member.user.name || member.user.email}
                    canManage={
                      canRemove && member.user.id !== currentUserId
                    }
                  />
                ))}
            </Box>
          </Box>
        );
      })}

      {organizationId && activeAction?.action === 'edit' && (
        <EditUserDialog
          open
          onClose={() => setActiveAction(null)}
          organizationId={organizationId}
          userId={activeAction.member.user.id}
          userName={activeAction.member.user.name || activeAction.member.user.email}
          orgRole={
            orgRoleByUserId?.[activeAction.member.user.id] ?? activeAction.member.role
          }
          currentProjectIds={
            new Set(
              (projectsByUserId?.[activeAction.member.user.id] ?? []).map(
                (p) => p.id,
              ),
            )
          }
          memberIdByProjectId={Object.fromEntries(
            (projectsByUserId?.[activeAction.member.user.id] ?? []).map((p) => [
              p.id,
              p.memberId,
            ]),
          )}
          roleByProjectId={Object.fromEntries(
            (projectsByUserId?.[activeAction.member.user.id] ?? []).map((p) => [
              p.id,
              p.role,
            ]),
          )}
          onRemove={
            canRemove && activeAction.member.user.id !== currentUserId
              ? () =>
                  setActiveAction({
                    action: 'remove',
                    member: activeAction.member,
                  })
              : undefined
          }
        />
      )}

      {organizationId && activeAction?.action === 'remove' && (
        <RemoveFromOrgDialog
          open
          onClose={() => setActiveAction(null)}
          organizationId={organizationId}
          organizationName={organizationName ?? 'this organization'}
          userId={activeAction.member.user.id}
          userName={activeAction.member.user.name || activeAction.member.user.email}
          userRole={formatRole(
            orgRoleByUserId?.[activeAction.member.user.id] ?? activeAction.member.role,
          )}
          projectCount={
            (projectsByUserId?.[activeAction.member.user.id] ?? []).length
          }
        />
      )}
    </Box>
  );
}

function OwnerProjectsBadge({ count }: { count: number }) {
  const theme = useTheme();
  return (
    <Box sx={{ mt: 1 }}>
      <Tooltip
        title="Owners are automatically members of every project in this organization."
        arrow
        placement="top"
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.875,
            pl: 1,
            pr: 1.25,
            py: 0.5,
            borderRadius: '999px',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            color: theme.palette.primary.main,
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <Buildings size={13} weight="fill" />
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'inherit',
              lineHeight: 1,
            }}
          >
            All projects
            {count > 0 && (
              <Box
                component="span"
                sx={{ ml: 0.5, opacity: 0.7, fontWeight: 500 }}
              >
                · {count}
              </Box>
            )}
          </Typography>
          <Info
            size={11}
            weight="regular"
            style={{ opacity: 0.5, marginLeft: 2 }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
}
