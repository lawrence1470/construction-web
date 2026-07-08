'use client';

import { Box, Typography, useTheme } from '@mui/material';
import { Folder } from 'lucide-react';
import { getCategoryLabel } from '@/lib/constants/documentCategories';

interface CategoryBadgeProps {
  folderId: string | null;
  showIcon?: boolean;
}

export default function CategoryBadge({ folderId, showIcon = false }: CategoryBadgeProps) {
  const theme = useTheme();
  const label = getCategoryLabel(folderId);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {showIcon && (
        <Folder size={11} style={{ color: theme.palette.primary.main }} />
      )}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '999px',
          bgcolor: 'action.selected',
          px: 1,
          py: '2px',
        }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
