'use client';

import { Box, Typography, useTheme } from '@mui/material';
import { MapPin } from '@phosphor-icons/react';

interface OverviewHeroProps {
  name: string;
  location: string;
  imageUrl: string | null;
}

/**
 * Project identity banner. With a cover image: photo + bottom scrim
 * (intentional literal rgba — always over an image, per design-systems
 * Rule 4). Without: the navy accent gradient with an amber signature edge.
 */
export default function OverviewHero({ name, location, imageUrl }: OverviewHeroProps) {
  const theme = useTheme();
  const hasImage = !!imageUrl;

  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: 120, md: 150 },
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        boxShadow: 'var(--shadow-card)',
        ...(hasImage
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {
              // primary.dark/main stay navy in BOTH modes (accent.dark flips to
              // near-white in dark mode — it would sit under white text here).
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            }),
      }}
    >
      {/* Bottom scrim so the text reads on any photo */}
      {hasImage && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.62) 100%)',
          }}
        />
      )}

      {/* Amber signature edge */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          bgcolor: 'warm.main',
        }}
      />

      <Box sx={{ position: 'relative', p: { xs: 2, md: 2.5 }, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.5625rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1,
            mb: 0.75,
            userSelect: 'none',
            // On photo/navy the text is always light — contrast handled by scrim/gradient
            color: hasImage ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.66)',
          }}
        >
          Project overview
        </Typography>
        <Typography
          variant="h3"
          sx={{
            color: '#FFFFFF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Typography>
        {location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, minWidth: 0 }}>
            <MapPin size={12} weight="bold" style={{ color: 'rgba(255,255,255,0.72)', flexShrink: 0 }} />
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.72)',
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
    </Box>
  );
}
