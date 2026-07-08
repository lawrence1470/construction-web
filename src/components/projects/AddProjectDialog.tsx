'use client';

import { useState, useEffect } from 'react';
import { Dialog, alpha, Box, Typography } from '@mui/material';
import { Check } from '@phosphor-icons/react';
import { useSnackbar } from '@/hooks/useSnackbar';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useSession } from '@/lib/auth-client';
import { api } from '@/trpc/react';
import ProjectFormBody from '@/components/projects/ProjectFormBody';
import AddProjectMembersStep from '@/components/projects/AddProjectMembersStep';
import TemplatePickerStep, {
  type ProjectTemplateOption,
} from '@/components/projects/TemplatePickerStep';

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'template' | 'create' | 'members';

interface CreatedProject {
  id: string;
  slug: string;
  name: string;
}

export default function AddProjectDialog({
  open,
  onOpenChange,
}: AddProjectDialogProps) {
  const { orgSlug, activeOrganizationId } = useOrgFromUrl();
  const { data: session } = useSession();
  const { showSnackbar } = useSnackbar();
  const currentUserId = session?.user?.id;

  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProjectTemplateOption>('BLANK');
  const [createdProject, setCreatedProject] = useState<CreatedProject | null>(
    null
  );

  // Reset step state whenever dialog re-opens
  useEffect(() => {
    if (open) {
      setStep('template');
      setSelectedTemplate('BLANK');
      setCreatedProject(null);
    }
  }, [open]);

  // Pre-fetch org members so we can decide whether to skip step 2
  const { data: orgMembers, isSuccess: orgMembersLoaded } =
    api.member.list.useQuery(
      { organizationId: activeOrganizationId },
      { enabled: open && !!activeOrganizationId }
    );

  // Only treat the org as confirmed-empty after a successful query resolves.
  // While the query is in-flight we err toward showing step 2 (which has its
  // own empty state) so the members step is never silently skipped.
  const confirmedNoOtherMembers =
    orgMembersLoaded &&
    !!currentUserId &&
    orgMembers.filter((m) => m.user.id !== currentUserId).length === 0;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleProjectCreated = (project: CreatedProject) => {
    setCreatedProject(project);
    if (currentUserId && !confirmedNoOtherMembers) {
      setStep('members');
    } else {
      showSnackbar(
        `"${project.name}" created — switch to it in the project dropdown`,
        'success'
      );
      handleClose();
    }
  };

  const handleMembersComplete = () => {
    if (createdProject) {
      showSnackbar(
        `"${createdProject.name}" is ready`,
        'success'
      );
    }
    handleClose();
  };

  const handleMembersSkip = () => {
    if (createdProject) {
      showSnackbar(
        `"${createdProject.name}" created — switch to it in the project dropdown`,
        'success'
      );
    }
    handleClose();
  };

  // Members step only appears when the org has other members. Until the query
  // resolves we assume it might appear (3-dot stepper). After it resolves we
  // can confidently shrink to a 2-dot stepper for solo orgs.
  const willHaveMembersStep = !!currentUserId && !confirmedNoOtherMembers;
  const totalSteps = willHaveMembersStep ? 3 : 2;

  return (
    <Dialog
      open={open}
      onClose={step === 'members' ? undefined : handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 460,
          overflow: 'hidden',
          p: 3,
          boxShadow: 'var(--shadow-modal)',
        },
      }}
    >
      <Stepper currentStep={step} totalSteps={totalSteps} />

      {step === 'template' && (
        <TemplatePickerStep
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          onContinue={() => setStep('create')}
          onCancel={handleClose}
        />
      )}

      {step === 'create' && (
        <ProjectFormBody
          orgSlug={orgSlug}
          organizationId={activeOrganizationId}
          title="New project"
          subtitle="Track schedule, documents and team in one place."
          template={selectedTemplate}
          onCancel={handleClose}
          onBack={() => setStep('template')}
          onSuccess={handleProjectCreated}
        />
      )}

      {step === 'members' && createdProject && currentUserId && (
        <AddProjectMembersStep
          projectId={createdProject.id}
          projectName={createdProject.name}
          organizationId={activeOrganizationId}
          currentUserId={currentUserId}
          onComplete={handleMembersComplete}
          onSkip={handleMembersSkip}
        />
      )}
    </Dialog>
  );
}

function Stepper({
  currentStep,
  totalSteps,
}: {
  currentStep: Step;
  totalSteps: 2 | 3;
}) {
  // template (1) → create (2) → members (3)
  const currentIndex =
    currentStep === 'template' ? 1 : currentStep === 'create' ? 2 : 3;

  const dots: Array<{ index: number; state: 'done' | 'active' | 'pending' }> = [];
  for (let i = 1; i <= totalSteps; i++) {
    dots.push({
      index: i,
      state: i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending',
    });
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        mb: 2,
      }}
      aria-label={`Step ${currentIndex} of ${totalSteps}`}
    >
      {dots.map((dot, idx) => (
        <Box
          key={dot.index}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
        >
          <StepDot state={dot.state}>
            {dot.state === 'done' ? (
              <Check size={11} weight="bold" />
            ) : (
              String(dot.index)
            )}
          </StepDot>
          {idx < dots.length - 1 && (
            <Box
              sx={{
                width: 14,
                height: 2,
                borderRadius: '1px',
                bgcolor: dot.state === 'done' ? 'primary.main' : 'divider',
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

function StepDot({
  state,
  children,
}: {
  state: 'done' | 'active' | 'pending';
  children: React.ReactNode;
}) {
  const isFilled = state === 'done' || state === 'active';
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        bgcolor: isFilled ? 'primary.main' : 'action.disabledBackground',
        color: isFilled ? 'primary.contrastText' : 'text.secondary',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {typeof children === 'string' ? (
        <Typography
          sx={{
            fontSize: '0.625rem',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {children}
        </Typography>
      ) : (
        children
      )}
    </Box>
  );
}
