'use client';

import { Dialog, Box, Typography, Divider, useTheme } from '@mui/material';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { api } from '@/trpc/react';

interface DeleteDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  organizationId: string;
}

export default function DeleteDocumentDialog({
  open,
  onClose,
  documentId,
  documentName,
  organizationId,
}: DeleteDocumentDialogProps) {
  const theme = useTheme();
  const utils = api.useUtils();

  const deleteMutation = api.document.delete.useMutation({
    onSuccess: () => {
      void utils.document.search.invalidate();
      void utils.document.aiSearch.invalidate();
      void utils.document.listByFolder.invalidate();
      void utils.document.countByTask.invalidate();
      onClose();
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ documentId, organizationId });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 420,
          boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Body */}
      <Box sx={{ px: 3, pt: 3, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Icon */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            bgcolor: 'docExplorer.destructiveLight',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 0.5,
          }}
        >
          <Trash2 style={{ width: 18, height: 18, color: theme.palette.docExplorer.destructiveMain }} />
        </Box>

        {/* Title */}
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
          Delete Item?
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontSize: 13,
            color: 'text.secondary',
            lineHeight: 1.6,
            textGrowth: 'fixed-width',
          }}
        >
          This action cannot be undone. This will permanently delete{' '}
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {documentName}
          </Box>{' '}
          and all associated data.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={deleteMutation.isPending}
          sx={{
            height: 32,
            px: 2,
            fontSize: 13,
            fontWeight: 500,
            color: 'text.primary',
            borderColor: 'divider',
            borderRadius: '8px',
            '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleDelete}
          loading={deleteMutation.isPending}
          loadingPosition="start"
          startIcon={<Trash2 style={{ width: 13, height: 13 }} />}
          sx={{
            height: 32,
            px: 2,
            fontSize: 13,
            fontWeight: 500,
            bgcolor: 'docExplorer.destructiveMain',
            borderRadius: '8px',
            '&:hover': { bgcolor: 'docExplorer.destructiveDark' },
            '&:disabled': { bgcolor: 'docExplorer.destructiveMain', opacity: 0.6, color: 'white' },
          }}
        >
          Delete
        </Button>
      </Box>
    </Dialog>
  );
}
