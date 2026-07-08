'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GearSix, SignOut } from '@phosphor-icons/react';
import { Box, Typography } from '@mui/material';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient, signOut } from '@/lib/auth-client';
import UserAvatar from '@/components/ui/UserAvatar';
import { useLoading } from '@/components/providers/LoadingProvider';
import AccountSettingsModal from './AccountSettingsModal';

export default function IdentityMenu() {
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    showLoading('Logging out...');
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            hideLoading();
            setOpen(false);
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
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Box
            component="button"
            aria-label="Open account menu"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              pl: 0.5,
              pr: 1.25,
              py: 0.5,
              border: 'none',
              bgcolor: 'transparent',
              color: 'text.primary',
              cursor: 'pointer',
              borderRadius: '9px',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: 'action.hover' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
            }}
          >
            {user && <UserAvatar user={user} size={32} borderRadius="8px" />}
            <Typography
              sx={{
                display: { xs: 'none', md: 'block' },
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'text.primary',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 160,
              }}
            >
              {user?.name ?? 'User'}
            </Typography>
          </Box>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          slotProps={{
            paper: {
              sx: {
                width: 260,
                padding: 0,
                overflow: 'hidden',
                borderRadius: '12px',
                mt: 0.5,
              },
            },
          }}
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
            <Box
              component="button"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
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
              <GearSix size={14} />
              <Typography sx={{ fontSize: '0.8125rem', color: 'inherit' }}>
                Account Settings
              </Typography>
            </Box>
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
            <SignOut size={14} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'inherit' }}>
              Log out
            </Typography>
          </Box>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
