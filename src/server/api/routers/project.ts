import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { del } from "@vercel/blob";
import { createTRPCRouter, protectedProcedure, projectProcedure } from "@/server/api/trpc";
import { createProjectSchema, updateProjectSchema, deleteProjectSchema } from "@/lib/validations/project";
import { canDeleteProjects, canManageProjects } from "@/lib/permissions";
import { getActiveOrganizationId } from "@/server/api/helpers/getActiveOrganization";
import { getActiveProjectId } from "@/server/api/helpers/getActiveProject";
import { getTemplateData } from "@/server/gantt/templates";
import { generateUniqueProjectSlug } from "@/server/api/helpers/generateProjectSlug";
import { projectImageProxyUrl, withProxyImageUrl } from "@/lib/blobProxy";
import { APPROVABLE_FOLDER_ID_LIST } from "@/lib/folders";
import { computeOverviewStats } from "@/lib/utils/overviewStats";

export const projectRouter = createTRPCRouter({
  overview: projectProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.ganttTask.findMany({
      where: { projectId: ctx.project.id },
      select: { id: true, name: true, percentDone: true, endDate: true },
    });

    return computeOverviewStats(tasks, new Date());
  }),

  list: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let organizationId = input?.organizationId;

      // If no organizationId provided, use active organization
      if (!organizationId) {
        const activeOrgId = await getActiveOrganizationId(
          ctx.db,
          ctx.session.user.id
        );

        if (!activeOrgId) {
          return [];
        }

        organizationId = activeOrgId;
      }

      // Validate user has access to this organization
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a member of this organization",
        });
      }

      // Org owners see all projects; admins and members only see projects they belong to.
      const projectWhere =
        membership.role === "owner"
          ? { organizationId }
          : {
              organizationId,
              members: { some: { userId: ctx.session.user.id } },
            };

      const projects = await ctx.db.project.findMany({
        where: projectWhere,
        orderBy: { createdAt: "asc" },
        include: {
          members: {
            take: 4,
            orderBy: { createdAt: "asc" },
            select: {
              role: true,
              user: { select: { id: true, name: true, image: true } },
            },
          },
          _count: { select: { members: true } },
        },
      });

      // Get task completion stats and pending approval counts per project
      const projectIds = projects.map((p) => p.id);
      const [taskStats, completedStats, pendingApprovalStats] = projectIds.length > 0
        ? await Promise.all([
            ctx.db.ganttTask.groupBy({
              by: ["projectId"],
              where: { projectId: { in: projectIds } },
              _avg: { percentDone: true },
              _count: { id: true },
            }),
            ctx.db.ganttTask.groupBy({
              by: ["projectId"],
              where: { projectId: { in: projectIds }, percentDone: 100 },
              _count: { id: true },
            }),
            ctx.db.document.groupBy({
              by: ["projectId"],
              where: {
                projectId: { in: projectIds },
                folderId: { in: APPROVABLE_FOLDER_ID_LIST },
                approvalStatus: "unapproved",
              },
              _count: { _all: true },
            }),
          ])
        : [[], [], []];

      const completedMap = new Map(
        completedStats.map((s) => [s.projectId, s._count.id])
      );

      const statsMap = new Map(
        taskStats.map((s) => [
          s.projectId,
          {
            taskCount: s._count.id,
            completedTaskCount: completedMap.get(s.projectId) ?? 0,
            completionPercent: Math.round(s._avg.percentDone ?? 0),
          },
        ])
      );

      const pendingApprovalMap = new Map(
        pendingApprovalStats.map((s) => [s.projectId, s._count._all])
      );

      return projects.map((p) => {
        const { members, _count, ...rest } = p;
        return {
          ...withProxyImageUrl(rest),
          taskCount: statsMap.get(p.id)?.taskCount ?? 0,
          completedTaskCount: statsMap.get(p.id)?.completedTaskCount ?? 0,
          completionPercent: statsMap.get(p.id)?.completionPercent ?? 0,
          pendingApprovalsCount: pendingApprovalMap.get(p.id) ?? 0,
          memberCount: _count.members,
          members: members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            image: m.user.image,
            role: m.role,
          })),
        };
      });
    }),

  create: protectedProcedure
    .input(
      createProjectSchema.extend({
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let organizationId = input.organizationId;

      // If no organizationId provided, use active organization
      if (!organizationId) {
        const activeOrgId = await getActiveOrganizationId(
          ctx.db,
          ctx.session.user.id
        );

        if (!activeOrgId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "User is not a member of any organization",
          });
        }

        organizationId = activeOrgId;
      }

      // Validate user has access to this organization
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a member of this organization",
        });
      }

      // Get template data
      const template = input.template ?? "BLANK";
      const templateData = getTemplateData(template);

      // Generate unique slug for this project
      const slug = await generateUniqueProjectSlug(
        input.name,
        organizationId,
        ctx.db
      );

      // Create the project with template config
      const project = await ctx.db.project.create({
        data: {
          name: input.name,
          location: input.location,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          icon: input.icon,
          imageUrl: input.imageUrl ?? null,
          slug,
          status: "active",
          organizationId,
          template,
          calendarId: templateData.project.calendarId,
          hoursPerDay: templateData.project.hoursPerDay,
          daysPerWeek: templateData.project.daysPerWeek,
          daysPerMonth: templateData.project.daysPerMonth,
          calendars: templateData.project.calendars ?? undefined,
        },
      });

      // Seed template tasks and resources
      if (templateData.tasks.length > 0) {
        await ctx.db.ganttTask.createMany({
          data: templateData.tasks.map((task, index) => ({
            projectId: project.id,
            name: task.name,
            duration: task.duration,
            durationUnit: task.durationUnit ?? "day",
            percentDone: task.percentDone ?? 0,
            expanded: task.expanded ?? false,
            orderIndex: task.orderIndex ?? index,
          })),
        });
      }

      if (templateData.resources.length > 0) {
        await ctx.db.ganttResource.createMany({
          data: templateData.resources.map((resource) => ({
            projectId: project.id,
            name: resource.name,
            city: resource.city,
            calendar: resource.calendar,
          })),
        });
      }

      // Add creator as project owner
      await ctx.db.projectMember.create({
        data: {
          userId: ctx.session.user.id,
          projectId: project.id,
          role: "owner",
        },
      });

      // Set as active project for user
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { activeProjectId: project.id },
      });

      return project;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      });

      return project ? withProxyImageUrl(project) : null;
    }),

  getBySlug: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        organizationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let organizationId = input.organizationId;

      // If no organizationId provided, use active organization
      if (!organizationId) {
        const activeOrgId = await getActiveOrganizationId(
          ctx.db,
          ctx.session.user.id
        );

        if (!activeOrgId) {
          return null;
        }

        organizationId = activeOrgId;
      }

      // Validate user has access to this organization
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId,
        },
      });

      if (!membership) {
        return null;
      }

      // Get project by slug
      const project = await ctx.db.project.findUnique({
        where: {
          organizationId_slug: {
            organizationId,
            slug: input.slug,
          },
        },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      });

      return project ? withProxyImageUrl(project) : null;
    }),

  // Earliest scheduled task start for the project — the latest date the project
  // start may be set to (a project can't start after its first task). Drives the
  // `max` on the start-date pickers (Gantt card + Settings) and their tooltips.
  earliestTaskStart: projectProcedure.query(async ({ ctx }) => {
    const earliest = await ctx.db.ganttTask.findFirst({
      where: { projectId: ctx.project.id, startDate: { not: null } },
      orderBy: { startDate: "asc" },
      select: { startDate: true },
    });
    return { date: earliest?.startDate ? earliest.startDate.toISOString() : null };
  }),

  getActive: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let organizationId = input?.organizationId;

      // If no organizationId provided, use active organization
      if (!organizationId) {
        const activeOrgId = await getActiveOrganizationId(
          ctx.db,
          ctx.session.user.id
        );

        if (!activeOrgId) {
          return null;
        }

        organizationId = activeOrgId;
      }

      // Validate user has access to this organization
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId,
        },
      });

      if (!membership) {
        return null;
      }

      // Get active project ID
      const activeProjectId = await getActiveProjectId(
        ctx.db,
        ctx.session.user.id,
        organizationId
      );

      if (!activeProjectId) {
        return null;
      }

      // Return the project
      const project = await ctx.db.project.findUnique({
        where: { id: activeProjectId },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      });

      return project ? withProxyImageUrl(project) : null;
    }),

  setActive: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify project exists and user has org membership
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Validate user has access to this organization
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          organizationId: project.organizationId,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not a member of this organization",
        });
      }

      // Update user's active project
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { activeProjectId: input.projectId },
      });

      return withProxyImageUrl(project);
    }),

  update: projectProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      if (!canManageProjects(ctx.projectMember.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions to edit projects" });
      }

      const data: Record<string, unknown> = {};

      // Handle name change → regenerate slug
      if (input.name !== undefined && input.name !== ctx.project.name) {
        data.name = input.name;
        data.slug = await generateUniqueProjectSlug(input.name, ctx.organization.id, ctx.db);
      }

      if (input.location !== undefined) {
        data.location = input.location;
      }

      if (input.latitude !== undefined) {
        data.latitude = input.latitude;
      }

      if (input.longitude !== undefined) {
        data.longitude = input.longitude;
      }

      if (input.icon !== undefined) {
        data.icon = input.icon;
      }

      // The form round-trips the proxy URL unchanged when the image wasn't
      // touched; treat that as "keep existing" and skip.
      if (
        input.imageUrl !== undefined &&
        input.imageUrl !== projectImageProxyUrl(ctx.project.id)
      ) {
        if (ctx.project.imageUrl && ctx.project.imageUrl !== input.imageUrl) {
          try {
            await del(ctx.project.imageUrl);
          } catch {
            // Silent cleanup failure
          }
        }
        data.imageUrl = input.imageUrl || null;
      }

      // Project start date is the Gantt scheduling floor. Reject a start that
      // sits AFTER the earliest task — otherwise the engine would shove those
      // earlier tasks forward. An empty string / null clears the floor.
      if (input.startDate !== undefined) {
        const parsedStart = input.startDate ? new Date(input.startDate) : null;
        if (parsedStart) {
          const earliest = await ctx.db.ganttTask.findFirst({
            where: { projectId: ctx.project.id, startDate: { not: null } },
            orderBy: { startDate: "asc" },
            select: { startDate: true },
          });
          if (earliest?.startDate && parsedStart > earliest.startDate) {
            const limit = earliest.startDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Project start date must be on or before your earliest task (${limit}).`,
            });
          }
        }
        data.startDate = parsedStart;
      }

      if (Object.keys(data).length === 0) {
        return withProxyImageUrl(ctx.project);
      }

      const updated = await ctx.db.project.update({
        where: { id: ctx.project.id },
        data,
      });

      return withProxyImageUrl(updated);
    }),

  delete: projectProcedure
    .input(deleteProjectSchema)
    .mutation(async ({ ctx, input }) => {
      if (!canDeleteProjects(ctx.projectMember.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions to delete projects" });
      }

      // Verify confirmation name matches
      if (input.confirmName.trim().toLowerCase() !== ctx.project.name.trim().toLowerCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Project name does not match" });
      }

      // Collect blob URLs for cleanup (all files live in the Document store now)
      const documents = await ctx.db.document.findMany({
        where: { projectId: ctx.project.id },
        select: { blobUrl: true },
      });

      const blobUrls = [
        ...documents.map((d) => d.blobUrl),
        ...(ctx.project.imageUrl ? [ctx.project.imageUrl] : []),
      ];

      // Best-effort blob cleanup
      if (blobUrls.length > 0) {
        try {
          await del(blobUrls);
        } catch (e) {
          console.error("Blob cleanup failed for project", ctx.project.id, e);
        }
      }

      // Delete project — cascade handles all child records,
      // onDelete: SetNull handles User.activeProjectId
      await ctx.db.project.delete({ where: { id: ctx.project.id } });

      return { success: true, organizationId: ctx.organization.id };
    }),
});
