'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Check, Info, PencilSimple, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useSnackbar } from '@/hooks/useSnackbar';
import ProjectAvatar from '@/components/ui/ProjectAvatar';

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  userId: string;
  userName: string;
  /** User's current org role. */
  orgRole: string;
  /** Project ids the user is currently a member of. */
  currentProjectIds: Set<string>;
  /** Map from projectId → ProjectMember.id, used when removing or updating roles. */
  memberIdByProjectId: Record<string, string>;
  /** Map from projectId → current project-level role. */
  roleByProjectId: Record<string, string>;
  /** Called when the user clicks "Remove from org" — lets the parent open the destructive confirm dialog. */
  onRemove?: () => void;
}

const ORG_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
] as const;

const PROJECT_ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
] as const;

export default function EditUserDialog({
  open,
  onClose,
  organizationId,
  userId,
  userName,
  orgRole,
  currentProjectIds,
  memberIdByProjectId,
  roleByProjectId,
  onRemove,
}: EditUserDialogProps) {
  const theme = useTheme();
  const utils = api.useUtils();
  const { showSnackbar } = useSnackbar();

  const { data: orgProjects = [] } = api.project.list.useQuery(
    { organizationId },
    { enabled: open && !!organizationId },
  );

  // Drafts are seeded once at mount. The parent only mounts this dialog when
  // opening (conditional render), so lazy initializers are enough — and avoid
  // a reset effect that would re-fire on every parent re-render (the props
  // currentProjectIds / roleByProjectId are freshly allocated each render).
  const [orgRoleDraft, setOrgRoleDraft] = useState(orgRole);
  const [projectMembershipDraft, setProjectMembershipDraft] = useState<Set<string>>(
    () => new Set(currentProjectIds),
  );
  const [projectRoleDraft, setProjectRoleDraft] = useState<Record<string, 'admin' | 'member'>>(
    () => {
      const initial: Record<string, 'admin' | 'member'> = {};
      for (const [projectId, role] of Object.entries(roleByProjectId)) {
        initial[projectId] = role === 'admin' ? 'admin' : 'member';
      }
      return initial;
    },
  );
  const [saving, setSaving] = useState(false);

  const updateOrgRoleMutation = api.member.updateRole.useMutation();
  const bulkAddMutation = api.projectMember.bulkAdd.useMutation();
  const removeProjectMemberMutation = api.projectMember.remove.useMutation();
  const updateProjectRoleMutation = api.projectMember.updateRole.useMutation();

  const isOwner = orgRole === 'owner';

  const { addedProjectIds, removedProjectIds } = useMemo(() => {
    const added: string[] = [];
    const removed: string[] = [];
    for (const id of projectMembershipDraft) {
      if (!currentProjectIds.has(id)) added.push(id);
    }
    for (const id of currentProjectIds) {
      if (!projectMembershipDraft.has(id)) removed.push(id);
    }
    return { addedProjectIds: added, removedProjectIds: removed };
  }, [projectMembershipDraft, currentProjectIds]);

  // Existing memberships where the role changed
  const changedRoleProjectIds = useMemo(() => {
    return Object.entries(projectRoleDraft)
      .filter(([projectId, role]) => {
        const isExisting = currentProjectIds.has(projectId);
        const isStillChecked = projectMembershipDraft.has(projectId);
        const originalRole = roleByProjectId[projectId];
        const isOwnerRole = originalRole === 'owner';
        return isExisting && isStillChecked && !isOwnerRole && originalRole !== role;
      })
      .map(([projectId]) => projectId);
  }, [projectRoleDraft, currentProjectIds, projectMembershipDraft, roleByProjectId]);

  const orgRoleChanged = !isOwner && orgRoleDraft !== orgRole;
  const projectsChanged = addedProjectIds.length + removedProjectIds.length > 0;
  const hasChanges = orgRoleChanged || projectsChanged || changedRoleProjectIds.length > 0;

  const toggleProject = (projectId: string) => {
    const willBeAdded = !projectMembershipDraft.has(projectId);
    setProjectMembershipDraft((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
    // When newly adding a project, default role to 'member' if not already set
    if (willBeAdded) {
      setProjectRoleDraft((prev) => ({
        ...prev,
        [projectId]: prev[projectId] ?? 'member',
      }));
    }
  };

  const setProjectRole = (projectId: string, role: 'admin' | 'member') => {
    setProjectRoleDraft((prev) => ({ ...prev, [projectId]: role }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (orgRoleChanged) {
        await updateOrgRoleMutation.mutateAsync({
          organizationId,
          userId,
          role: orgRoleDraft as 'admin' | 'member',
        });
      }

      for (const projectId of addedProjectIds) {
        await bulkAddMutation.mutateAsync({
          projectId,
          members: [{ userId, role: projectRoleDraft[projectId] ?? 'member' }],
        });
      }

      for (const projectId of removedProjectIds) {
        const memberId = memberIdByProjectId[projectId];
        if (!memberId) continue;
        await removeProjectMemberMutation.mutateAsync({
          projectId,
          memberId,
        });
      }

      for (const projectId of changedRoleProjectIds) {
        const memberId = memberIdByProjectId[projectId];
        const role = projectRoleDraft[projectId];
        if (!memberId || !role) continue;
        await updateProjectRoleMutation.mutateAsync({
          projectId,
          memberId,
          role,
        });
      }

      void utils.member.list.invalidate();
      void utils.projectMember.list.invalidate();
      void utils.projectMember.listProjectMemberships.invalidate();

      showSnackbar(`Updated ${userName}`, 'success');
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save changes';
      showSnackbar(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.primary.main,
            }}
          >
            <PencilSimple size={20} weight="bold" />
          </Box>
          <DialogTitle sx={{ p: 0, fontSize: '1rem', fontWeight: 600 }}>
            Edit {userName}
          </DialogTitle>
        </Box>

        <DialogContent sx={{ p: 0, mt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  mb: 0.75,
                }}
              >
                Organization role
              </Typography>
              {isOwner ? (
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>
                  Owner role can&apos;t be changed here.
                </Typography>
              ) : (
                <FormControl fullWidth size="small">
                  <Select
                    value={orgRoleDraft}
                    onChange={(e) => setOrgRoleDraft(e.target.value)}
                    disabled={saving}
                    sx={{ '& .MuiSelect-select': { py: 1, fontSize: '0.8125rem' } }}
                  >
                    {ORG_ROLE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8125rem' }}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  mb: 0.75,
                }}
              >
                Project memberships
              </Typography>
              {isOwner ? (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
                  Owners are automatically members of all projects.
                </Typography>
              ) : orgProjects.length === 0 ? (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
                  No projects in this organization yet.
                </Typography>
              ) : (
                (() => {
                  // Projects where this user is an owner can't be managed here — filter them out.
                  const editableProjects = orgProjects.filter(
                    (p) => roleByProjectId[p.id] !== 'owner',
                  );
                  const ownerProjectCount = orgProjects.length - editableProjects.length;

                  return (
                    <>
                      {editableProjects.length > 0 && (
                        <Box
                          sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            maxHeight: 320,
                            overflowY: 'auto',
                          }}
                        >
                          {editableProjects.map((p, idx) => {
                            const checked = projectMembershipDraft.has(p.id);
                            const currentRole = projectRoleDraft[p.id] ?? 'member';

                            return (
                              <Box
                                key={p.id}
                                onClick={() => !saving && toggleProject(p.id)}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.25,
                                  px: 1.25,
                                  py: 0.875,
                                  borderTop: idx === 0 ? 0 : 1,
                                  borderColor: 'divider',
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  bgcolor: checked
                                    ? alpha(theme.palette.primary.main, 0.04)
                                    : 'transparent',
                                  transition: 'background-color 0.15s',
                                  '&:hover': saving
                                    ? undefined
                                    : {
                                        bgcolor: checked
                                          ? alpha(theme.palette.primary.main, 0.07)
                                          : 'action.hover',
                                      },
                                }}
                              >
                                <ProjectAvatar
                                  imageUrl={p.imageUrl}
                                  icon={p.icon ?? undefined}
                                  colorId={p.color}
                                  size={24}
                                  borderRadius="6px"
                                />
                                <Typography
                                  sx={{
                                    fontSize: '0.8125rem',
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: checked ? 'text.primary' : 'text.secondary',
                                    transition: 'color 0.15s',
                                  }}
                                >
                                  {p.name}
                                </Typography>

                                {checked && (
                                  <Select
                                    value={currentRole}
                                    onChange={(e) => {
                                      setProjectRole(p.id, e.target.value as 'admin' | 'member');
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={saving}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      flexShrink: 0,
                                      fontSize: '0.75rem',
                                      '& .MuiSelect-select': {
                                        py: 0.375,
                                        pl: 1,
                                        pr: '24px !important',
                                        fontSize: '0.75rem',
                                      },
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'divider',
                                      },
                                      '& .MuiSelect-icon': { fontSize: '1rem', right: 4 },
                                    }}
                                  >
                                    {PROJECT_ROLE_OPTIONS.map((opt) => (
                                      <MenuItem
                                        key={opt.value}
                                        value={opt.value}
                                        sx={{ fontSize: '0.8125rem' }}
                                      >
                                        {opt.label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                )}

                                {/* Circle toggle indicator */}
                                <Box
                                  sx={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: checked ? 'primary.main' : 'transparent',
                                    border: checked
                                      ? 'none'
                                      : `1.5px solid ${alpha(theme.palette.text.primary, 0.2)}`,
                                    transition: 'background-color 0.15s, border 0.15s',
                                  }}
                                >
                                  {checked && <Check size={11} weight="bold" color={theme.palette.primary.contrastText} />}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}

                      {ownerProjectCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: editableProjects.length > 0 ? 0.75 : 0 }}>
                          <Info size={11} style={{ opacity: 0.45, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', lineHeight: 1.3 }}>
                            {userName} owns {ownerProjectCount} project{ownerProjectCount === 1 ? '' : 's'} — project owners can only be managed from within each project.
                          </Typography>
                        </Box>
                      )}

                      {editableProjects.length === 0 && ownerProjectCount === 0 && (
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
                          No projects in this organization yet.
                        </Typography>
                      )}
                    </>
                  );
                })()
              )}
            </Box>
          </Box>

          {hasChanges && (
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 1.5 }}>
              {[
                orgRoleChanged && 'Org role will change',
                addedProjectIds.length > 0 &&
                  `${addedProjectIds.length} project${addedProjectIds.length === 1 ? '' : 's'} will be added`,
                removedProjectIds.length > 0 &&
                  `${removedProjectIds.length} project${removedProjectIds.length === 1 ? '' : 's'} will be removed`,
                changedRoleProjectIds.length > 0 &&
                  `${changedRoleProjectIds.length} project role${changedRoleProjectIds.length === 1 ? '' : 's'} will change`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 0, pt: 2.5, gap: 1 }}>
          {onRemove && (
            <Button
              variant="outlined"
              color="error"
              onClick={onRemove}
              disabled={saving}
              startIcon={<Trash size={14} />}
              sx={{ mr: 'auto' }}
            >
              Remove
            </Button>
          )}
          <Button variant="outlined" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            loading={saving}
            disabled={!hasChanges}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
