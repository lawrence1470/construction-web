'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { LogoIcon } from '@/components/ui/Logo';
import {
  Box,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  Stack,
  Paper,
} from '@mui/material';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Left side - Form */}
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

            {submitted ? (
              <>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'action.hover',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <CheckCircle size={32} />
                </Box>
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 500, mb: 1.5 }}>
                  Check your email
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  If an account exists for <Box component="strong" sx={{ color: 'text.primary' }}>{email}</Box>, we&apos;ve sent a password reset link.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 500, mb: 1.5 }}>
                  Forgot password?
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  No worries, we&apos;ll send you reset instructions.
                </Typography>
              </>
            )}
          </Box>

          {submitted ? (
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Didn&apos;t receive the email? Check your spam folder or{' '}
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  sx={{
                    p: 0,
                    minWidth: 0,
                    color: 'text.primary',
                    textTransform: 'none',
                    verticalAlign: 'baseline',
                    '&:hover': {
                      bgcolor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  try another email address
                </Button>
              </Typography>

              <Button
                component={Link}
                href="/sign-in"
                variant="contained"
                fullWidth
                startIcon={<ArrowLeft size={20} />}
                sx={{ height: 56, fontSize: '1rem', borderRadius: '8px' }}
              >
                Back to sign in
              </Button>
            </Stack>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
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
                    Email address
                  </Typography>
                  <TextField
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    fullWidth
                    required
                    inputProps={{ 'aria-label': 'Email address' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Mail size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={loading}
                  endIcon={<ArrowRight size={18} />}
                  sx={{ height: 56, fontSize: '1rem', borderRadius: '8px' }}
                >
                  Send reset link
                </Button>

                <Box
                  component={Link}
                  href="/sign-in"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: 'text.secondary',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    '&:hover': { color: 'text.primary' },
                    transition: 'color 0.2s',
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to sign in
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
                Secure Access
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Your account security is our priority. Reset your password safely and get back to managing your projects.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
