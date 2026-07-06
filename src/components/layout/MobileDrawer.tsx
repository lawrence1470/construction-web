'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, ChevronRight } from 'lucide-react';
import { ChartBar, FolderSimple, FileMagnifyingGlass, GearSix, UsersThree, MapPin, Gauge, SealCheck, X, type Icon } from '@phosphor-icons/react';
import { Drawer, Box, IconButton, Typography } from '@mui/material';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { projectNavItems, orgNavItems, getProjectNavHref, getOrgNavHref, SIDEBAR_SECTIONS, type NavItem } from './navItems';
import OrgSwitcher from './OrgSwitcher';

import { api } from '@/trpc/react';
import { canManageProjects } from '@/lib/permissions';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useProjectSwitcher } from '@/hooks/useProjectSwitcher';
import { authClient, signOut } from '@/lib/auth-client';
import UserAvatar from '@/components/ui/UserAvatar';
import { LogoIcon } from '@/components/ui/Logo';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useLoading } from '@/components/providers/LoadingProvider';
import AccountSettingsModal from './AccountSettingsModal';

const iconMap: Record<string, Icon> = {
  ChartBar,
  FolderSimple,
  FileMagnifyingGlass,
  GearSix,
  UsersThree,
  MapPin,
  Gauge,
  SealCheck,
};

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const mobileProfileMenuItems = [
  { icon: Settings, label: 'Account Settings' },
];

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const { orgSlug, projectSlug } = params;
  const router = useRouter();

  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { showLoading, hideLoading } = useLoading();

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

  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    showLoading('Logging out...');
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            hideLoading();
            setProfileOpen(false);
            router.push('/sign-in');
            router.refresh();
          },
        },
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
      hideLoading();
    }
  };

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 300,
          bgcolor: 'sidebar.background',
          borderRight: '1px solid',
          borderColor: 'sidebar.border',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          height: 48,
          px: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          userSelect: 'none',
        }}
        aria-label="BuildTrack Pro"
      >
        <LogoIcon size={20} />
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          BuildTrack Pro
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="Close menu"
          sx={{
            flexShrink: 0,
            p: '6px',
            borderRadius: '8px',
            color: 'text.secondary',
            bgcolor: 'action.hover',
            transition: 'all 0.15s',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.selected',
            },
          }}
        >
          <X size={15} weight="bold" />
        </IconButton>
      </Box>

      {/* Org Header */}
      <OrgSwitcher />

      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          pt: 2,
          px: 1.5,
          overflow: 'hidden',
        }}
      >
        {/* Grouped Nav Sections */}
        {SIDEBAR_SECTIONS.map((section, sectionIdx) => {
          const items: NavItem[] = [
            ...orgNavItems.filter((i) => i.section === section.id),
            ...visibleProjectNavItems.filter((i) => i.section === section.id),
          ];
          if (items.length === 0) return null;

          return (
            <Box key={section.id} sx={{ mb: sectionIdx < SIDEBAR_SECTIONS.length - 1 ? 2 : 0 }}>
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

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {items.map((item) => {
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
                        gap: 1.25,
                        px: 1.25,
                        py: 0.875,
                        borderRadius: '8px',
                        position: 'relative',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                        bgcolor: isActive ? 'sidebar.activeItemBg' : 'transparent',
                        color: isActive ? 'text.primary' : 'text.secondary',
                        opacity: isDisabled ? 0.35 : 1,
                        cursor: isDisabled ? 'default' : 'pointer',
                        overflow: 'hidden',
                        '&:hover': isDisabled ? {} : {
                          bgcolor: isActive ? 'sidebar.activeItemBg' : 'sidebar.hoverBg',
                          color: 'text.primary',
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

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
                        <NavIcon size={17} weight={isActive ? 'fill' : 'regular'} />
                      </Box>

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

                      {badgeCount !== null && badgeCount > 0 && (
                        <Typography
                          sx={{
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            color: 'text.secondary',
                            lineHeight: 1,
                            flexShrink: 0,
                            minWidth: 16,
                            textAlign: 'right',
                          }}
                        >
                          {badgeCount}
                        </Typography>
                      )}

                      {/* Subtle arrow for active item */}
                      {isActive && (
                        <ChevronRight style={{ width: 13, height: 13, opacity: 0.4, flexShrink: 0 }} />
                      )}
                    </Box>
                  );

                  if (isDisabled) {
                    return <Box key={item.id}>{content}</Box>;
                  }

                  return (
                    <Link
                      key={item.id}
                      href={href}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {content}
                    </Link>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* User Profile */}
      <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
        <DropdownMenuTrigger asChild>
          <Box
            component="button"
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.75,
              py: 1.5,
              width: '100%',
              bgcolor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'text.secondary',
              transition: 'background-color 0.15s ease',
              '&:hover': {
                bgcolor: 'sidebar.hoverBg',
              },
            }}
          >
            {user && <UserAvatar user={user} size={32} borderRadius="8px" />}

            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: '2px' }}>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 550,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  textAlign: 'left',
                }}
              >
                {user?.name ?? 'User'}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  textAlign: 'left',
                }}
              >
                {user?.email ?? ''}
              </Typography>
            </Box>
          </Box>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={8}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          style={{ width: 240, padding: 0, overflow: 'hidden', borderRadius: 12 }}
        >
          {/* Profile Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '14px' }}>
            {user && <UserAvatar user={user} size={36} borderRadius="8px" />}
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {user?.name ?? 'User'}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  mt: '2px',
                }}
              >
                {user?.email ?? ''}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ height: '1px', bgcolor: 'divider' }} />

          {/* Menu Items */}
          <Box sx={{ py: '4px', px: '6px' }}>
            {mobileProfileMenuItems.map((item) => (
              <Box
                key={item.label}
                component="button"
                onClick={() => {
                  setProfileOpen(false);
                  if (item.label === 'Account Settings') {
                    setSettingsOpen(true);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  px: '10px',
                  py: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  bgcolor: 'transparent',
                  color: 'text.primary',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <item.icon style={{ width: 14, height: 14, color: 'inherit' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: 'inherit' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ height: '1px', bgcolor: 'divider' }} />

          {/* Log Out */}
          <Box
            component="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              px: '14px',
              py: '10px',
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              color: 'error.main',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: 'action.hover' },
              '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
            }}
          >
            <LogOut style={{ width: 14, height: 14, color: 'inherit' }} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'inherit' }}>
              Log out
            </Typography>
          </Box>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Drawer>
  );
}
