'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { authClient, useSession } from '@/lib/auth-client';
import { LogoIcon } from '@/components/ui/Logo';
import OtpInput from '@/components/ui/OtpInput';
import {
  Box,
  Typography,
  Alert,
  Stack,
  Paper,
} from '@mui/material';
import { Button } from '@/components/ui/button';
import { IBeamLoader } from '@/components/ui/IBeamLoader';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const redirected = useRef(false);

  const email = session?.user?.email ?? '';

  useEffect(() => {
    if (!isPending && session?.user?.emailVerified && !redirected.current) {
      redirected.current = true;
      router.push('/onboarding');
    }
  }, [session, isPending, router]);

  const handleSendOtp = async () => {
    if (!email) return;
    setError('');

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });
      setSent(true);
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError('Failed to send verification code');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (result.error) {
        setError(result.error.message || 'Verification failed');
      } else {
        router.replace('/onboarding');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IBeamLoader size={40} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          width: '100%',
          maxWidth: 1200,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: { xs: 6, lg: 8 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ mb: 6 }}>
            <Stack
              component={Link}
              href="/"
              direction="row"
              alignItems="center"
              gap={1.5}
              sx={{
                mb: 4,
                width: 'fit-content',
                textDecoration: 'none',
                '&:hover': { opacity: 0.8 },
                transition: 'opacity 0.2s',
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'warm.main',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'warm.contrastText',
                }}
              >
                <LogoIcon size={28} />
              </Box>
              <Typography
                variant="h6"
                sx={{ color: 'text.primary', fontWeight: 500 }}
              >
                BuildTrack Pro
              </Typography>
            </Stack>
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 500, mb: 1.5 }}>
              Verify your email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {sent
                ? `We sent a 6-digit code to ${email}`
                : `We need to verify your email address (${email})`}
            </Typography>
          </Box>

          {!sent ? (
            <Stack spacing={3}>
              {error && (
                <Alert severity="error" sx={{ borderRadius: '8px' }}>
                  {error}
                </Alert>
              )}
              <Button
                onClick={handleSendOtp}
                variant="contained"
                size="large"
                endIcon={<ArrowRight />}
                sx={(theme) => ({
                  bgcolor: theme.palette.mode === 'light' ? theme.palette.warm.dark : theme.palette.warm.main,
                  color: theme.palette.warm.contrastText,
                  py: 2,
                  '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#92400e' : theme.palette.warm.dark },
                })}
              >
                Send verification code
              </Button>
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleVerifyOtp}>
              <Stack spacing={3}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: '8px' }}>
                    {error}
                  </Alert>
                )}

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mb: 1 }}
                  >
                    Verification code
                  </Typography>
                  <OtpInput value={otp} onChange={setOtp} autoFocus />
                </Box>

                <Button
                  type="submit"
                  loading={loading}
                  disabled={otp.length !== 6}
                  variant="contained"
                  size="large"
                  endIcon={<ArrowRight />}
                  sx={(theme) => ({
                    bgcolor: theme.palette.mode === 'light' ? theme.palette.warm.dark : theme.palette.warm.main,
                    color: theme.palette.warm.contrastText,
                    py: 2,
                    '&:hover': { bgcolor: theme.palette.mode === 'light' ? '#92400e' : theme.palette.warm.dark },
                    '&.Mui-disabled': { opacity: 0.5 },
                  })}
                >
                  {loading ? 'Verifying...' : 'Verify email'}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    onClick={handleSendOtp}
                    disabled={resendCooldown > 0}
                    variant="text"
                    size="small"
                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't get the code? Resend"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>

        {/* Right side - Image */}
        <Box
          sx={{
            position: 'relative',
            display: { xs: 'none', lg: 'block' },
          }}
        >
          <Image
            src="/images/auth-construction.jpg"
            alt="Construction site"
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
              display: 'flex',
              alignItems: 'flex-end',
              p: 4,
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ color: 'white', fontWeight: 500, mb: 1 }}
              >
                Almost there!
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Verify your email to start managing your construction projects.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
