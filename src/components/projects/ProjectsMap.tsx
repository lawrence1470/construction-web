'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Box, Tooltip, Typography, alpha } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import { FrameCorners as FrameCornersIcon } from '@phosphor-icons/react';
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
  hoveredProjectId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

const US_VIEW = { longitude: -96.7, latitude: 38.0, zoom: 3 };

export default function ProjectsMap({
  orgSlug,
  projects,
  activeProjectId,
  selectedProjectId,
  hoveredProjectId,
  onSelect,
  onHover,
}: ProjectsMapProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const mapRef = useRef<MapRef>(null);
  const loadedRef = useRef(false);
  const fitKeyRef = useRef<string>('');
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapStyle =
    mode === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const fitKey = useMemo(
    () => projects.map((p) => p.id).sort().join('|'),
    [projects],
  );

  // Frame all pins: flyTo for a single project, fitBounds for many.
  const fitToProjects = useCallback(
    (animate: boolean) => {
      const map = mapRef.current?.getMap();
      if (!map || projects.length === 0) return;

      if (projects.length === 1) {
        const p = projects[0]!;
        map.flyTo({ center: [p.longitude!, p.latitude!], zoom: 11, duration: animate ? 800 : 0 });
        return;
      }

      const lons = projects.map((p) => p.longitude!);
      const lats = projects.map((p) => p.latitude!);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 64, duration: animate ? 800 : 0, maxZoom: 12 },
      );
    },
    [projects],
  );

  // On first load: size the canvas correctly, wire a ResizeObserver so the map
  // never locks to a stale container size, and frame the initial pins.
  const handleLoad = useCallback(() => {
    loadedRef.current = true;
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.resize();

    const container = map.getContainer();
    resizeObsRef.current?.disconnect();
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);
    resizeObsRef.current = ro;

    fitKeyRef.current = fitKey;
    fitToProjects(false);
  }, [fitKey, fitToProjects]);

  useEffect(() => () => resizeObsRef.current?.disconnect(), []);

  // Re-frame whenever the set of pins changes (project added/removed), not on
  // unrelated re-renders (hover, selection). Keyed on the sorted id set.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (fitKey === fitKeyRef.current) return;
    fitKeyRef.current = fitKey;
    fitToProjects(true);
  }, [fitKey, fitToProjects]);

  // Re-fly when a project is selected.
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
        onLoad={(e) => e.target.resize()}
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
      onLoad={handleLoad}
    >
      {/* Themed popup chrome (background, tip, close button) for dark mode */}
      <MapPopupTheme theme={theme} />

      <NavigationControl position="top-right" showCompass={false} />

      {projects.map((p) => {
        const statusColor = statusToColor(p.status, theme);
        const isActive = activeProjectId === p.id;
        const isSelected = selectedProjectId === p.id;
        const isHovered = hoveredProjectId === p.id;
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
              isHovered={isHovered}
              onHoverStart={() => onHover(p.id)}
              onHoverEnd={() => onHover(null)}
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

      {/* Recenter / fit-to-all pins */}
      <Tooltip title="Fit all projects" arrow placement="left">
        <Box
          component="button"
          type="button"
          aria-label="Fit all projects"
          onClick={() => fitToProjects(true)}
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 1,
            width: 32,
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
            bgcolor: 'background.paper',
            color: 'text.primary',
            cursor: 'pointer',
            boxShadow: `0 2px 6px ${alpha('#000', 0.15)}`,
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <FrameCornersIcon size={17} weight="bold" />
        </Box>
      </Tooltip>
    </Map>
  );
}

// ── Pin ──────────────────────────────────────────────────────────────────────

function PinCircle({
  statusColor,
  isActive,
  isSelected,
  isHovered,
  onHoverStart,
  onHoverEnd,
}: {
  statusColor: string;
  isActive: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const enlarged = isSelected || isHovered;
  return (
    <Box
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      sx={{
        width: enlarged ? 18 : 14,
        height: enlarged ? 18 : 14,
        borderRadius: '999px',
        bgcolor: statusColor,
        border: '2px solid #fff',
        boxShadow: isActive
          ? `0 0 0 3px var(--accent-warm), 0 2px 6px ${alpha('#000', 0.3)}`
          : isHovered
            ? `0 0 0 3px ${alpha('#fff', 0.9)}, 0 2px 6px ${alpha('#000', 0.35)}`
            : `0 2px 4px ${alpha('#000', 0.25)}`,
        cursor: 'pointer',
        transition: 'width 0.15s, height 0.15s, box-shadow 0.15s',
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

// ── Popup theming ─────────────────────────────────────────────────────────────

// Mapbox's popup chrome (background, tip, close button) is styled with its own
// global CSS and ignores the app theme — jarring on the dark map style. Override
// those pieces with theme tokens. Scoped globally but only rendered on the map.
function MapPopupTheme({ theme }: { theme: Theme }) {
  const paper = theme.palette.background.paper;
  const text = theme.palette.text.secondary;
  return (
    <Box
      component="style"
      sx={{ display: 'none' }}
      dangerouslySetInnerHTML={{
        __html: `
          .mapboxgl-popup-content {
            background: ${paper};
            color: ${theme.palette.text.primary};
            border: 1px solid ${theme.palette.divider};
            border-radius: 10px;
            box-shadow: 0 8px 24px ${alpha('#000', 0.24)};
            padding: 10px 12px;
          }
          .mapboxgl-popup-anchor-top .mapboxgl-popup-tip { border-bottom-color: ${paper}; }
          .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip { border-top-color: ${paper}; }
          .mapboxgl-popup-anchor-left .mapboxgl-popup-tip { border-right-color: ${paper}; }
          .mapboxgl-popup-anchor-right .mapboxgl-popup-tip { border-left-color: ${paper}; }
          .mapboxgl-popup-close-button { color: ${text}; font-size: 16px; padding: 0 6px; }
          .mapboxgl-popup-close-button:hover { background: transparent; color: ${theme.palette.text.primary}; }
        `,
      }}
    />
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
