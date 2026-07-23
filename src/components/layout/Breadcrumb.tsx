'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import ProjectSwitcher from './ProjectSwitcher';
import { projectNavItems } from './navItems';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useProjectSwitcher } from '@/hooks/useProjectSwitcher';

const PROJECT_PAGE_LABELS: Record<string, string> = Object.fromEntries(
  projectNavItems.map((item) => [item.segment, item.label]),
);

const ORG_PAGE_LABELS: Record<string, string> = {
  projects: 'Projects',
};

function getTrailingLabel(segment: string | undefined, isProject: boolean): string | null {
  if (!segment) return isProject ? null : 'Dashboard';
  return (isProject ? PROJECT_PAGE_LABELS[segment] : ORG_PAGE_LABELS[segment]) ?? null;
}

export default function Breadcrumb() {
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const pathname = usePathname();
  const { orgSlug, projectSlug } = params;

  const { activeOrganizationId } = useOrgFromUrl();
  const { effectiveProject } = useProjectSwitcher(activeOrganizationId, orgSlug ?? '');

  // Determine the trailing page segment.
  // - Project routes: segment after [projectSlug]
  // - Org routes: first segment after [orgSlug] (e.g. "projects" for /[orgSlug]/projects)
  const segments = pathname.split('/').filter(Boolean);
  const projectIdx = segments.indexOf('projects');
  const trailingSegment = projectSlug
    ? segments[projectIdx + 2]
    : segments[1]; // segments: [orgSlug, ...rest]
  const trailingLabel = getTrailingLabel(trailingSegment, !!projectSlug);

  // No active project at all — fall back to the simple page label.
  if (!projectSlug && !effectiveProject) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '14.5px',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1,
            letterSpacing: '-0.005em',
            px: 1,
            py: 0.75,
            userSelect: 'none',
          }}
        >
          {trailingLabel ?? 'Dashboard'}
        </Typography>
      </Box>
    );
  }

  // Render: [Projects link] / [Project chip] / [trailing static label?]
  // The "Projects" link is only shown inside an actual project route — on org-root
  // pages the trailing label often already says "Projects" (the portfolio).
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.125, minWidth: 0 }}>
      {projectSlug && (
        // Root "Projects" crumb is hidden on mobile — the project chip + page label
        // are the useful parts, and horizontal space is scarce next to the menu button.
        <Box sx={{ display: { xs: 'none', md: 'contents' } }}>
          <Box
            component={Link}
            href={`/${orgSlug}/projects`}
            sx={{
              fontSize: '14.5px',
              color: 'text.secondary',
              textDecoration: 'none',
              px: 1,
              py: 0.75,
              borderRadius: '6px',
              lineHeight: 1,
              transition: 'background-color 0.15s, color 0.15s',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            Projects
          </Box>
          <Separator />
        </Box>
      )}

      {/* Active project chip — outlined button that opens the project switcher */}
      <ProjectSwitcher />

      {trailingLabel && (
        <>
          <Separator />
          <Typography
            sx={{
              fontSize: '14.5px',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1,
              letterSpacing: '-0.005em',
              px: 1,
              py: 0.75,
              userSelect: 'none',
            }}
          >
            {trailingLabel}
          </Typography>
        </>
      )}
    </Box>
  );
}

function Separator() {
  return (
    <Typography
      component="span"
      aria-hidden="true"
      sx={{
        color: 'text.disabled',
        fontSize: '17px',
        fontWeight: 300,
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      /
    </Typography>
  );
}
