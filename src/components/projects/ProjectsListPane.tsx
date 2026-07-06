'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Box, Typography, Tooltip, alpha } from '@mui/material';
import { useTheme, type Theme } from '@mui/material/styles';
import { MapPinSimple as MapPinIcon, MapPinLine as PinLineIcon } from '@phosphor-icons/react';
import ProjectAvatar from '@/components/ui/ProjectAvatar';
import { api } from '@/trpc/react';
import { useSnackbar } from '@/hooks/useSnackbar';
import type { ProjectColor } from '@/lib/constants/projectColors';

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  icon: string;
  color: string | null;
  taskCount: number;
  completedTaskCount: number;
  completionPercent: number;
  memberCount: number;
}

interface ProjectsListPaneProps {
  orgSlug: string;
  mapped: ReadonlyArray<ProjectListItem>;
  unmapped: ReadonlyArray<ProjectListItem>;
  selectedProjectId: string | null;
  activeProjectId: string | null;
  onSelect: (projectId: string | null) => void;
}

export default function ProjectsListPane({
  orgSlug,
  mapped,
  unmapped,
  selectedProjectId,
  activeProjectId,
  onSelect,
}: ProjectsListPaneProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {mapped.length > 0 && (
        <ListSection
          title="Mapped"
          count={mapped.length}
          icon={<MapPinIcon size={11} weight="bold" />}
        >
          {mapped.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              orgSlug={orgSlug}
              isSelected={selectedProjectId === p.id}
              isActive={activeProjectId === p.id}
              onSelect={onSelect}
              theme={theme}
            />
          ))}
        </ListSection>
      )}

      {unmapped.length > 0 && (
        <ListSection
          title="Unmapped"
          count={unmapped.length}
          icon={<PinLineIcon size={11} weight="bold" />}
        >
          {unmapped.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              orgSlug={orgSlug}
              isSelected={selectedProjectId === p.id}
              isActive={activeProjectId === p.id}
              onSelect={onSelect}
              showAddAddress
              theme={theme}
            />
          ))}
        </ListSection>
      )}
    </Box>
  );
}

function ListSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ p: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.625,
          px: 1,
          py: 1,
          color: 'text.secondary',
          userSelect: 'none',
        }}
      >
        {icon}
        <Typography
          sx={{
            fontSize: '0.5625rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: 'text.secondary',
            ml: 0.5,
            lineHeight: 1,
          }}
        >
          {count}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>{children}</Box>
    </Box>
  );
}

function ProjectRow({
  project,
  orgSlug,
  isSelected,
  isActive,
  onSelect,
  showAddAddress,
  theme,
}: {
  project: ProjectListItem;
  orgSlug: string;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string | null) => void;
  showAddAddress?: boolean;
  theme: Theme;
}) {
  const { showSnackbar } = useSnackbar();
  const utils = api.useUtils();
  const setActive = api.project.setActive.useMutation({
    onSuccess: () => {
      void utils.project.list.invalidate();
      void utils.project.getActive.invalidate();
      showSnackbar(`Switched to ${project.name}`, 'success');
    },
    onError: (err) => showSnackbar(err.message || 'Failed to switch project', 'error'),
  });

  const statusColor = useMemo(() => {
    switch (project.status) {
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
  }, [project.status, theme]);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(isSelected ? null : project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(isSelected ? null : project.id);
        }
      }}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.875,
        borderRadius: '8px',
        cursor: 'pointer',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        transition: 'background-color 0.15s',
        outline: 'none',
        '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
        '&:focus-visible': { boxShadow: `0 0 0 2px ${theme.palette.primary.main}` },
      }}
    >
      {isSelected && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '2.5px',
            height: 16,
            borderRadius: '0 2px 2px 0',
            bgcolor: 'primary.main',
          }}
        />
      )}

      <ProjectAvatar
        imageUrl={project.imageUrl}
        icon={project.icon}
        colorId={project.imageUrl ? null : ((project.color ?? 'slate') as ProjectColor)}
        size={28}
        borderRadius="8px"
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontWeight: isActive || isSelected ? 550 : 500,
              color: 'text.primary',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </Typography>
          {isActive && (
            <Tooltip title="Active project" arrow placement="top">
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '999px',
                  bgcolor: 'warm.main',
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.warm.main, 0.2)}`,
                }}
              />
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '999px',
              bgcolor: statusColor,
              flexShrink: 0,
            }}
          />
          {showAddAddress ? (
            <Box
              component="span"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}
            >
              <Link
                href={`/${orgSlug}/projects/${project.slug}/settings`}
                style={{ textDecoration: 'none' }}
              >
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    color: 'primary.main',
                    fontWeight: 500,
                    lineHeight: 1,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  + add address
                </Typography>
              </Link>
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: '0.6875rem',
                color: 'text.secondary',
                fontWeight: 400,
                lineHeight: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.location || '—'}
            </Typography>
          )}
        </Box>
      </Box>

      {!isActive && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Box
            component="button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActive.mutate({ projectId: project.id });
            }}
            disabled={setActive.isPending}
            sx={{
              border: 0,
              bgcolor: 'transparent',
              color: 'primary.main',
              fontFamily: 'inherit',
              fontSize: '0.6875rem',
              fontWeight: 600,
              p: 0,
              cursor: setActive.isPending ? 'default' : 'pointer',
              lineHeight: 1,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Set active
          </Box>
        </Box>
      )}
    </Box>
  );
}
