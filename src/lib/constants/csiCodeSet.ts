// Codes-only membership set for validation. This module deliberately imports
// ONLY the lightweight `csiCodeSet.json` (a flat string[] of every valid code)
// — never the full `csiCodes.json` with names + the derived tree. Server-side
// Zod `.refine()` checks (gantt.sync, csiSpec) need nothing more than "is this a
// real CSI code?", so keeping them on this tiny module keeps the 606KB name/tree
// payload and the `buildTree()` init cost out of the server bundle entirely.
//
// `csiCodeSet.json` is generated from `csiCodes.json`; the two are kept in sync
// by `src/__tests__/constants/csiCodes.test.ts`.
import codes from "./csiCodeSet.json";

export const CSI_CODE_SET: ReadonlySet<string> = new Set(codes);

/** True if `code` is a valid MasterFormat division or subdivision code. */
export function isValidCsiCode(code: string): boolean {
  return CSI_CODE_SET.has(code);
}
