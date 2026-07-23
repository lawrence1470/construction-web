'use client';

import { Box, Typography } from '@mui/material';
import { MapPin } from '@phosphor-icons/react';

interface OverviewHeroProps {
  name: string;
  location: string;
}

/** Compact project title row — name + location, no banner chrome. */
export default function OverviewHero({ name, location }: OverviewHeroProps) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="h3"
        sx={{
          color: 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </Typography>
      {location && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, minWidth: 0 }}>
          <MapPin size={12} weight="bold" style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {location}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
