'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Typography, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Plus as PlusIcon } from '@phosphor-icons/react';
import { api } from '@/trpc/react';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import LoadingSpinner from '@/components/ui/loading-spinner';
import ProjectsListPane from '@/components/projects/ProjectsListPane';
import AddProjectDialog from '@/components/projects/AddProjectDialog';

const ProjectsMap = dynamic(() => import('@/components/projects/ProjectsMap'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.paper',
        borderRadius: '12px',
      }}
    >
      <LoadingSpinner size="md" />
    </Box>
  ),
});

export default function ProjectsView({ orgSlug }: { orgSlug: string }) {
  const theme = useTheme();
  const { activeOrganizationId } = useOrgFromUrl();

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = api.project.list.useQuery(
    { organizationId: activeOrganizationId ?? '' },
    { enabled: !!activeOrganizationId, retry: false },
  );

  const { data: activeProject } = api.project.getActive.useQuery(
    { organizationId: activeOrganizationId ?? '' },
    { enabled: !!activeOrganizationId, retry: false },
  );

  const mapped = useMemo(
    () => projects.filter((p) => p.latitude != null && p.longitude != null),
    [projects],
  );
  const unmapped = useMemo(
    () => projects.filter((p) => p.latitude == null || p.longitude == null),
    [projects],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, p: 3, gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexShrink: 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1.5rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}
          >
            Projects
          </Typography>
          {activeProject && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                mt: 0.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              Currently in{' '}
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                {activeProject.name}
              </Box>
            </Typography>
          )}
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => setAddProjectOpen(true)}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.625,
            py: 0.75,
            px: 1.5,
            border: 0,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '8px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: `0 1px 2px ${alpha(theme.palette.primary.main, 0.25)}`,
            transition: 'background-color 0.15s, box-shadow 0.15s',
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            },
          }}
        >
          <PlusIcon size={13} weight="bold" />
          New project
        </Box>
      </Box>

      {/* Body */}
      {isLoading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LoadingSpinner size="md" />
        </Box>
      ) : projects.length === 0 ? (
        <EmptyState onAddProject={() => setAddProjectOpen(true)} />
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 0, gap: 2 }}>
          <Box sx={{ width: { xs: '100%', md: 320 }, maxHeight: { xs: 240, md: 'none' }, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <ProjectsListPane
              orgSlug={orgSlug}
              mapped={mapped}
              unmapped={unmapped}
              selectedProjectId={selectedProjectId}
              activeProjectId={activeProject?.id ?? null}
              onSelect={setSelectedProjectId}
            />
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'var(--shadow-card)',
              position: 'relative',
            }}
          >
            <ProjectsMap
              orgSlug={orgSlug}
              projects={mapped}
              activeProjectId={activeProject?.id ?? null}
              selectedProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
          </Box>
        </Box>
      )}

      <AddProjectDialog open={addProjectOpen} onOpenChange={setAddProjectOpen} />
    </Box>
  );
}

function EmptyState({ onAddProject }: { onAddProject: () => void }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        color: 'text.secondary',
      }}
    >
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
        No projects yet
      </Typography>
      <Typography sx={{ fontSize: '0.75rem' }}>Create your first project to get started.</Typography>
      <Box
        component="button"
        type="button"
        onClick={onAddProject}
        sx={{
          mt: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.625,
          py: 0.875,
          px: 2,
          border: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.8125rem',
          fontWeight: 600,
          borderRadius: '8px',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: `0 1px 2px ${alpha(theme.palette.primary.main, 0.25)}`,
          '&:hover': { boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` },
        }}
      >
        <PlusIcon size={13} weight="bold" />
        New project
      </Box>
    </Box>
  );
}
