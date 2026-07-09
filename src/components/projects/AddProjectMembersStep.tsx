'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowRight,
  MagnifyingGlass,
  Check,
  Info,
  EnvelopeSimple,
  PaperPlaneTilt,
  X,
} from '@phosphor-icons/react';
import { TRPCClientError } from '@trpc/client';
import { Button } from '@/components/ui/button';
import { api } from '@/trpc/react';
import { useSnackbar } from '@/hooks/useSnackbar';
import { createInvitationSchema, type AssignableRole } from '@/lib/validations/invitation';

interface AddProjectMembersStepProps {
  projectId: string;
  projectName: string;
  organizationId: string;
  currentUserId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const ROLE_OPTIONS: Array<{ value: AssignableRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const emailSchema = createInvitationSchema.shape.email;
const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  }
  return email?.slice(0, 2).toUpperCase() ?? '?';
}

export default function AddProjectMembersStep({
  projectId,
  projectName,
  organizationId,
  currentUserId,
  onComplete,
  onSkip,
}: AddProjectMembersStepProps) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const utils = api.useUtils();

  const [search, setSearch] = useState('');
  const [selections, setSelections] = useState<Map<string, AssignableRole>>(
    new Map()
  );
  const [pendingInvites, setPendingInvites] = useState<Map<string, AssignableRole>>(
    new Map()
  );
  const [submitting, setSubmitting] = useState(false);

  const { data: members = [], isLoading } = api.member.list.useQuery({
    organizationId,
  });

  const otherMembers = useMemo(
    () => members.filter((m) => m.user.id !== currentUserId),
    [members, currentUserId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return otherMembers;
    return otherMembers.filter((m) => {
      const name = m.user.name?.toLowerCase() ?? '';
      const email = m.user.email?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q);
    });
  }, [otherMembers, search]);

  const normalizedSearch = normalizeEmail(search);

  const memberEmails = useMemo(
    () =>
      new Set(
        members
          .map((m) => m.user.email?.toLowerCase())
          .filter((email): email is string => !!email)
      ),
    [members]
  );

  const currentUserEmail = useMemo(
    () => members.find((m) => m.user.id === currentUserId)?.user.email?.toLowerCase() ?? null,
    [members, currentUserId]
  );
  const isOwnEmail = !!normalizedSearch && normalizedSearch === currentUserEmail;

  // The !isLoading guard prevents offering an invite for an existing member
  // before member.list resolves.
  const isInvitableEmail =
    !isLoading &&
    emailSchema.safeParse(normalizedSearch).success &&
    !memberEmails.has(normalizedSearch) &&
    !pendingInvites.has(normalizedSearch);

  const toggleMember = (userId: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.set(userId, 'member');
      }
      return next;
    });
  };

  const setRole = (userId: string, role: AssignableRole) => {
    setSelections((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Map(prev);
      next.set(userId, role);
      return next;
    });
  };

  const addPendingInvite = () => {
    if (!isInvitableEmail) return;
    setPendingInvites((prev) => {
      const next = new Map(prev);
      next.set(normalizedSearch, 'member');
      return next;
    });
    setSearch('');
  };

  const setInviteRole = (email: string, role: AssignableRole) => {
    setPendingInvites((prev) => {
      if (!prev.has(email)) return prev;
      const next = new Map(prev);
      next.set(email, role);
      return next;
    });
  };

  const removePendingInvite = (email: string) => {
    setPendingInvites((prev) => {
      const next = new Map(prev);
      next.delete(email);
      return next;
    });
  };

  const bulkAdd = api.projectMember.bulkAdd.useMutation();
  const createInvitation = api.invitation.create.useMutation();

  const handleAdd = async () => {
    setSubmitting(true);

    const memberPayload = Array.from(selections.entries()).map(
      ([userId, role]) => ({ userId, role })
    );

    let addedCount = 0;
    let bulkAddError: string | null = null;

    if (memberPayload.length > 0) {
      try {
        const result = await bulkAdd.mutateAsync({ projectId, members: memberPayload });
        addedCount = result.added;
        setSelections(new Map());
        void utils.projectMember.list.invalidate({ projectId });
      } catch (error) {
        bulkAddError =
          error instanceof TRPCClientError ? error.message : 'Failed to add teammates';
      }
    }

    const sentEmails: string[] = [];
    const failedInvites: Array<{ email: string; message: string }> = [];

    for (const [email, role] of pendingInvites.entries()) {
      try {
        await createInvitation.mutateAsync({ organizationId, projectId, email, role });
        sentEmails.push(email);
      } catch (error) {
        failedInvites.push({
          email,
          message: error instanceof TRPCClientError ? error.message : 'Failed to send invite',
        });
      }
    }

    if (sentEmails.length > 0) {
      setPendingInvites((prev) => {
        const next = new Map(prev);
        sentEmails.forEach((email) => next.delete(email));
        return next;
      });
      void utils.invitation.list.invalidate();
      void utils.projectMember.listProjectMemberships.invalidate();
    }

    setSubmitting(false);

    if (!bulkAddError && failedInvites.length === 0) {
      const parts: string[] = [];
      if (addedCount > 0) {
        parts.push(
          addedCount === 1
            ? '1 teammate added to project'
            : `${addedCount} teammates added to project`
        );
      }
      if (sentEmails.length > 0) {
        parts.push(sentEmails.length === 1 ? '1 invite sent' : `${sentEmails.length} invites sent`);
      }
      if (parts.length > 0) {
        showSnackbar(parts.join(' · '), 'success');
      }
      onComplete();
    } else {
      const messages: string[] = [];
      if (bulkAddError) messages.push(bulkAddError);
      failedInvites.forEach(({ email, message }) => {
        messages.push(`Couldn't invite ${email}: ${message}`);
      });
      showSnackbar(messages.join(' · '), 'error');
    }
  };

  const selectedCount = selections.size;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography
          sx={{
            fontSize: '1.0625rem',
            fontWeight: 600,
            letterSpacing: '-0.005em',
            color: 'text.primary',
          }}
        >
          Add your team
        </Typography>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: 'text.secondary',
            mt: 0.5,
            lineHeight: 1.45,
          }}
        >
          Pick people from your organization to add to{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {projectName}
          </Box>
          .
        </Typography>
      </Box>

      <TextField
        placeholder="Search teammates or enter an email to invite"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
        InputProps={{
          startAdornment: (
            <MagnifyingGlass
              size={16}
              style={{ marginRight: 8, opacity: 0.55, flexShrink: 0 }}
            />
          ),
        }}
      />

      <Box
        sx={{
          maxHeight: 280,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          mx: -0.5,
        }}
      >
        {Array.from(pendingInvites.entries()).map(([email, role]) => (
          <Box
            key={email}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.25,
              py: 1,
              borderRadius: '8px',
              bgcolor: alpha(theme.palette.primary.main, 0.06),
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                color: 'primary.main',
              }}
              aria-hidden="true"
            >
              <EnvelopeSimple size={16} />
            </Box>

            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.6875rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {getInitials(null, email)}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {email}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                  lineHeight: 1.3,
                  mt: 0.125,
                }}
              >
                Invite will be sent
              </Typography>
            </Box>

            <Select
              value={role}
              onChange={(e) => setInviteRole(email, e.target.value as AssignableRole)}
              disabled={submitting}
              size="small"
              sx={{
                minWidth: 130,
                fontSize: '0.75rem',
                flexShrink: 0,
                bgcolor: 'background.paper',
                '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' },
              }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8125rem' }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>

            <IconButton
              onClick={() => removePendingInvite(email)}
              aria-label={`Remove invite for ${email}`}
              size="small"
              sx={{ flexShrink: 0 }}
            >
              <X size={14} />
            </IconButton>
          </Box>
        ))}

        {isInvitableEmail && (
          <Box
            onClick={addPendingInvite}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                addPendingInvite();
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.25,
              py: 1,
              borderRadius: '8px',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.12s ease',
            }}
          >
            <Box sx={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />

            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <PaperPlaneTilt size={14} />
            </Box>

            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'primary.main',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Invite {normalizedSearch} by email
            </Typography>
          </Box>
        )}

        {isLoading ? (
          <Typography
            sx={{
              fontSize: '0.8125rem',
              color: 'text.secondary',
              textAlign: 'center',
              py: 3,
            }}
          >
            Loading teammates…
          </Typography>
        ) : filtered.length === 0 && !isInvitableEmail ? (
          <Typography
            sx={{
              fontSize: '0.8125rem',
              color: 'text.secondary',
              textAlign: 'center',
              py: 3,
            }}
          >
            {isOwnEmail
              ? "That's you — you're already on this project"
              : search
                ? 'No teammates match your search'
                : 'No other teammates in your organization yet — type an email above to invite someone'}
          </Typography>
        ) : (
          filtered.map((m) => {
            const isSelected = selections.has(m.user.id);
            const role = selections.get(m.user.id) ?? 'member';
            return (
              <Box
                key={m.user.id}
                onClick={() => toggleMember(m.user.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMember(m.user.id);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.25,
                  py: 1,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.06)
                    : 'transparent',
                  '&:hover': {
                    bgcolor: isSelected
                      ? alpha(theme.palette.primary.main, 0.09)
                      : 'action.hover',
                  },
                  transition: 'background-color 0.12s ease',
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '4px',
                    border: `1.5px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                    color: 'primary.contrastText',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    transition: 'all 0.12s ease',
                  }}
                  aria-hidden="true"
                >
                  {isSelected && <Check size={11} weight="bold" />}
                </Box>

                {m.user.image ? (
                  <Box
                    component="img"
                    src={m.user.image}
                    alt=""
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      flexShrink: 0,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(m.user.name, m.user.email)}
                  </Box>
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      lineHeight: 1.2,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.user.name ?? m.user.email}
                  </Typography>
                  {m.user.name && (
                    <Typography
                      sx={{
                        fontSize: '0.6875rem',
                        color: 'text.secondary',
                        lineHeight: 1.3,
                        mt: 0.125,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.user.email}
                    </Typography>
                  )}
                </Box>

                {isSelected && (
                  <Select
                    value={role}
                    onChange={(e) =>
                      setRole(m.user.id, e.target.value as AssignableRole)
                    }
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                    sx={{
                      minWidth: 130,
                      fontSize: '0.75rem',
                      flexShrink: 0,
                      bgcolor: 'background.paper',
                      '& .MuiSelect-select': { py: 0.5, fontSize: '0.75rem' },
                    }}
                  >
                    {ROLE_OPTIONS.map((opt) => (
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
              </Box>
            );
          })
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 1.5,
          mt: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, flexShrink: 1 }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            <Box
              component="span"
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {selectedCount}
            </Box>{' '}
            selected
            {pendingInvites.size > 0 && (
              <>
                {' · '}
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {pendingInvites.size}
                </Box>{' '}
                {pendingInvites.size === 1 ? 'invite' : 'invites'}
              </>
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Info size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
            <Typography
              sx={{
                fontSize: '0.6875rem',
                color: 'text.disabled',
                lineHeight: 1.3,
              }}
            >
              Not in your org yet? Type their full email above to send an invite.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button
            onClick={onSkip}
            variant="text"
            size="small"
            disabled={submitting}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Skip
          </Button>
          <Button
            onClick={() => void handleAdd()}
            variant="contained"
            size="small"
            disabled={selectedCount + pendingInvites.size === 0}
            loading={submitting}
            endIcon={<ArrowRight size={14} weight="bold" />}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add to project
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
