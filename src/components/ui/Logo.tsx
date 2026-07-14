import React from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';

interface LogoIconProps {
  size?: number;
  sx?: SxProps<Theme>;
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ size = 24, sx }) => {
  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={sx}
    >
      {/* Left column (full height I-beam) */}
      <rect x="3" y="3" width="3" height="18" rx="0.5" fill="currentColor" />

      {/* Top beam connecting columns */}
      <rect x="3" y="3" width="18" height="3" rx="0.5" fill="currentColor" />

      {/* Right column (shorter - under construction) */}
      <rect x="18" y="3" width="3" height="10" rx="0.5" fill="currentColor" />

      {/* Middle ascending bar (progress/tracking element) */}
      <rect x="10" y="9" width="2.5" height="12" rx="0.5" fill="currentColor" />
    </Box>
  );
};

interface LogoProps {
  size?: number;
  sx?: SxProps<Theme>;
  showText?: boolean;
  textVariant?: 'default' | 'large';
}

export const Logo: React.FC<LogoProps> = ({
  size = 24,
  sx,
  showText = true,
  textVariant = 'default'
}) => {
  const fontSize = textVariant === 'large' ? '1.25rem' : '1rem';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
      <LogoIcon size={size} />
      {showText && (
        <Typography sx={{ fontWeight: 600, fontSize }}>
          TEMERITY
        </Typography>
      )}
    </Box>
  );
};
