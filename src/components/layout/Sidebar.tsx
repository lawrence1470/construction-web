'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { ChartBar, FolderSimple, FileMagnifyingGlass, GearSix, UsersThree, SealCheck, MapPin, Gauge, CaretLineLeft, Sun, Moon, type Icon } from '@phosphor-icons/react';
import { Box, Typography, Tooltip } from '@mui/material';
import { projectNavItems, orgNavItems, getProjectNavHref, getOrgNavHref, SIDEBAR_SECTIONS, type NavItem, type NavSectionDef } from './navItems';
import OrgSwitcher from './OrgSwitcher';

import { api } from '@/trpc/react';
import { canManageProjects } from '@/lib/permissions';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useProjectSwitcher } from '@/hooks/useProjectSwitcher';
import { LogoIcon } from '@/components/ui/Logo';
import { useThemeMode } from '@/components/providers/ThemeRegistry';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

const iconMap: Record<string, Icon> = {
  ChartBar,
  FolderSimple,
  FileMagnifyingGlass,
  SealCheck,
  GearSix,
  UsersThree,
  MapPin,
  Gauge,
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const { orgSlug, projectSlug } = params;

  const { mode: themeMode, toggleMode: toggleThemeMode } = useThemeMode();
  const isDark = themeMode === 'dark';

  const { activeOrganizationId } = useOrgFromUrl();
  const { effectiveProject, effectiveProjectSlug } = useProjectSwitcher(
    activeOrganizationId,
    orgSlug ?? '',
  );
  const projectId = effectiveProject?.id ?? '';
  const navProjectSlug = projectSlug ?? effectiveProjectSlug ?? undefined;
  const { data: projectMembers = [] } = api.projectMember.list.useQuery(
    { projectId },
    { enabled: !!projectId, retry: false },
  );
  const memberCount = projectMembers.length;

  // Only owners/admins may see project settings — hide the nav item otherwise.
  const { data: myProjectRole } = api.projectMember.myRole.useQuery(
    { projectId },
    { enabled: !!projectId, retry: false },
  );
  const canManageProject = myProjectRole ? canManageProjects(myProjectRole.role) : false;
  const visibleProjectNavItems = projectNavItems.filter(
    (i) => i.id !== 'project-settings' || canManageProject,
  );

  const [isMac, setIsMac] = useState(false);

  // Pulse badge when memberCount changes (triggers once on initial query load, then on any update)
  const [badgePulseKey, setBadgePulseKey] = useState(0);
  const prevMemberCountRef = useRef(memberCount);
  useEffect(() => {
    if (prevMemberCountRef.current !== memberCount) {
      prevMemberCountRef.current = memberCount;
      setBadgePulseKey((k) => k + 1);
    }
  }, [memberCount]);

  useEffect(() => {
    setIsMac(/Mac/.test(navigator.userAgent));
  }, []);

  const workspaceSection = SIDEBAR_SECTIONS.find((s) => s.id === 'workspace') ?? null;
  const topSections = SIDEBAR_SECTIONS.filter((s) => s.id !== 'workspace');

  const renderSection = (section: NavSectionDef, marginBottom: number) => {
    const sectionItems: NavItem[] = [
      ...orgNavItems.filter((i) => i.section === section.id),
      ...visibleProjectNavItems.filter((i) => i.section === section.id),
    ];
    if (sectionItems.length === 0) return null;

    return (
      <Box key={section.id} sx={{ mb: marginBottom }}>
        {!collapsed && (
          <Typography
            sx={{
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              px: 1,
              pb: 1,
              userSelect: 'none',
            }}
          >
            {section.label}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {sectionItems.map((item) => {
            const NavIcon = iconMap[item.icon] ?? ChartBar;
            const isOrgScope = item.scope === 'org';
            const href = isOrgScope
              ? (orgSlug ? getOrgNavHref(item.segment, orgSlug) : '#')
              : getProjectNavHref(item.segment, orgSlug, navProjectSlug);
            const isActive = isOrgScope
              ? !!(orgSlug && pathname === `/${orgSlug}/${item.segment}`)
              : !!(projectSlug && pathname.includes(`/projects/${projectSlug}/${item.segment}`));
            const isDisabled = isOrgScope ? !orgSlug : !navProjectSlug;
            const badgeCount = item.id === 'team' && !isDisabled ? memberCount : null;

            const content = (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 1.25,
                  px: collapsed ? 0 : 1.25,
                  py: 0.875,
                  borderRadius: '8px',
                  position: 'relative',
                  transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  bgcolor: isActive ? 'sidebar.activeItemBg' : 'transparent',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  opacity: isDisabled ? 0.35 : 1,
                  cursor: isDisabled ? 'default' : 'pointer',
                  overflow: 'hidden',
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                  },
                  '&:hover': isDisabled ? {} : {
                    bgcolor: isActive ? 'sidebar.activeItemBg' : 'sidebar.hoverBg',
                    color: 'text.primary',
                    '& .nav-icon': !isActive ? { transform: 'scale(1.08)' } : {},
                  },
                }}
              >
                {/* Active Indicator — thin left accent */}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '2.5px',
                      height: 16,
                      borderRadius: '0 2px 2px 0',
                      bgcolor: 'sidebar.indicator',
                    }}
                    aria-hidden="true"
                  />
                )}

                <Box
                  className="nav-icon"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    transition: 'transform 120ms ease-out',
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                    },
                  }}
                >
                  <NavIcon size={17} weight={isActive ? 'fill' : 'regular'} />
                </Box>

                {!collapsed && (
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 550 : 400,
                      letterSpacing: isActive ? '-0.005em' : '0',
                      lineHeight: 1,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </Typography>
                )}

                {!collapsed && badgeCount !== null && badgeCount > 0 && (
                  <Typography
                    key={badgePulseKey}
                    sx={{
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      lineHeight: 1,
                      flexShrink: 0,
                      minWidth: 16,
                      textAlign: 'right',
                      display: 'inline-block',
                      transformOrigin: 'center',
                      animation: 'badgePulse 300ms ease-out',
                      '@keyframes badgePulse': {
                        '0%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.15)' },
                        '100%': { transform: 'scale(1)' },
                      },
                      '@media (prefers-reduced-motion: reduce)': {
                        animation: 'none',
                      },
                    }}
                  >
                    {badgeCount}
                  </Typography>
                )}

              </Box>
            );

            const disabledHint = isOrgScope
              ? 'Select an organization first'
              : 'Select a project first';

            const wrappedContent = collapsed ? (
              <Tooltip
                title={isDisabled ? `${item.label} — ${disabledHint.toLowerCase()}` : item.label}
                placement="right"
                key={item.id}
              >
                {isDisabled ? (
                  <Box>{content}</Box>
                ) : (
                  <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {content}
                  </Link>
                )}
              </Tooltip>
            ) : isDisabled ? (
              <Tooltip title={disabledHint} placement="right" key={item.id}>
                <Box>{content}</Box>
              </Tooltip>
            ) : (
              <Link
                key={item.id}
                href={href}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {content}
              </Link>
            );

            return wrappedContent;
          })}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      component="aside"
      sx={{
        height: '100vh',
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        bgcolor: 'sidebar.background',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        transition: 'width 0.2s ease, background-color 0.2s ease',
        borderRight: '1px solid',
        borderColor: 'sidebar.border',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 1,
          height: 60,
          px: collapsed ? 0 : 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          userSelect: 'none',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        aria-label="BuildTrack Pro"
      >
        <LogoIcon size={20} />
        {!collapsed && (
          <>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              BuildTrack Pro
            </Typography>
            <Tooltip
              title={`Collapse sidebar (${isMac ? '⌘' : 'Ctrl+'}B)`}
              placement="bottom"
            >
              <Box
                component="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: '6px',
                  border: 'none',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    bgcolor: 'sidebar.hoverBg',
                    color: 'text.primary',
                  },
                }}
              >
                <CaretLineLeft size={14} weight="bold" />
              </Box>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Org Header */}
      <Box sx={{ overflow: 'hidden' }}>
        {collapsed ? (
          <Tooltip title="Expand sidebar" placement="right">
            <Box
              component="button"
              onClick={onToggleCollapse}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                py: 1.5,
                px: 1,
                bgcolor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'sidebar.hoverBg' },
              }}
            >
              <OrgSwitcher collapsed />
            </Box>
          </Tooltip>
        ) : (
          <OrgSwitcher />
        )}
      </Box>

      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          pt: 2,
          px: collapsed ? 0.75 : 1.5,
          overflow: 'hidden',
          transition: 'padding 0.2s ease',
        }}
      >
        {/* Top nav sections */}
        {topSections.map((section, idx) =>
          renderSection(section, idx < topSections.length - 1 ? 2 : 0),
        )}

        {/* Spacer pushes the Workspace group to the bottom */}
        <Box sx={{ flex: 1 }} />

        {/* Workspace group — pinned to the bottom of the sidebar */}
        {workspaceSection && renderSection(workspaceSection, 2)}

        {/* Theme Switcher */}
        <Box sx={{ pb: 1 }}>
          <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} placement="right">
            <Box
              component="button"
              onClick={toggleThemeMode}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 1.25,
                px: collapsed ? 0 : 1.25,
                py: 0.875,
                width: '100%',
                borderRadius: '8px',
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                color: 'text.secondary',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: 'sidebar.hoverBg',
                  color: 'text.primary',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
                {isDark ? (
                  <Sun size={17} weight="regular" />
                ) : (
                  <Moon size={17} weight="regular" />
                )}
              </Box>
              {!collapsed && (
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 400,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    flex: 1,
                    textAlign: 'left',
                  }}
                >
                  {isDark ? 'Light mode' : 'Dark mode'}
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
