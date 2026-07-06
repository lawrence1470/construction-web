export type NavSection = 'project-plan' | 'documents' | 'workspace';

export type NavScope = 'org' | 'project';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  segment: string;
  section: NavSection;
  scope?: NavScope;
}

export interface NavSectionDef {
  id: NavSection;
  label: string;
}

export const SIDEBAR_SECTIONS: NavSectionDef[] = [
  { id: 'project-plan', label: 'Project Plan' },
  { id: 'documents', label: 'Documents' },
  { id: 'workspace', label: 'Workspace' },
];

// Organization-level navigation
export const orgNavItems: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: 'MapPin', segment: 'projects', section: 'workspace', scope: 'org' },
];

// Project-level navigation (requires a selected project)
export const projectNavItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'Gauge', segment: 'overview', section: 'project-plan' },
  { id: 'gantt', label: 'Timeline', icon: 'ChartBar', segment: 'gantt', section: 'project-plan' },
  { id: 'files', label: 'Tree', icon: 'FolderSimple', segment: 'files', section: 'project-plan' },
  { id: 'document-explorer', label: 'Document Explorer', icon: 'FileMagnifyingGlass', segment: 'document-explorer', section: 'documents' },
  { id: 'reviews', label: 'Review Queue', icon: 'SealCheck', segment: 'reviews', section: 'documents' },
  { id: 'team', label: 'Team', icon: 'UsersThree', segment: 'team', section: 'workspace' },
  { id: 'project-settings', label: 'Project Settings', icon: 'GearSix', segment: 'settings', section: 'workspace' },
];

// Helper to build org-level URLs
export function getOrgNavHref(segment: string, orgSlug: string): string {
  return segment ? `/${orgSlug}/${segment}` : `/${orgSlug}`;
}

// Helper to build project-level URLs
export function getProjectNavHref(
  segment: string,
  orgSlug: string | undefined,
  projectSlug: string | undefined
): string {
  if (!orgSlug || !projectSlug) {
    return '#'; // Disabled state
  }
  return `/${orgSlug}/projects/${projectSlug}/${segment}`;
}
