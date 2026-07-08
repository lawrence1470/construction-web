'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Box, Typography, alpha } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { env } from '@/env';
import { useThemeMode } from '@/components/providers/ThemeRegistry';
import type { ProjectListItem } from './ProjectsListPane';

interface ProjectsMapProps {
  orgSlug: string;
  projects: ReadonlyArray<ProjectListItem>;
  activeProjectId: string | null;
  selectedProjectId: string | null;
  onSelect: (id: string | null) => void;
}

const US_VIEW = { longitude: -96.7, latitude: 38.0, zoom: 3 };

export default function ProjectsMap({
  orgSlug,
  projects,
  activeProjectId,
  selectedProjectId,
  onSelect,
}: ProjectsMapProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const mapRef = useRef<MapRef>(null);
  const fitOnceRef = useRef(false);

  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapStyle =
    mode === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  // Fit bounds / flyTo when projects load (or change). Animated, runs once per data shape.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || projects.length === 0) {
      fitOnceRef.current = false;
      return;
    }
    if (fitOnceRef.current) return;

    if (projects.length === 1) {
      const p = projects[0]!;
      map.flyTo({ center: [p.longitude!, p.latitude!], zoom: 11, duration: 800 });
      fitOnceRef.current = true;
      return;
    }

    const lons = projects.map((p) => p.longitude!);
    const lats = projects.map((p) => p.latitude!);
    const minLng = Math.min(...lons);
    const maxLng = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64, duration: 800, maxZoom: 12 },
    );
    fitOnceRef.current = true;
  }, [projects]);

  // Re-fly when selecting a project
  useEffect(() => {
    if (!selected) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.flyTo({ center: [selected.longitude!, selected.latitude!], zoom: 11, duration: 600 });
  }, [selected]);

  if (!token) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 1,
          color: 'text.secondary',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>
          Map unavailable
        </Typography>
        <Typography sx={{ fontSize: '0.75rem' }}>
          Set <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'action.hover', px: 0.625, py: 0.125, borderRadius: '4px' }}>NEXT_PUBLIC_MAPBOX_TOKEN</Box> to enable the Map view.
        </Typography>
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        initialViewState={US_VIEW}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              px: 2,
              py: 1.25,
              boxShadow: `0 8px 24px ${alpha('#000', 0.12)}`,
              pointerEvents: 'auto',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              No projects with addresses yet — add one to see it here.
            </Typography>
          </Box>
        </Box>
        <NavigationControl position="top-right" showCompass={false} />
      </Map>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      mapStyle={mapStyle}
      initialViewState={US_VIEW}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {projects.map((p) => {
        const statusColor = statusToColor(p.status, theme);
        const isActive = activeProjectId === p.id;
        const isSelected = selectedProjectId === p.id;
        return (
          <Marker
            key={p.id}
            longitude={p.longitude!}
            latitude={p.latitude!}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(p.id);
            }}
          >
            <PinCircle
              statusColor={statusColor}
              isActive={isActive}
              isSelected={isSelected}
            />
          </Marker>
        );
      })}

      {selected && (
        <Popup
          longitude={selected.longitude!}
          latitude={selected.latitude!}
          anchor="bottom"
          offset={18}
          closeOnClick={false}
          onClose={() => onSelect(null)}
          maxWidth="280px"
        >
          <ProjectPopupContent project={selected} orgSlug={orgSlug} />
        </Popup>
      )}
    </Map>
  );
}

// ── Pin ──────────────────────────────────────────────────────────────────────

function PinCircle({
  statusColor,
  isActive,
  isSelected,
}: {
  statusColor: string;
  isActive: boolean;
  isSelected: boolean;
}) {
  return (
    <Box
      sx={{
        width: isSelected ? 18 : 14,
        height: isSelected ? 18 : 14,
        borderRadius: '999px',
        bgcolor: statusColor,
        border: '2px solid #fff',
        boxShadow: isActive
          ? `0 0 0 3px var(--accent-warm), 0 2px 6px ${alpha('#000', 0.3)}`
          : `0 2px 4px ${alpha('#000', 0.25)}`,
        cursor: 'pointer',
        transition: 'width 0.15s, height 0.15s',
      }}
    />
  );
}

// ── Popup ────────────────────────────────────────────────────────────────────

function ProjectPopupContent({
  project,
  orgSlug,
}: {
  project: ProjectListItem;
  orgSlug: string;
}) {
  return (
    <Box sx={{ minWidth: 220, p: 0.5 }}>
      <Typography
        sx={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'text.primary',
          lineHeight: 1.25,
          mb: 0.25,
        }}
      >
        {project.name}
      </Typography>
      {project.location && (
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', lineHeight: 1.3 }}>
          {project.location}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.625, mb: 1 }}>
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
          {project.completedTaskCount}/{project.taskCount} tasks
        </Typography>
        <Box sx={{ width: 1, height: 10, bgcolor: 'divider' }} />
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
          {project.completionPercent}% complete
        </Typography>
      </Box>
      <Box
        component={Link}
        href={`/${orgSlug}/projects/${project.slug}/gantt`}
        sx={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.6875rem',
          fontWeight: 600,
          py: 0.625,
          px: 1,
          borderRadius: '6px',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        Open project
      </Box>
    </Box>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusToColor(status: string, theme: Theme): string {
  switch (status) {
    case 'completed':
      return theme.palette.status.completed;
    case 'in-progress':
    case 'inProgress':
      return theme.palette.status.inProgress;
    case 'on-hold':
      return theme.palette.status.onHold;
    case 'archived':
      return theme.palette.status.archived;
    default:
      return theme.palette.status.active;
  }
}
