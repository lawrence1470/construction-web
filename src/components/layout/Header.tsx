'use client';

import { useState } from 'react';
import { Bell, UserPlus, List as ListIcon } from '@phosphor-icons/react';
import { Box, Typography, IconButton, Divider } from '@mui/material';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigationLoading } from '@/hooks/useNavigationLoading';
import { useProjectSwitcher } from '@/hooks/useProjectSwitcher';
import Breadcrumb from './Breadcrumb';
import IdentityMenu from './IdentityMenu';
import LocationWeather from './LocationWeather';

interface HeaderProps {
  onMenuOpen?: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  useNavigationLoading();
  const { activeOrganizationId, orgSlug } = useOrgFromUrl();
  const { effectiveProject } = useProjectSwitcher(activeOrganizationId, orgSlug);

  const { unreadCount, notificationsData, markAsRead, markAllAsRead } = useNotifications(
    activeOrganizationId,
    notifMenuOpen,
  );

  return (
    <Box
      component="header"
      sx={{
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: { xs: 2, md: 2.5 },
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Left: mobile menu button + breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
        {onMenuOpen && (
          <IconButton
            onClick={onMenuOpen}
            aria-label="Open menu"
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              p: 0.75,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <ListIcon size={20} weight="bold" />
          </IconButton>
        )}
        <Breadcrumb />
      </Box>

      {/* Right: weather (when applicable) + notifications + identity */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {effectiveProject?.location && activeOrganizationId && (
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <LocationWeather
              location={effectiveProject.location}
              organizationId={activeOrganizationId}
            />
          </Box>
        )}

        {/* Notifications */}
        <DropdownMenu open={notifMenuOpen} onOpenChange={setNotifMenuOpen}>
          <DropdownMenuTrigger asChild>
            <IconButton
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                position: 'relative',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              <Bell size={18} weight="regular" />
              {unreadCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    minWidth: 15,
                    height: 15,
                    px: '3px',
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    borderRadius: '999px',
                    fontSize: '9px',
                    fontWeight: 700,
                    lineHeight: 1,
                    display: 'grid',
                    placeItems: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    border: '1.5px solid',
                    borderColor: 'background.paper',
                    pointerEvents: 'none',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Box>
              )}
            </IconButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80" style={{ maxHeight: 400, overflow: 'auto' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Notifications</Typography>
              {unreadCount > 0 && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => markAllAsRead.mutate({ organizationId: activeOrganizationId })}
                  loading={markAllAsRead.isPending}
                  loadingPosition="start"
                  sx={{ fontSize: 12 }}
                >
                  Mark all read
                </Button>
              )}
            </Box>
            <Divider />
            {notificationsData?.notifications && notificationsData.notifications.length > 0 ? (
              notificationsData.notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markAsRead.mutate({ organizationId: activeOrganizationId, ids: [n.id] });
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', width: '100%', p: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <UserPlus size={16} weight="regular" color="white" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, mb: 0.5 }}>{n.message}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                    {!n.read && (
                      <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%', flexShrink: 0, mt: 0.5 }} />
                    )}
                  </Box>
                </DropdownMenuItem>
              ))
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No notifications</Typography>
              </Box>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Vertical divider between bell and identity */}
        <Box
          sx={{
            width: '1px',
            height: 22,
            bgcolor: 'divider',
            mx: 0.5,
          }}
        />

        {/* Identity menu */}
        <IdentityMenu />
      </Box>
    </Box>
  );
}
