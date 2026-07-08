'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Envelope, Lock, Eye, EyeSlash, ArrowRight, User, Key, CaretLeft } from '@phosphor-icons/react';
import { authClient, signUp, signOut } from '@/lib/auth-client';
import { api } from '@/trpc/react';
import { TRPCClientError } from '@trpc/client';
import { LogoIcon } from '@/components/ui/Logo';
import OtpInput from '@/components/ui/OtpInput';
import {
  Box,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material';
import { Button } from '@/components/ui/button';

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      <svg
        style={{ width: '100%', height: '100%', color: 'rgba(255,255,255,0.4)' }}
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.15 + path.id * 0.04}
            initial={{ pathLength: 0.3, opacity: 0.7 }}
            animate={{
              pathLength: 1,
              opacity: [0.4, 0.8, 0.4],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </Box>
  );
}

type Step = 'register' | 'verify-otp';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const emailRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [betaCode, setBetaCode] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const validateCode = api.beta.validateCode.useMutation();

  // When a user lands here via an invite link, prefill+lock the email and skip
  // the beta-code + OTP gates. The admin already vouched for this email, and
  // possessing the invite token proves access to the inbox.
  const inviteQuery = api.invitation.getByToken.useQuery(
    { token: inviteToken ?? '' },
    { enabled: !!inviteToken, retry: false },
  );
  const invite = inviteQuery.data;
  const isInvitedFlow = !!invite;

  useEffect(() => {
    if (invite?.email) {
      setEmail(invite.email);
    }
  }, [invite?.email]);

  const acceptInvitation = api.invitation.accept.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isInvitedFlow) {
        await validateCode.mutateAsync({ code: betaCode });
      }

      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Sign up failed');
        return;
      }

      if (isInvitedFlow && inviteToken) {
        // signUp.email auto-signs the user in (autoSignIn: true). Accept the
        // invite now so memberships are created and emailVerified is flipped
        // before we land on the protected route.
        try {
          const accepted = await acceptInvitation.mutateAsync({ token: inviteToken });
          if (accepted.projectSlug) {
            router.push(`/${accepted.orgSlug}/projects/${accepted.projectSlug}/gantt`);
          } else {
            router.push(`/${accepted.orgSlug}`);
          }
        } catch {
          // Account exists and the user is signed in; let them retry on the
          // invite page where errors (expired, revoked) render with full context.
          router.push(`/invite/${inviteToken}`);
        }
        return;
      }

      setStep('verify-otp');
    } catch (err) {
      if (err instanceof TRPCClientError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
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
        if (inviteToken) {
          router.push(`/invite/${inviteToken}`);
        } else {
          router.push('/onboarding');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    await signOut();
    setEmail('');
    setOtp('');
    setError('');
    setStep('register');
    setTimeout(() => emailRef.current?.focus(), 50);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');

    try {
      await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      });
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
      setError('Failed to resend code');
    }
  };

  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
      }}
    >
      {/* Left panel — brand + animated paths (desktop only) */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          position: 'relative',
          height: '100vh',
          bgcolor: '#2B2D42' /* fixed brand navy — decorative panel, constant across modes */,
          borderRight: 1,
          borderColor: 'divider',
          p: 5,
          overflow: 'hidden',
        }}
      >
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'linear-gradient(to top, rgba(26,28,43,0.6), transparent)',
          }}
        />

        {/* Logo */}
        <Stack
          direction="row"
          alignItems="center"
          gap={1.5}
          sx={{ zIndex: 2 }}
        >
          <Box sx={{ color: 'white' }}>
            <LogoIcon size={28} />
          </Box>
          <Typography
            variant="h6"
            sx={{ color: 'white', fontWeight: 600 }}
          >
            BuildTrack Pro
          </Typography>
        </Stack>

        {/* Testimonial */}
        <Box sx={{ zIndex: 2, mt: 'auto' }}>
          <Typography
            variant="h5"
            sx={{ color: 'white', mb: 1, lineHeight: 1.4 }}
          >
            &ldquo;BuildTrack Pro has transformed how we manage our construction
            projects — saving us weeks of coordination time.&rdquo;
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            ~ Sarah Chen, Project Director
          </Typography>
        </Box>

        {/* Animated paths */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </Box>
      </Box>

      {/* Right panel — form */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '100vh',
          p: { xs: 3, sm: 4 },
        }}
      >
        {/* Subtle radial gradient decoration */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            opacity: 0.6,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 560,
              height: 1280,
              transform: 'translateY(-350px)',
              borderRadius: '50%',
              background: 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(43,45,66,0.06) 0%, rgba(140,140,140,0.02) 50%, rgba(43,45,66,0.01) 80%)',
            }}
          />
        </Box>

        {/* Back to home */}
        <Button
          component={Link}
          href="/"
          variant="text"
          startIcon={<CaretLeft size={16} />}
          sx={{
            position: 'absolute',
            top: 28,
            left: 20,
            color: 'text.secondary',
            zIndex: 1,
            textTransform: 'none',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Home
        </Button>

        {/* Form content */}
        <Box sx={{ mx: 'auto', width: '100%', maxWidth: 400, zIndex: 1 }}>
          {/* Mobile logo */}
          <Stack
            direction="row"
            alignItems="center"
            gap={1.5}
            sx={{ display: { xs: 'flex', lg: 'none' }, mb: 3 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warm.main',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'warm.contrastText',
              }}
            >
              <LogoIcon size={24} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              BuildTrack Pro
            </Typography>
          </Stack>

          {/* Heading */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, letterSpacing: '0.02em', mb: 0.5 }}
            >
              {step === 'register' ? 'Create your account' : 'Verify your email'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {step === 'register'
                ? isInvitedFlow && invite
                  ? `Join ${invite.organization.name} on BuildTrack Pro`
                  : 'Get started with BuildTrack Pro'
                : `We sent a 6-digit code to ${email}`}
            </Typography>
          </Box>

          {step === 'register' ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: '8px' }}>
                    {error}
                  </Alert>
                )}

                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
                    Full name
                  </Typography>
                  <TextField
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    fullWidth
                    required
                    inputProps={{ 'aria-label': 'Full name' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <User size={18} weight="regular" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
                    Email address
                  </Typography>
                  <TextField
                    id="email"
                    type="email"
                    inputRef={emailRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    fullWidth
                    required
                    inputProps={{
                      'aria-label': 'Email address',
                      readOnly: isInvitedFlow,
                    }}
                    helperText={
                      isInvitedFlow
                        ? 'Locked to the email this invitation was sent to.'
                        : undefined
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Envelope size={18} weight="regular" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
                    Password
                  </Typography>
                  <TextField
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    fullWidth
                    required
                    inputProps={{ minLength: 8, 'aria-label': 'Password' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock size={18} weight="regular" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {!isInvitedFlow && (
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
                      Beta access code
                    </Typography>
                    <TextField
                      id="betaCode"
                      type="text"
                      value={betaCode}
                      onChange={(e) => setBetaCode(e.target.value)}
                      placeholder="Enter your beta code"
                      fullWidth
                      required
                      inputProps={{ 'aria-label': 'Beta access code' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Key size={18} weight="regular" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  variant="contained"
                  size="large"
                  fullWidth
                  endIcon={<ArrowRight size={18} />}
                  sx={(theme) => ({
                    bgcolor: theme.palette.mode === 'light' ? theme.palette.warm.dark : theme.palette.warm.main,
                    color: theme.palette.warm.contrastText,
                    height: 48,
                    fontSize: '0.95rem',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'light' ? '#92400e' : theme.palette.warm.dark,
                    },
                  })}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerifyOtp}>
              <Stack spacing={2.5}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: '8px' }}>
                    {error}
                  </Alert>
                )}

                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.75 }}>
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
                  fullWidth
                  endIcon={<ArrowRight size={18} />}
                  sx={(theme) => ({
                    bgcolor: theme.palette.mode === 'light' ? theme.palette.warm.dark : theme.palette.warm.main,
                    color: theme.palette.warm.contrastText,
                    height: 48,
                    fontSize: '0.95rem',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'light' ? '#92400e' : theme.palette.warm.dark,
                    },
                  })}
                >
                  {loading ? 'Verifying...' : 'Verify email'}
                </Button>

                <Stack spacing={0.5} alignItems="center">
                  <Button
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    variant="text"
                    size="small"
                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't get the code? Resend"}
                  </Button>
                  <Button
                    onClick={handleChangeEmail}
                    variant="text"
                    size="small"
                    sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.8125rem' }}
                  >
                    Wrong email? Go back
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}

          {/* Footer links */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Typography
                component={Link}
                href="/sign-in"
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontWeight: 500,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign in
              </Typography>
            </Typography>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 3, textAlign: 'center', lineHeight: 1.5 }}
          >
            By creating an account, you agree to our{' '}
            <Typography
              component="a"
              href="#"
              variant="caption"
              sx={{
                color: 'text.secondary',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                '&:hover': { color: 'text.primary' },
              }}
            >
              Terms of Service
            </Typography>{' '}
            and{' '}
            <Typography
              component="a"
              href="#"
              variant="caption"
              sx={{
                color: 'text.secondary',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                '&:hover': { color: 'text.primary' },
              }}
            >
              Privacy Policy
            </Typography>
            .
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
