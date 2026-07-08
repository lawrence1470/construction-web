'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Button } from '@/components/ui/button';
import { useSnackbar } from '@/hooks/useSnackbar';

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string } | null;
}

export default function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
}: DeleteProjectDialogProps) {
  const utils = api.useUtils();
  const router = useRouter();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { orgSlug } = useOrgFromUrl();
  const [confirmName, setConfirmName] = useState('');

  const nameMatches =
    !!project && confirmName.trim().toLowerCase() === project.name.trim().toLowerCase();

  const deleteMutation = api.project.delete.useMutation({
    onSuccess: () => {
      showSnackbar('Project deleted', 'success');
      void utils.project.list.invalidate();
      void utils.project.getActive.invalidate();
      handleClose();
      router.push(`/${orgSlug}`);
    },
    onError: (error) => {
      showSnackbar(error.message || 'Failed to delete project', 'error');
    },
  });

  const handleClose = () => {
    setConfirmName('');
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!project || !nameMatches) return;
    deleteMutation.mutate({
      projectId: project.id,
      confirmName,
    });
  };

  if (!project) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 440,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-modal)',
        },
      }}
    >
      {/* Red accent bar */}
      <Box
        sx={{
          height: 3,
          background: `linear-gradient(90deg, ${theme.palette.error.main}, ${alpha(theme.palette.error.main, 0.3)})`,
        }}
      />

      <Box sx={{ p: 3.5, pb: 0 }}>
        {/* Icon + Title block */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              bgcolor: alpha(theme.palette.error.main, 0.08),
              border: `1px solid ${alpha(theme.palette.error.main, 0.12)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Trash2 size={22} style={{ color: theme.palette.error.main }} />
          </Box>
          <Box sx={{ pt: 0.25 }}>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'text.primary',
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
              }}
            >
              Delete Project
            </Typography>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                color: 'text.secondary',
                mt: 0.25,
                lineHeight: 1.4,
              }}
            >
              This action cannot be undone
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ px: 3.5, pt: 2, pb: 1 }}>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: 'text.secondary',
            lineHeight: 1.6,
            mb: 2.5,
          }}
        >
          This will permanently delete{' '}
          <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary', fontSize: 'inherit' }}>
            {project.name}
          </Typography>{' '}
          and all its data including tasks, documents, schedules, and resources.
        </Typography>

        <Typography
          component="label"
          htmlFor="confirm-project-name"
          sx={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mb: 0.75,
          }}
        >
          Type <strong>{project.name}</strong> to confirm
        </Typography>
        <TextField
          id="confirm-project-name"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={project.name}
          fullWidth
          autoFocus
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && nameMatches && !deleteMutation.isPending) {
              handleDelete();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontSize: '0.9375rem',
              bgcolor: alpha(theme.palette.divider, 0.08),
              transition: 'all 0.15s ease',
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: alpha(theme.palette.error.main, 0.3),
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.error.main,
                borderWidth: '1.5px',
              },
              '&.Mui-focused': {
                bgcolor: 'background.paper',
                boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.08)}`,
              },
            },
            '& .MuiOutlinedInput-input': {
              py: 1.5,
              px: 1.75,
              '&::placeholder': {
                color: alpha(theme.palette.text.secondary, 0.5),
                opacity: 1,
              },
            },
          }}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3.5,
          py: 2.5,
          gap: 1,
        }}
      >
        <Button
          variant="text"
          onClick={handleClose}
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.8125rem',
            px: 2,
            borderRadius: '8px',
            '&:hover': {
              bgcolor: alpha(theme.palette.divider, 0.12),
              color: 'text.primary',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          loading={deleteMutation.isPending}
          disabled={!nameMatches}
          onClick={handleDelete}
          sx={{
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.8125rem',
            px: 2.5,
            py: 1,
            textTransform: 'none',
            boxShadow: `0 1px 3px ${alpha(theme.palette.error.main, 0.3)}`,
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.35)}`,
            },
            '&.Mui-disabled': {
              bgcolor: alpha(theme.palette.error.main, 0.12),
              color: alpha(theme.palette.error.main, 0.4),
            },
          }}
        >
          Delete Project
        </Button>
      </DialogActions>
    </Dialog>
  );
}
