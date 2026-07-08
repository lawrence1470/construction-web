import { z } from "zod";
import { isValidCsiCode } from "@/lib/constants/csiCodeSet";

// A CSI code that exists in our MasterFormat data (same check as gantt.ts).
const csiCodeSchema = z.string().refine((val) => isValidCsiCode(val), {
  message: "Invalid CSI code",
});

// NOTE: these are used with `projectProcedure`, which injects `{ projectId }`.
// Do not add `projectId` here and do not `.strict()` (tRPC parses the full raw
// input, so a strict schema would reject the injected key).
export const getCsiSpecSchema = z.object({ csiCode: csiCodeSchema });

export const attachCsiSpecSchema = z.object({
  csiCode: csiCodeSchema,
  documentId: z.string().cuid(),
});

export const detachCsiSpecSchema = z.object({ csiCode: csiCodeSchema });

export type GetCsiSpecInput = z.infer<typeof getCsiSpecSchema>;
export type AttachCsiSpecInput = z.infer<typeof attachCsiSpecSchema>;
export type DetachCsiSpecInput = z.infer<typeof detachCsiSpecSchema>;
