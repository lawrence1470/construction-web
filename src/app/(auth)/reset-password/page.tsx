'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { LogoIcon } from '@/components/ui/Logo';
import {
  Box,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  Paper,
} from '@mui/material';
import { Button } from '@/components/ui/button';

function ResetPasswordForm() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
  }, []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // No token provided
  if (!token) {
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
            maxWidth: 500,
            borderRadius: '12px',
            p: 6,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'action.hover',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <AlertCircle size={32} />
          </Box>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 500, mb: 1.5 }}>
            Invalid Reset Link
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            This password reset link is invalid or has expired. Please request a new one.
          </Typography>
          <Button
            component={Link}
            href="/forgot-password"
            variant="contained"
            fullWidth
            endIcon={<ArrowRight size={20} />}
            sx={{ height: 56, fontSize: '1rem', borderRadius: '8px' }}
          >
            Request new link
          </Button>
        </Paper>
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
                TEMERITY
              </Typography>
            </Stack>

            {success ? (
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
                  Password reset!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your password has been successfully reset. You can now sign in with your new password.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 500, mb: 1.5 }}>
                  Set new password
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your new password must be at least 8 characters long.
                </Typography>
              </>
            )}
          </Box>

          {success ? (
            <Button
              onClick={() => router.push('/sign-in')}
              variant="contained"
              fullWidth
              endIcon={<ArrowRight size={20} />}
              sx={{ height: 56, fontSize: '1rem', borderRadius: '8px' }}
            >
              Continue to sign in
            </Button>
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
                    New password
                  </Typography>
                  <TextField
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    fullWidth
                    required
                    inputProps={{ minLength: 8, 'aria-label': 'New password' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock size={20} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mb: 1 }}
                  >
                    Confirm new password
                  </Typography>
                  <TextField
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    fullWidth
                    required
                    inputProps={{ minLength: 8, 'aria-label': 'Confirm new password' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock size={20} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
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
                  Reset password
                </Button>
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
                Secure Your Account
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Choose a strong password to keep your projects and data safe.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
