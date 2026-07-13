import { z } from "zod";
import { isValidCsiCode } from "@/lib/constants/csiCodeSet";

// Load input schema
export const ganttLoadInputSchema = z.object({
  organizationId: z.string().cuid(),
  projectId: z.string().cuid(),
});

// Individual record schemas for sync
const taskRecordSchema = z.object({
  id: z.string().optional(),
  $PhantomId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  name: z.string().optional(),
  percentDone: z.number().min(0).max(100).optional(),
  startDate: z.string().or(z.date()).nullable().optional(),
  endDate: z.string().or(z.date()).nullable().optional(),
  duration: z.number().nullable().optional(),
  durationUnit: z.string().optional(),
  effort: z.number().nullable().optional(),
  effortUnit: z.string().nullable().optional(),
  expanded: z.boolean().optional(),
  orderIndex: z.number().optional(),
  // Bryntum's calculated tree-position fields (persisted on AppTaskModel). A
  // drag-reorder sends these on the moved siblings; the server maps them onto
  // the orderIndex column. The schema otherwise strips unknown keys.
  orderedParentIndex: z.number().optional(),
  parentIndex: z.number().optional(),
  manuallyScheduled: z.boolean().optional(),
  constraintType: z.string().nullable().optional(),
  constraintDate: z.string().or(z.date()).nullable().optional(),
  rollup: z.boolean().optional(),
  cls: z.string().nullable().optional(),
  iconCls: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  csiCode: z.string().nullable().optional().refine(
    (val) => val == null || isValidCsiCode(val),
    { message: "Invalid CSI code" },
  ),
  baselines: z.any().optional(),
});

const dependencyRecordSchema = z.object({
  id: z.string().optional(),
  $PhantomId: z.string().optional(),
  fromTask: z.string().optional(), // Bryntum field name
  from: z.string().optional(), // Alternative field name
  fromTaskId: z.string().optional(), // DB field name
  toTask: z.string().optional(), // Bryntum field name
  to: z.string().optional(), // Alternative field name
  toTaskId: z.string().optional(), // DB field name
  type: z.number().int().optional(),
  lag: z.number().optional(),
  lagUnit: z.string().nullable().optional(),
  cls: z.string().nullable().optional(),
});

const resourceRecordSchema = z.object({
  id: z.string().optional(),
  $PhantomId: z.string().optional(),
  name: z.string().optional(),
  city: z.string().nullable().optional(),
  calendar: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

const assignmentRecordSchema = z.object({
  id: z.string().optional(),
  $PhantomId: z.string().optional(),
  event: z.string().optional(), // Bryntum field name for task
  taskId: z.string().optional(), // DB field name
  resource: z.string().optional(), // Bryntum field name
  resourceId: z.string().optional(), // DB field name
  units: z.number().optional(),
});

const timeRangeRecordSchema = z.object({
  id: z.string().optional(),
  $PhantomId: z.string().optional(),
  name: z.string().optional(),
  startDate: z.string().or(z.date()).optional(),
  duration: z.number().nullable().optional(),
  durationUnit: z.string().nullable().optional(),
  cls: z.string().nullable().optional(),
});

// Store change schemas
const storeChangesSchema = <T extends z.ZodTypeAny>(recordSchema: T) => z.object({
  added: z.array(recordSchema).optional(),
  updated: z.array(recordSchema).optional(),
  removed: z.array(z.object({ id: z.string() })).optional(),
});

// Full sync input schema
export const ganttSyncInputSchema = z.object({
  organizationId: z.string().cuid(),
  projectId: z.string().cuid(),
  tasks: storeChangesSchema(taskRecordSchema).optional(),
  dependencies: storeChangesSchema(dependencyRecordSchema).optional(),
  resources: storeChangesSchema(resourceRecordSchema).optional(),
  assignments: storeChangesSchema(assignmentRecordSchema).optional(),
  timeRanges: storeChangesSchema(timeRangeRecordSchema).optional(),
});

// Per-slot tracking schemas (Tier 2/3)
export const slotKindSchema = z.enum(['submittal', 'inspection']);
export type SlotKind = z.infer<typeof slotKindSchema>;

export const listSlotsSchema = z.object({
  taskId: z.string(),
  kind: slotKindSchema,
});

export const setSlotCountSchema = z.object({
  taskId: z.string(),
  kind: slotKindSchema,
  count: z.number().int().min(0).max(50),
});

export const updateSlotSchema = z.object({
  slotId: z.string(),
  name: z.string().trim().max(200).nullable().optional(),
  dueDate: z.string().or(z.date()).nullable().optional(),
});

// Batch reconcile for the requirements drawer. The client edits a local draft
// (count + names + due dates) and commits the whole list at once. `slots` is
// the desired ordered list: a non-null `id` targets an existing row (update),
// `id: null` is a brand-new slot (create), and any current row whose id is
// absent from the list is deleted. The legacy count column is synced to the
// list length so popover readers stay in step.
export const saveSlotsSchema = z.object({
  taskId: z.string(),
  kind: slotKindSchema,
  slots: z
    .array(
      z.object({
        id: z.string().nullable(),
        name: z.string().trim().max(200).nullable(),
        dueDate: z.string().or(z.date()).nullable(),
      }),
    )
    .max(50),
});

export type ListSlotsInput = z.infer<typeof listSlotsSchema>;
export type SetSlotCountInput = z.infer<typeof setSlotCountSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type SaveSlotsInput = z.infer<typeof saveSlotsSchema>;

// Type exports
export type GanttLoadInput = z.infer<typeof ganttLoadInputSchema>;
export type GanttSyncInput = z.infer<typeof ganttSyncInputSchema>;
export type TaskRecord = z.infer<typeof taskRecordSchema>;
export type DependencyRecord = z.infer<typeof dependencyRecordSchema>;
export type ResourceRecord = z.infer<typeof resourceRecordSchema>;
export type AssignmentRecord = z.infer<typeof assignmentRecordSchema>;
export type TimeRangeRecord = z.infer<typeof timeRangeRecordSchema>;
