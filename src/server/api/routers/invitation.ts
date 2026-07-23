import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure, projectProcedure } from "@/server/api/trpc";
import { canInviteMembers, canAssignRole } from "@/lib/permissions";
import { sendInvitationEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { createInvitationSchema } from "@/lib/validations/invitation";
import { INVITATION_STATUS } from "@/lib/constants/invitation";

export const invitationRouter = createTRPCRouter({
  create: projectProcedure
    .input(createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permission
      if (!canInviteMembers(ctx.projectMember.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to invite members",
        });
      }

      // Enforce role hierarchy
      if (!canAssignRole(ctx.projectMember.role, input.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot assign a role equal to or higher than your own",
        });
      }

      // Check if user is already a project member
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: {
          projectMembers: {
            where: { projectId: input.projectId },
          },
        },
      });

      if (existingUser?.projectMembers.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member of this project",
        });
      }

      // Check for existing pending invitation for this project
      const existingInvitation = await ctx.db.invitation.findFirst({
        where: {
          email: input.email,
          projectId: input.projectId,
          status: INVITATION_STATUS.PENDING,
        },
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An invitation has already been sent to this email",
        });
      }

      // Generate token and expiry
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Create invitation
      const invitation = await ctx.db.invitation.create({
        data: {
          email: input.email,
          role: input.role,
          token,
          expiresAt,
          invitedById: ctx.session.user.id,
          organizationId: ctx.organization.id,
          projectId: input.projectId,
        },
      });

      // Send email
      const emailResult = await sendInvitationEmail(
        input.email,
        ctx.organization.name,
        ctx.session.user.name || "A team member",
        token,
        ctx.project.name,
      );

      if (!emailResult.success) {
        // Roll back the invitation record since the email couldn't be delivered
        await ctx.db.invitation.delete({ where: { id: invitation.id } });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: emailResult.error ?? "Failed to send invitation email",
        });
      }

      return { invitation };
    }),

  list: projectProcedure.query(async ({ ctx, input }) => {
    const invitations = await ctx.db.invitation.findMany({
      where: {
        projectId: input.projectId,
      },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations;
  }),

  revoke: projectProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      if (!canInviteMembers(ctx.projectMember.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to revoke invitations",
        });
      }

      const invitation = await ctx.db.invitation.update({
        where: {
          id: input.invitationId,
          projectId: input.projectId,
        },
        data: {
          status: INVITATION_STATUS.REVOKED,
        },
      });

      return { invitation };
    }),

  resend: projectProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      if (!canInviteMembers(ctx.projectMember.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to resend invitations",
        });
      }

      // Update expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await ctx.db.invitation.update({
        where: {
          id: input.invitationId,
          projectId: input.projectId,
        },
        data: {
          expiresAt,
          status: INVITATION_STATUS.PENDING,
        },
      });

      // Resend email
      const emailResult = await sendInvitationEmail(
        invitation.email,
        ctx.organization.name,
        ctx.session.user.name || "A team member",
        invitation.token,
        ctx.project.name,
      );

      if (!emailResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: emailResult.error ?? "Failed to resend invitation email",
        });
      }

      return { invitation };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          project: {
            select: {
              name: true,
              slug: true,
            },
          },
          invitedBy: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      // Check if already accepted or revoked
      if (invitation.status !== INVITATION_STATUS.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is no longer valid",
        });
      }

      return invitation;
    }),

  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation not found",
        });
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has expired",
        });
      }

      // Check if already accepted or revoked
      if (invitation.status !== INVITATION_STATUS.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation is no longer valid",
        });
      }

      // Check if user email matches invitation email
      if (ctx.session.user.email !== invitation.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invitation was sent to a different email address",
        });
      }

      await ctx.db.$transaction(async (tx) => {
        // Upsert org membership (ensure user has org access)
        await tx.membership.upsert({
          where: {
            userId_organizationId: {
              userId: ctx.session.user.id,
              organizationId: invitation.organizationId,
            },
          },
          create: {
            userId: ctx.session.user.id,
            organizationId: invitation.organizationId,
            role: "member",
          },
          update: {},
        });

        // Create project membership
        if (invitation.projectId) {
          await tx.projectMember.create({
            data: {
              userId: ctx.session.user.id,
              projectId: invitation.projectId,
              role: invitation.role,
            },
          });
        }

        // Update invitation status
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: INVITATION_STATUS.ACCEPTED },
        });

        // Complete onboarding, set active project, and trust the invite as email proof.
        // The admin sent this invitation to `invitation.email` and the session email
        // matches it (checked above), so possessing the token = control of the inbox.
        await tx.user.update({
          where: { id: ctx.session.user.id },
          data: {
            onboardingComplete: true,
            emailVerified: true,
            ...(invitation.projectId ? { activeProjectId: invitation.projectId } : {}),
          },
        });

        // Notify existing project members
        if (invitation.projectId) {
          const existingMembers = await tx.projectMember.findMany({
            where: {
              projectId: invitation.projectId,
              userId: { not: ctx.session.user.id },
            },
            select: { userId: true },
          });

          if (existingMembers.length > 0) {
            const joinerName = ctx.session.user.name ?? ctx.session.user.email;
            await tx.notification.createMany({
              data: existingMembers.map((member) => ({
                type: "MEMBER_JOINED",
                message: `${joinerName} joined the project`,
                link: invitation.project
                  ? `/${invitation.organization.slug}/projects/${invitation.project.slug}/team`
                  : null,
                userId: member.userId,
                organizationId: invitation.organizationId,
                actorId: ctx.session.user.id,
              })),
            });
          }
        }
      });

      return {
        organization: invitation.organization,
        orgSlug: invitation.organization.slug,
        projectSlug: invitation.project?.slug ?? null,
      };
    }),
});
