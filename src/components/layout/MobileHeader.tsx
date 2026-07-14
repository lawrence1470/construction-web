'use client';

import { Plus, Menu } from 'lucide-react';
import { Box, IconButton, Typography } from '@mui/material';
import { LogoIcon } from '@/components/ui/Logo';

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        bgcolor: 'background.default',
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        transition: 'colors 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton
          onClick={onMenuOpen}
          aria-label="Open menu"
          sx={{
            p: 0.5,
            '&:hover': {
              opacity: 0.7,
            },
          }}
        >
          <Menu style={{ width: 20, height: 20, color: 'var(--text-secondary)' }} />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LogoIcon size={16} />
          <Typography sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>
            TEMERITY
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          sx={{
            bgcolor: 'warm.main',
            color: 'white',
            p: 1,
            borderRadius: '8px',
            '&:hover': {
              bgcolor: 'warm.hover',
            },
            transition: 'all 0.15s',
          }}
        >
          <Plus style={{ width: 20, height: 20 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
