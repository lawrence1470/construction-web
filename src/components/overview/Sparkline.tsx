'use client';

import { useId } from 'react';
import { Box } from '@mui/material';

/**
 * Build the SVG polyline path for a sparkline. Exported for unit tests.
 * Values are mapped left→right; y is normalized to the max value with
 * `pad` px of breathing room top and bottom. All-zero input draws a
 * flat baseline.
 */
export function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
  pad = 2,
): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const innerH = height - pad * 2;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * stepX : width / 2;
      const y = pad + innerH * (1 - v / max);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ values, color, width = 120, height = 32 }: SparklineProps) {
  const gradientId = useId();
  const path = buildSparklinePath(values, width, height);
  if (!path) return null;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      sx={{ display: 'block', width: '100%', height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill={`url(#${gradientId})`}
        stroke="none"
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </Box>
  );
}
