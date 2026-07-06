import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { canApproveDocuments } from "@/lib/permissions";
import {
  ganttLoadInputSchema,
  ganttSyncInputSchema,
  listSlotsSchema,
  setSlotCountSchema,
  updateSlotSchema,
  saveSlotsSchema,
  type SlotKind,
} from "@/lib/validations/gantt";
import { nextSuggestedSlotName } from "@/lib/constants/slotNameLibrary";
import { APPROVABLE_FOLDER_ID_LIST, slotKindForFolder } from "@/lib/folders";
import { documentProxyUrl, taskCoverProxyUrl } from "@/lib/blobProxy";
import { buildTaskTree, mapDependencyToGantt, mapResourceToGantt, mapAssignmentToGantt, mapTimeRangeToGantt } from "@/server/api/helpers/ganttTree";
import { syncTasks, syncDependencies, syncResources, syncAssignments, syncTimeRanges } from "@/server/api/helpers/ganttSync";

export const ganttRouter = createTRPCRouter({
  /**
   * Lightweight task list for the file tree sidebar
   */
  tasks: orgProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      const project = await ctx.db.project.findFirst({
        where: { id: projectId, organizationId: ctx.organization.id },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      return ctx.db.ganttTask.findMany({
        where: { projectId },
        // `id` is the tie-break: orderIndex collides at 0 for tasks that never
        // got an explicit order (see load), and a bare orderBy on a tied column
        // returns rows in non-deterministic physical order. `id` is the only
        // stable, never-changing column, so it makes the order reproducible.
        orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
        select: {
          id: true,
          parentId: true,
          name: true,
          percentDone: true,
        },
      });
    }),

  /**
   * Get single task details for the detail panel
   */
  taskDetail: orgProcedure
    .input(z.object({ projectId: z.string(), taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { projectId, taskId } = input;

      const project = await ctx.db.project.findFirst({
        where: { id: projectId, organizationId: ctx.organization.id },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      const task = await ctx.db.ganttTask.findFirst({
        where: { id: taskId, projectId },
        select: {
          id: true,
          name: true,
          percentDone: true,
          startDate: true,
          endDate: true,
          duration: true,
          durationUnit: true,
          coverImageUrl: true,
          csiCode: true,
          requiredSubmittals: true,
          requiredInspections: true,
          parentId: true,
          parent: {
            select: { name: true },
          },
          assignments: {
            select: {
              resource: {
                select: { id: true, name: true, image: true },
              },
            },
          },
          _count: {
            select: { children: true },
          },
        },
      });

      if (!task) {
        return null;
      }

      return {
        id: task.id,
        name: task.name,
        percentDone: task.percentDone,
        startDate: task.startDate,
        endDate: task.endDate,
        duration: task.duration,
        durationUnit: task.durationUnit,
        coverImageUrl: task.coverImageUrl ? taskCoverProxyUrl(task.id) : null,
        csiCode: task.csiCode,
        requiredSubmittals: task.requiredSubmittals,
        requiredInspections: task.requiredInspections,
        group: task.parent?.name ?? null,
        assignees: task.assignments.map((a) => a.resource),
        hasChildren: task._count.children > 0,
      };
    }),

  /**
   * Load all Gantt data for a project
   */
  load: orgProcedure
    .input(ganttLoadInputSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      // Verify project belongs to organization
      const project = await ctx.db.project.findFirst({
        where: {
          id: projectId,
          organizationId: ctx.organization.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      // Fetch all Gantt data in parallel with optimized queries
      const [
        tasks,
        dependencies,
        resources,
        assignments,
        timeRanges,
        needsReviewRows,
        approvedDocRows,
      ] = await Promise.all([
        ctx.db.ganttTask.findMany({
          where: { projectId },
          // `id` is the deterministic tie-break. Tasks that never received an
          // explicit order share orderIndex 0; ordering by orderIndex alone
          // then leaves Postgres free to return tied rows in physical heap
          // order, which shifts after any UPDATE (MVCC) — that's the "rows
          // reshuffle on refresh" bug. buildTaskTree re-sorts per level with
          // the same tie-break, so the final tree order is reproducible.
          orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
          // Only select fields needed by Bryntum
          select: {
            id: true,
            parentId: true,
            name: true,
            percentDone: true,
            startDate: true,
            endDate: true,
            duration: true,
            durationUnit: true,
            effort: true,
            effortUnit: true,
            expanded: true,
            manuallyScheduled: true,
            constraintType: true,
            constraintDate: true,
            rollup: true,
            cls: true,
            iconCls: true,
            note: true,
            csiCode: true,
            baselines: true,
            orderIndex: true,
            requiredSubmittals: true,
            requiredInspections: true,
          },
        }),
        ctx.db.ganttDependency.findMany({
          where: { projectId },
        }),
        ctx.db.ganttResource.findMany({
          where: { projectId },
        }),
        ctx.db.ganttAssignment.findMany({
          where: { projectId },
        }),
        ctx.db.ganttTimeRange.findMany({
          where: { projectId },
        }),
        ctx.db.document.groupBy({
          by: ["taskId"],
          where: {
            projectId,
            approvalStatus: "unapproved",
            folderId: { in: APPROVABLE_FOLDER_ID_LIST },
          },
          _count: { _all: true },
        }),
        // Count APPROVED documents per task+folder. The task bar's completion
        // ratio must match the popover, which treats "approved" (not merely
        // "uploaded") as the source of truth — so we count approval status here
        // rather than slot-bound documents. Grouping by folder lets us cap each
        // requirement kind separately below.
        ctx.db.document.groupBy({
          by: ["taskId", "folderId"],
          where: {
            projectId,
            taskId: { not: null },
            approvalStatus: "approved",
            folderId: { in: APPROVABLE_FOLDER_ID_LIST },
          },
          _count: { _all: true },
        }),
      ]);

      // Build needsReviewCount map per task (rolled up to parents in buildTaskTree)
      const needsReviewCounts = new Map<string, number>();
      for (const row of needsReviewRows) {
        if (row.taskId) {
          needsReviewCounts.set(row.taskId, row._count._all);
        }
      }

      // Tally approved documents per task, split by requirement kind.
      const approvedByTask = new Map<string, { submittal: number; inspection: number }>();
      for (const row of approvedDocRows) {
        if (!row.taskId) continue;
        const kind = slotKindForFolder(row.folderId);
        if (!kind) continue;
        const bucket = approvedByTask.get(row.taskId) ?? { submittal: 0, inspection: 0 };
        bucket[kind] += row._count._all;
        approvedByTask.set(row.taskId, bucket);
      }

      // Build the per-task "filled" requirement count. Each kind is capped at its
      // required count separately (matching the popover) so an over-fulfilled
      // folder can't mask a short one. requirementsTotal comes from each task's
      // required* columns; bars show a completion ratio when total > 0.
      const filledRequirementCounts = new Map<string, number>();
      for (const task of tasks) {
        const approved = approvedByTask.get(task.id);
        if (!approved) continue;
        const filled =
          Math.min(approved.submittal, task.requiredSubmittals ?? 0) +
          Math.min(approved.inspection, task.requiredInspections ?? 0);
        if (filled > 0) filledRequirementCounts.set(task.id, filled);
      }

      // Path B scheduling relaxation (see ganttConfig.ts — autoSetConstraints is
      // OFF). Two adjustments, re-derived on every load so no DB migration is
      // needed and reverting is code-only:
      //   1. Drop the legacy auto-stamped `startnoearlierthan` walls. These were
      //      pinned to each task's own start date and blocked dragging a bar
      //      earlier. User-set constraints (any other type) are left untouched.
      //   2. Hold independent LEAF tasks at their date by marking them
      //      manuallyScheduled. Without a wall, an auto-scheduled task with no
      //      predecessor reschedules to the project floor on load (the "bars pile
      //      up" problem). Tasks with an incoming dependency are held by their
      //      predecessor, and parents roll up from their children — neither needs
      //      this, so both stay engine-scheduled and dependency auto-push is kept.
      const parentIds = new Set(
        tasks.map((t) => t.parentId).filter((id): id is string => id !== null),
      );
      const tasksWithIncomingDep = new Set(dependencies.map((d) => d.toTaskId));
      for (const task of tasks) {
        if (task.constraintType === "startnoearlierthan") {
          task.constraintType = null;
          task.constraintDate = null;
        }
        const isLeaf = !parentIds.has(task.id);
        if (
          isLeaf &&
          !tasksWithIncomingDep.has(task.id) &&
          !task.constraintType &&
          !task.manuallyScheduled
        ) {
          task.manuallyScheduled = true;
        }
      }

      // Build hierarchical task tree
      const taskTree = buildTaskTree(tasks, needsReviewCounts, filledRequirementCounts);

      // Map other entities to Gantt format
      const ganttDependencies = dependencies.map(mapDependencyToGantt);
      const ganttResources = resources.map(mapResourceToGantt);
      const ganttAssignments = assignments.map(mapAssignmentToGantt);
      const ganttTimeRanges = timeRanges.map(mapTimeRangeToGantt);

      // Build project config — only include startDate when it has a value.
      // Sending undefined/null for startDate or endDate can confuse the
      // scheduling engine and trigger degenerate time-axis recalculations.
      const projectData: Record<string, unknown> = {
        calendar: project.calendarId,
        hoursPerDay: project.hoursPerDay,
        daysPerWeek: project.daysPerWeek,
        daysPerMonth: project.daysPerMonth,
      };
      if (project.startDate) {
        projectData.startDate = project.startDate.toISOString();
      }

      // Provide a default calendar that marks Sat/Sun as non-working so the
      // Gantt `nonWorkingTime` feature shades weekend columns. Projects that
      // have their own calendars override this via the `calendars` JSON column.
      const defaultCalendars = {
        rows: [
          {
            id: project.calendarId,
            name: "General",
            intervals: [
              {
                recurrentStartDate: "on Sat at 0:00",
                recurrentEndDate: "on Mon at 0:00",
                isWorking: false,
              },
            ],
          },
        ],
      };

      return {
        success: true,
        project: projectData,
        calendars: project.calendars ?? defaultCalendars,
        tasks: { rows: taskTree },
        dependencies: { rows: ganttDependencies },
        resources: { rows: ganttResources },
        assignments: { rows: ganttAssignments },
        timeRanges: { rows: ganttTimeRanges },
      };
    }),

  /**
   * Sync changes to Gantt data
   */
  sync: orgProcedure
    .input(ganttSyncInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, tasks, dependencies, resources, assignments, timeRanges } = input;

      // Verify project belongs to organization
      const project = await ctx.db.project.findFirst({
        where: {
          id: projectId,
          organizationId: ctx.organization.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      // Last-write-wins: no version check, no isolation upgrade. Concurrent
      // edits to the same field on the same task by different users will
      // simply have the later one win.
      return ctx.db.$transaction(async (tx) => {
        const phantomIdMap = new Map<string, string>();

        // Process changes in dependency order:
        // 1. Tasks first (dependencies need task IDs)
        // 2. Resources (assignments need resource IDs)
        // 3. Dependencies (need task IDs)
        // 4. Assignments (need task + resource IDs)
        // 5. Time ranges (independent)

        const taskResult = await syncTasks(tx, projectId, tasks, phantomIdMap);
        const resourceResult = await syncResources(tx, projectId, resources, phantomIdMap);
        const dependencyResult = await syncDependencies(tx, projectId, dependencies, phantomIdMap);
        const assignmentResult = await syncAssignments(tx, projectId, assignments, phantomIdMap);
        const timeRangeResult = await syncTimeRanges(tx, projectId, timeRanges, phantomIdMap);

        return {
          success: true,
          tasks: taskResult,
          resources: resourceResult,
          dependencies: dependencyResult,
          assignments: assignmentResult,
          timeRanges: timeRangeResult,
        };
      });
    }),

  /**
   * Project-wide requirement stats for the toolbar progress card.
   * Returns total required and total uploaded across all tasks. Uses the
   * Document.slotId FK to count satisfied slots; uploads that aren't bound
   * to a slot (overflow, or dropped outside a slot button) don't count.
   */
  requirementStats: orgProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      const project = await ctx.db.project.findFirst({
        where: { id: projectId, organizationId: ctx.organization.id },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or access denied" });
      }

      const [latestEndDate, tasksWithReqs, filledSlots] = await Promise.all([
        ctx.db.ganttTask.aggregate({
          where: { projectId, endDate: { not: null } },
          _max: { endDate: true },
        }),
        ctx.db.ganttTask.findMany({
          where: {
            projectId,
            OR: [
              { requiredSubmittals: { not: null } },
              { requiredInspections: { not: null } },
            ],
          },
          select: {
            id: true,
            requiredSubmittals: true,
            requiredInspections: true,
          },
        }),
        ctx.db.taskRequirementSlot.count({
          where: {
            task: { projectId },
            documents: { some: {} },
          },
        }),
      ]);

      let totalRequired = 0;
      for (const t of tasksWithReqs) {
        totalRequired += t.requiredSubmittals ?? 0;
        totalRequired += t.requiredInspections ?? 0;
      }

      return {
        totalRequired,
        totalUploaded: filledSlots,
        latestEndDate: latestEndDate._max.endDate ?? null,
      };
    }),

  // ─── Per-slot tracking (Tier 2/3) ──────────────────────────────────────
  // Slots carry the metadata that the legacy requiredSubmittals/Inspections
  // integers don't: name, due date. They are kept in sync with those count
  // columns by setSlotCount so the popover and existing readers keep working.
  // listSlots auto-backfills from the legacy count on first read.

  listSlots: orgProcedure
    .input(z.object({ projectId: z.string() }).merge(listSlotsSchema))
    .query(async ({ ctx, input }) => {
      const { projectId, taskId, kind } = input;

      const task = await ctx.db.ganttTask.findFirst({
        where: { id: taskId, projectId, project: { organizationId: ctx.organization.id } },
        select: { id: true, requiredSubmittals: true, requiredInspections: true },
      });
      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const slotInclude = {
        documents: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            id: true,
            name: true,
            blobUrl: true,
            mimeType: true,
            size: true,
            folderId: true,
            createdAt: true,
            approvalStatus: true,
            approvedAt: true,
            approvedBy: { select: { id: true, name: true, email: true } },
            uploadedBy: { select: { id: true, name: true, email: true } },
          },
        },
      } as const;

      const existing = await ctx.db.taskRequirementSlot.findMany({
        where: { taskId, kind },
        orderBy: { index: "asc" },
        include: slotInclude,
      });

      const legacyCount = legacyCountForKind(task, kind);

      // Lazy backfill: legacy count > 0 but no slot rows yet → create N anonymous slots.
      const slots =
        existing.length === 0 && legacyCount > 0
          ? await (async () => {
              await ctx.db.taskRequirementSlot.createMany({
                data: Array.from({ length: legacyCount }, (_, i) => ({
                  taskId,
                  kind,
                  index: i,
                })),
                skipDuplicates: true,
              });
              return ctx.db.taskRequirementSlot.findMany({
                where: { taskId, kind },
                orderBy: { index: "asc" },
                include: slotInclude,
              });
            })()
          : existing;

      // Flatten: collapse `documents[0]` into a single `document` field with a
      // proxied blob URL the client can render. The partial unique index on
      // Document.slotId enforces at-most-one bound document per slot, so
      // `take: 1` is precisely the bound document.
      return slots.map(({ documents, ...slot }) => {
        const doc = documents[0] ?? null;
        return {
          ...slot,
          document: doc ? { ...doc, blobUrl: documentProxyUrl(doc.id) } : null,
        };
      });
    }),

  setSlotCount: orgProcedure
    .input(z.object({ projectId: z.string() }).merge(setSlotCountSchema))
    .mutation(async ({ ctx, input }) => {
      if (!canApproveDocuments(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage requirements",
        });
      }

      const { projectId, taskId, kind, count } = input;

      const task = await ctx.db.ganttTask.findFirst({
        where: { id: taskId, projectId, project: { organizationId: ctx.organization.id } },
        select: { id: true },
      });
      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const legacyField = kind === "submittal" ? "requiredSubmittals" : "requiredInspections";

      return ctx.db.$transaction(async (tx) => {
        const current = await tx.taskRequirementSlot.findMany({
          where: { taskId, kind },
          orderBy: { index: "asc" },
          select: { id: true, index: true, name: true },
        });

        if (count > current.length) {
          // Add slots at the end with smart-default names from the library,
          // skipping any names already taken by existing slots.
          const names: (string | null)[] = current.map((s) => s.name);
          const newSlots: Array<{ taskId: string; kind: string; index: number; name: string | null }> = [];
          for (let i = 0; i < count - current.length; i++) {
            const name = nextSuggestedSlotName(kind, names);
            names.push(name);
            newSlots.push({
              taskId,
              kind,
              index: current.length + i,
              name,
            });
          }
          await tx.taskRequirementSlot.createMany({ data: newSlots });
        } else if (count < current.length) {
          // Remove the last (current.length - count) slots
          const toRemove = current.slice(count).map((s) => s.id);
          await tx.taskRequirementSlot.deleteMany({ where: { id: { in: toRemove } } });
        }

        // Keep the legacy count column in sync so existing readers (popover header,
        // requirementStats, TrackableFolderContent) don't need to change.
        await tx.ganttTask.update({
          where: { id: taskId },
          data: { [legacyField]: count === 0 ? null : count },
        });

        return tx.taskRequirementSlot.findMany({
          where: { taskId, kind },
          orderBy: { index: "asc" },
        });
      });
    }),

  updateSlot: orgProcedure
    .input(z.object({ projectId: z.string() }).merge(updateSlotSchema))
    .mutation(async ({ ctx, input }) => {
      if (!canApproveDocuments(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage requirements",
        });
      }

      const { projectId, slotId, ...patch } = input;

      const slot = await ctx.db.taskRequirementSlot.findUnique({
        where: { id: slotId },
        select: { id: true, task: { select: { projectId: true, project: { select: { organizationId: true } } } } },
      });
      if (
        !slot ||
        slot.task.projectId !== projectId ||
        slot.task.project.organizationId !== ctx.organization.id
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
      }

      const data: Record<string, unknown> = {};
      if (patch.name !== undefined) {
        data.name = patch.name === null ? null : patch.name.trim() || null;
      }
      if (patch.dueDate !== undefined) {
        data.dueDate = patch.dueDate === null ? null : new Date(patch.dueDate);
      }

      return ctx.db.taskRequirementSlot.update({
        where: { id: slotId },
        data,
      });
    }),

  // Batch commit for the requirements drawer's draft. Reconciles the whole
  // ordered list in one transaction: delete removed rows, update kept rows,
  // create new ones, and sync the legacy count column. Kept rows preserve
  // their bound documents (matched by id — never delete-and-recreate).
  saveSlots: orgProcedure
    .input(z.object({ projectId: z.string() }).merge(saveSlotsSchema))
    .mutation(async ({ ctx, input }) => {
      if (!canApproveDocuments(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to manage requirements",
        });
      }

      const { projectId, taskId, kind, slots } = input;

      const task = await ctx.db.ganttTask.findFirst({
        where: { id: taskId, projectId, project: { organizationId: ctx.organization.id } },
        select: { id: true },
      });
      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const legacyField = kind === "submittal" ? "requiredSubmittals" : "requiredInspections";

      return ctx.db.$transaction(async (tx) => {
        const current = await tx.taskRequirementSlot.findMany({
          where: { taskId, kind },
          select: { id: true },
        });
        const currentIds = new Set(current.map((s) => s.id));
        const keepIds = new Set(
          slots.map((s) => s.id).filter((id): id is string => id !== null),
        );

        // Delete rows the draft dropped. The Document.slotId FK is ON DELETE
        // SET NULL, so any bound file survives in the library (just unbound).
        const toDelete = current.filter((s) => !keepIds.has(s.id)).map((s) => s.id);
        if (toDelete.length > 0) {
          await tx.taskRequirementSlot.deleteMany({ where: { id: { in: toDelete } } });
        }

        // Reconcile in array order. index === array position. The drawer only
        // adds/removes trailing slots (no reorder), so kept rows keep their
        // existing index — updating index in place can't collide on the
        // @@unique([taskId, kind, index]) constraint.
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i]!;
          const data = {
            index: i,
            name: slot.name === null ? null : slot.name.trim() || null,
            dueDate: slot.dueDate === null ? null : new Date(slot.dueDate),
          };
          if (slot.id !== null && currentIds.has(slot.id)) {
            await tx.taskRequirementSlot.update({ where: { id: slot.id }, data });
          } else {
            await tx.taskRequirementSlot.create({ data: { taskId, kind, ...data } });
          }
        }

        // Keep the legacy count column in sync so existing readers (popover
        // header, requirementStats, TrackableFolderContent) don't change.
        await tx.ganttTask.update({
          where: { id: taskId },
          data: { [legacyField]: slots.length === 0 ? null : slots.length },
        });

        return tx.taskRequirementSlot.findMany({
          where: { taskId, kind },
          orderBy: { index: "asc" },
        });
      });
    }),
});

function legacyCountForKind(
  task: { requiredSubmittals: number | null; requiredInspections: number | null },
  kind: SlotKind,
): number {
  if (kind === "submittal") return task.requiredSubmittals ?? 0;
  return task.requiredInspections ?? 0;
}
