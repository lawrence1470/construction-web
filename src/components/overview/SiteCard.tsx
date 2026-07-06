'use client';

import Link from 'next/link';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { MapPin } from '@phosphor-icons/react';
import { env } from '@/env';
import { api } from '@/trpc/react';
import { getWeatherIcon } from '@/lib/utils/weather';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import { useThemeMode } from '@/components/providers/ThemeRegistry';
import OverviewCard from './OverviewCard';

interface SiteCardProps {
  orgSlug: string;
}

/** Job-site snapshot: non-interactive mini map + current conditions and short forecast. */
export default function SiteCard({ orgSlug }: SiteCardProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { projectId, projectSlug, projectLocation, organizationId } = useProjectContext();

  // Coordinates aren't in ProjectProvider — reuse the cached project list.
  const { data: projects = [] } = api.project.list.useQuery(
    { organizationId },
    { enabled: !!organizationId, retry: false },
  );
  const project = projects.find((p) => p.id === projectId);
  const hasCoords = project?.latitude != null && project?.longitude != null;

  const { data: weather } = api.weather.getByLocation.useQuery(
    { location: projectLocation, organizationId },
    { staleTime: 5 * 60 * 1000, enabled: !!projectLocation && !!organizationId },
  );

  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapStyle =
    mode === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
  const weatherInfo = weather ? getWeatherIcon(weather.icon) : null;
  const forecast = (weather?.forecast ?? []).slice(0, 4);

  return (
    <OverviewCard title="Job site">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
        {/* Mini map */}
        <Box
          sx={{
            position: 'relative',
            height: 130,
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {token && hasCoords && project ? (
            <Map
              mapboxAccessToken={token}
              initialViewState={{
                longitude: project.longitude!,
                latitude: project.latitude!,
                zoom: 13,
              }}
              mapStyle={mapStyle}
              interactive={false}
              style={{ width: '100%', height: '100%' }}
            >
              <Marker longitude={project.longitude!} latitude={project.latitude!} anchor="center">
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '999px',
                    bgcolor: 'warm.main',
                    boxShadow: `0 0 0 4px ${alpha(theme.palette.warm.main, 0.25)}`,
                  }}
                />
              </Marker>
            </Map>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                bgcolor: 'action.hover',
              }}
            >
              <MapPin size={18} color={theme.palette.text.secondary} />
              <Link
                href={`/${orgSlug}/projects/${projectSlug}/settings`}
                style={{ textDecoration: 'none' }}
              >
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: 'primary.main',
                    lineHeight: 1,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  + add an address
                </Typography>
              </Link>
            </Box>
          )}
        </Box>

        {/* Location line */}
        {projectLocation && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <MapPin size={11} weight="bold" style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />
            <Typography
              sx={{
                fontSize: '0.6875rem',
                color: 'text.secondary',
                lineHeight: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projectLocation}
            </Typography>
          </Box>
        )}

        {/* Current conditions + short forecast */}
        {weather && weatherInfo && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <weatherInfo.Icon size={16} weight="bold" style={{ color: theme.palette.warm.main }} />
              <Typography
                sx={{
                  fontSize: '0.9375rem',
                  fontWeight: 590,
                  lineHeight: 1,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {weather.temp}°F
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                  lineHeight: 1,
                  textTransform: 'capitalize',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {weather.description || weatherInfo.label}
              </Typography>
            </Box>

            {forecast.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                {forecast.map((day) => {
                  const info = getWeatherIcon(day.icon);
                  return (
                    <Box
                      key={day.date}
                      sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 0.5,
                        py: 0.875,
                        borderRadius: '8px',
                        bgcolor: 'action.hover',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.5625rem',
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'text.secondary',
                          lineHeight: 1,
                          userSelect: 'none',
                        }}
                      >
                        {day.label}
                      </Typography>
                      <info.Icon size={13} weight="regular" style={{ color: theme.palette.text.secondary }} />
                      <Typography
                        sx={{
                          fontSize: '0.625rem',
                          fontWeight: 500,
                          color: 'text.primary',
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {day.hi}°
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                          /{day.lo}°
                        </Box>
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </OverviewCard>
  );
}
