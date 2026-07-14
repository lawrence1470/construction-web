"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import OrgAvatar from "@/components/ui/OrgAvatar";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { useSession, signOut } from "@/lib/auth-client";
import { LogoIcon } from "@/components/ui/Logo";
import { BlueprintBackground } from "@/components/onboarding/BlueprintBackground";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
} from "@mui/material";
import { Button } from '@/components/ui/button';
import { IBeamLoader } from '@/components/ui/IBeamLoader';
import CheckIcon from "@mui/icons-material/Check";

const WRONG_EMAIL_MSG = "This invitation was sent to a different email address";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { data: invitation, isLoading, error } = api.invitation.getByToken.useQuery(
    { token },
    { retry: false }
  );

  const acceptInvitation = api.invitation.accept.useMutation({
    onSuccess: (data) => {
      setShowSuccess(true);
      setTimeout(() => {
        if (data.projectSlug) {
          router.push(`/${data.orgSlug}/projects/${data.projectSlug}/gantt`);
        } else {
          router.push(`/${data.orgSlug}`);
        }
      }, 1500);
    },
    onError: (error) => {
      setAcceptError(error.message || "Failed to accept invitation");
      setAccepting(false);
    },
  });

  const handleAccept = () => {
    setAcceptError(null);
    setAccepting(true);
    acceptInvitation.mutate({ token });
  };

  const pageWrapper = (children: React.ReactNode) => (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        position: "relative",
      }}
    >
      <BlueprintBackground />
      <Box
        component={motion.div}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        sx={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}
      >
        {children}
      </Box>
    </Box>
  );

  if (isLoading || sessionLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <BlueprintBackground />
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <IBeamLoader size={40} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return pageWrapper(
      <Paper elevation={1} sx={{ borderRadius: '16px', p: 4, textAlign: "center" }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: "error.light",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            mx: "auto",
            mb: 2,
          }}
        >
          ⚠️
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
          Invalid Invitation
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {error.message}
        </Typography>
        <Button
          component={Link}
          href="/sign-in"
          variant="contained"
          sx={{ borderRadius: '12px' }}
        >
          Go to Sign In
        </Button>
      </Paper>
    );
  }

  if (!invitation) return null;

  if (showSuccess) {
    return pageWrapper(
      <Paper elevation={1} sx={{ borderRadius: '16px', p: 4, textAlign: "center" }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            bgcolor: "success.main",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <CheckIcon sx={{ color: "white", fontSize: 28 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
          Welcome aboard!
        </Typography>
        <Typography color="text.secondary">
          Redirecting to project...
        </Typography>
      </Paper>
    );
  }

  return pageWrapper(
    <Paper elevation={1} sx={{ borderRadius: '16px', p: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Box
          component={motion.div}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
          sx={{ display: "flex", justifyContent: "center", mb: 2 }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              bgcolor: "text.primary",
              borderRadius: '12px',
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoIcon size={32} />
          </Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.5 }}>
          You&apos;re invited!
        </Typography>
        <Typography color="text.secondary">
          Join your team on TEMERITY
        </Typography>
      </Box>

      {/* Org card */}
      <Box
        component={motion.div}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        sx={{
          bgcolor: "action.hover",
          borderRadius: '12px',
          p: 2.5,
          mb: 3,
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        <OrgAvatar
          name={invitation.organization.name}
          seed={invitation.organization.slug ?? invitation.organization.id}
          logoUrl={invitation.organization.logoUrl}
          size={48}
          borderRadius="12px"
        />
        <Box>
          <Typography sx={{ fontWeight: 500, mb: 0.25 }}>
            {invitation.organization.name}
          </Typography>
          {invitation.project && (
            <Typography variant="body2" color="text.secondary">
              Project: <strong>{invitation.project.name}</strong>
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Invited by {invitation.invitedBy.name ?? "a team member"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Role:{" "}
            <Box component="span" sx={{ fontWeight: 600, textTransform: "capitalize" }}>
              {invitation.role.replace("_", " ")}
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      <Box
        component={motion.div}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.38 }}
      >
        {session?.user ? (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Signed in as <strong>{session.user.email}</strong>
            </Typography>
            {acceptError && (
              <Alert
                severity="error"
                sx={{ borderRadius: '12px', alignItems: "flex-start" }}
                action={
                  acceptError === WRONG_EMAIL_MSG ? (
                    <Button
                      color="error"
                      size="small"
                      onClick={() => signOut({ fetchOptions: { onSuccess: () => router.refresh() } })}
                    >
                      Sign out
                    </Button>
                  ) : undefined
                }
              >
                {acceptError === WRONG_EMAIL_MSG
                  ? `This invitation was sent to a different email. Sign out and sign in with the correct account to accept it.`
                  : acceptError}
              </Alert>
            )}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleAccept}
              loading={accepting}
              endIcon={<ArrowRight size={18} />}
              sx={{ borderRadius: '12px', py: 1.5 }}
            >
              {accepting ? "Accepting..." : "Accept Invitation"}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Button
              component={Link}
              href={`/sign-up?invite=${token}`}
              variant="contained"
              size="large"
              fullWidth
              endIcon={<ArrowRight size={18} />}
              sx={{ borderRadius: '12px', py: 1.5 }}
            >
              Sign up to join
            </Button>
            <Button
              component={Link}
              href={`/sign-in?invite=${token}`}
              variant="outlined"
              size="large"
              fullWidth
              sx={{ borderRadius: '12px', py: 1.5 }}
            >
              Sign in
            </Button>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
