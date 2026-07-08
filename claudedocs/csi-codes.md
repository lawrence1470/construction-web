# CSI MasterFormat Codes

## Overview

The Gantt chart task popover includes a CSI (Construction Specifications Institute) code selector that allows assigning MasterFormat classification codes to tasks. This enables standardized categorization using the industry-standard MasterFormat 2018 numbering system.

## Data Source

The CSI code list is stored as a static JSON file at `src/lib/constants/csiCodes.json` as a **flat** list (`[{ code, name, subdivisions: [{ code, name }] }]`). The flat list is the source of truth; the three-tier hierarchy shown in the picker is **derived in code** (lazily, on first use — see "Three-tier hierarchy" below).

**Statistics**: 35 active divisions, **6,472 section codes** spanning all four MasterFormat outline tiers — division titles (`XX 00 00`), Level-2 broad headings (`03 30 00`), Level-3 details (`03 31 00`), and **Level-4 detail codes** (`XX XX YY` where the last pair ≠ `00`, e.g. `31 23 19 Dewatering`, `03 31 13 Heavyweight Structural Concrete`). **4,987 of the codes are Level-4**, added from the MasterFormat 2018 master list; the original ~1,482 Level-1–3 codes are preserved verbatim (titles unchanged). Level-5 codes (`XX XX YY.ZZ`, e.g. `31 09 13.13`) remain out of scope.

### Three-tier hierarchy (derived)

MasterFormat is an outline: Division → Level-2 broad heading → Level-3 detail. The flat JSON encodes only codes, so the parent/child tree is reconstructed deterministically from the second digit-pair `YY` of each `XX YY 00` code (`csiCodes.ts` → `buildTree()`):

| `YY` pattern | Tier | Placement |
|---|---|---|
| `00` (`03 00 00`) | Division title | selectable Level-2 leaf under its division |
| `01`–`09` or ends in `0` (`03 30 00`) | Level-2 broad heading | directly under the division |
| anything else (`03 31 00`, `31 23 19`) | Level-3/Level-4 detail | nests under heading `XX <Y>0 00` |

`buildTree()` keys only on the **second** digit-pair `YY`, so Level-4 codes (`XX XX YY`, last pair ≠ `00`) are grouped by their `YY` alongside the Level-3 detail that shares it — e.g. `31 23 19 Dewatering` and `03 31 13 Heavyweight Structural Concrete` sit as selectable sections under headings `31 20 00` / `03 30 00`, next to their Level-3 sibling `31 23 00` / `03 31 00`. They are flat under the group rather than nested a fourth level deep; every code is still present and selectable.

Codes are sorted before grouping, so a heading always precedes its children. A detail code whose computed parent heading is absent (now **1 code — `33 92 00`** in Division 33; the Division-00 orphans gained parent headings when the Level-4 set was merged in) is **promoted to a Level-2 leaf under its division** so nothing is dropped. The invariant "the tree contains exactly the flat code set, none lost or invented" is locked by `src/__tests__/constants/csiCodes.test.ts`.

### Where the data came from

The code list was compiled from multiple authoritative sources and cross-validated against the official MasterFormat 2018 Edition:

| Source | What it provided | URL |
|--------|-----------------|-----|
| CSI MasterFormat 2018 master list (numbers & titles) PDF | **Primary Level-4 source.** ~6,666 `XX XX XX` codes including the full Level-4 tier, parsed from the single-column "Master List of Numbers, Titles, and Explanations" section. Titles cross-validated against the existing vetted list (1,442 common codes matched; the ~4,990 new codes are Level-4). | `cscheduling.b-cdn.net/free downloads/CSI Master Format DIVISIONS & TITLES - 2018 EDITION.pdf` |
| AGC Austin MasterFormat 2018 PDF | Earlier source for the original 1,482 Level-1–3 codes. | `agcaustin.org/uploads/.../masterformat_2018_web.pdf` |
| pdfcoffee.com CSI 2018 Edition | Detailed Level 3 codes for Divisions 00-14 with full subdivision breakdowns | `pdfcoffee.com/csi-master-format-divisions-amp-titles-2018-edition-pdf-free.html` |
| DesignGuide CSI MasterFormat Index | Level 2 codes for all 35 divisions | `designguide.com/csi-masterformat-index` |
| Original project data | 799 codes from initial implementation, preserved as baseline | Internal |

### Validation

The merged JSON was validated programmatically after the Level-4 master-list merge:
- All codes match `XX XX XX` format (Level-1–4; no Level-5 decimals)
- All subdivision codes fall within their parent division
- No duplicate codes
- Every original Level-1–3 title preserved unchanged (0 existing titles modified)
- The 39 codes our list has that the master-list PDF omits (e.g. `02 85 00`, `33 13 00`, several `44 xx`/`46 xx` process-equipment codes) were kept — the merge is additive, never a replacement
- Tree-integrity invariant enforced by `src/__tests__/constants/csiCodes.test.ts` (flat set == tree leaves)

### What's NOT included

- **Reserved divisions**: 15-20, 24, 29-30, 36-39, 47, 49 (unassigned in MasterFormat 2018)
- **Level-5 codes**: the deepest tier (`XX XX YY.ZZ`, e.g. `31 09 13.13 Groundwater Monitoring During Construction`) is not included. These are rarely used in construction PM tools, would add several thousand more entries, and use a decimal format the `XX XX XX` schema and `formatCsiCodeWith()` don't parse. (Level-4 codes like `31 23 19` **are** included as of the master-list merge.)

## Architecture

### Key files

| File | Purpose |
|------|---------|
| `src/lib/constants/csiCodes.json` | Raw **flat** data (~606KB): `[{ code, name, subdivisions: [{ code, name }] }]`. **Only ever dynamically imported** (see lazy loading below), so it lands in its own async chunk (~68KB gzip) instead of any initial bundle. |
| `src/lib/constants/csiCodes.ts` | Lazy data layer: `loadCsiData()` dynamically imports the JSON once and memoizes the O(1) lookup maps + the `CSI_TREE` hierarchy (via `buildTree()`) into a `CsiData` object. Nothing runs at module init. Also exports `getLoadedCsiData()`, `formatCsiCodeWith(data, code)`, and the `CsiDivisionTree`/`CsiGroup`/`CsiSection` types. |
| `src/lib/constants/csiCodeSet.json` + `csiCodeSet.ts` | **Codes-only** membership data (~70KB / 14KB gzip): a flat `string[]` of every valid code and `CSI_CODE_SET` / `isValidCsiCode()`. This is all server-side validation needs, so it keeps the 606KB names+tree payload and `buildTree()` cost out of the server bundle. Generated from `csiCodes.json`; kept in sync by the test. |
| `src/lib/constants/useCsiData.ts` | Client hooks `useCsiData()` (loads the dataset on mount, returns `null` until ready) and `useCsiName(code)` (formats one code, showing the raw code until names load). Used by display consumers (`TaskHeader`, document filters). |
| `src/components/bryntum/components/task-popover/TaskHeader.tsx` | Inline CSI chip in the popover meta row (code + truncated name when set, dashed "+ CSI code" when empty); calls `onOpenCsiPanel` to open the panel |
| `src/components/bryntum/components/task-popover/CsiCodePanel.tsx` | Slide-in panel: 3-tier accordion (Division → Level-2 heading → Level-3 detail) with search, optimistic updates, code selection. Level-2 headings are both selectable and expandable; Level-3 details are selectable leaves. The current-selection **banner** also hosts the per-(project, code) spec document (upload/open/remove). |
| `src/lib/validations/gantt.ts` | Zod `.refine()` validation for `csiCode` on the shared `gantt.sync` task schema — uses `isValidCsiCode()` from `csiCodeSet.ts` (codes-only, no names/tree) |
| `src/server/api/routers/csiSpec.ts` + `src/lib/validations/csiSpec.ts` | tRPC router (`getForCode` / `attach` / `detach`) and Zod schemas for the per-(project, code) spec document. See "Spec document attachment" below. |

### Data flow

1. **Lazy load**: the first consumer to mount (`TaskHeader`, a document filter, or the picker) calls `useCsiData()` → `loadCsiData()`, which dynamically imports the JSON once and memoizes the maps + `CSI_TREE`. Nothing is built at module init; the dataset is shared module-wide after the first load.
2. **Trigger**: `TaskHeader` renders an inline CSI chip; clicking it calls `onOpenCsiPanel` to open the `CsiCodePanel` slide-in panel
3. **Selection**: `CsiCodePanel` reads `csiData.tree`, filters client-side across all tiers (the query runs through `useDeferredValue` so typing stays responsive), and shows a 3-tier accordion. Until `useCsiData()` resolves the panel shows a spinner; the spec-document banner still renders immediately (only the code's name lazy-fills). Selecting a heading or detail saves; the division/group containing the current code auto-expands on open.
4. **Save**: User selects code -> optimistic update -> panel writes `record.csiCode = next` on the Bryntum task record -> Bryntum's `autoSync` flushes the change to `gantt.sync`, where the shared task Zod schema validates the code with `isValidCsiCode()` (codes-only set) and persists to `GanttTask.csiCode` (last-write-wins)
5. **Display**: `formatCsiCodeWith(csiData, code)` / `useCsiName(code)` resolve `"03 30 00"` -> `"03 30 00 - Cast-in-Place Concrete"` (raw code until the dataset loads)

### Spec document attachment (per project + CSI code)

The CSI panel's current-selection banner lets a user attach **one spec document per
`(projectId, csiCode)`**, shared by every task in the project carrying that code. Clicking the
attached document opens it in the popover's in-app `DocumentPreviewDialog`.

- **Model**: `CsiSpecDocument` (mapping table) — `@@unique([projectId, csiCode])` and a unique
  `documentId`. The linked row is a **real `Document`** (shows in the Document Explorer + AI
  search); deleting it from the Explorer cascades the link away.
- **Upload**: reuses `POST /api/upload` (file + `projectId` → unassigned `Document` with blob +
  AI tags + embedding) via `trackUpload` (global upload chip). The returned `documentId` is
  then linked with `csiSpec.attach`. Gated on `canManageProjects` (client `canManage` prop +
  server check).
- **Tree indicators**: `csiSpec.listForProject` returns every code in the project that has a
  doc; the picker shows a paperclip on each such code (group/section) and a roll-up paperclip
  on **collapsed** division/group rows whose branch contains one (so docs are discoverable
  without expanding all 35 divisions). Roll-ups are computed from the **tree structure**
  (`docRollup`: a division rolls up if any of its codes has a doc; a group only if one of its
  own `sections` does) — **never from code prefixes**, since orphan Level-2 leaves (e.g.
  `00 51/52/54/55 00`) share a `slice(0,4)` prefix and a prefix check would falsely flag the
  siblings. While a code is attaching, its indicator flickers and shows a spinner. `attach`/
  `detach` invalidate this list too.
- **Loading state**: while adding or removing, the banner shows a spinner row ("Attaching
  document…" / "Removing document…"). Busy state is tracked **per CSI code** (`pendingByCode`
  map) and operations capture their target code, so switching codes mid-upload never bleeds the
  spinner onto the wrong code and `attach`/`detach` always invalidate the code they targeted.
  The viewed code's spinner clears only once its refetched `getForCode` settles (no pre-change
  flash); codes switched away from clear in the mutation callbacks.
- **Freshness**: both `getForCode` and `listForProject` use `staleTime: 0` +
  `refetchOnMount: 'always'`, overriding the global 30s `staleTime` (`src/trpc/query-client.ts`).
  Without this, the banner could show a stale "no document" for a code that actually has one
  (cache held a `null` fetched before the doc was attached).
- **Replace is non-destructive**: `attach` deletes the prior `(projectId, csiCode)` link (and
  any prior link for the new document) inside a transaction, then creates the new link; the
  previously linked `Document` remains in the Explorer as unassigned.
- **Read/open**: `csiSpec.getForCode` returns the linked doc shaped as a `PreviewDoc` (blobUrl
  rewritten via `documentProxyUrl`); the banner opens it through the popover's `openPreview`,
  which shows the file in `DocumentPreviewDialog` (a centered popup — images inline, PDFs in an
  iframe via the same-origin blob proxy). Viewing is open to any project member (the
  `/api/blob/[documentId]` proxy enforces tenancy); `detach` (manager-only) unlinks but keeps
  the document.

### Why static JSON (not database)

- MasterFormat updates every ~6 years (last: 2018). Near-zero change frequency.
- All tenants use the same standard codes. No per-org customization needed.
- Client-side search on ~6,500 items is still sub-millisecond. No server query needed.
- Bundle impact: the ~606KB/~68KB-gzip names+tree JSON is **code-split into its own async chunk** (only ever dynamically imported), so it is not in any initial route bundle — it loads when the CSI picker / display hooks first mount. Server-side validation carries only the ~14KB-gzip codes-only set.
- Zero infrastructure: no table, no seeding, no caching layer, no admin UI.

Move to a database table only if: tenants need custom code lists, you need usage analytics, or the list changes frequently.

### Performance optimizations

| Optimization | Where | What it prevents |
|------|-------|-----------------|
| **Lazy dynamic import** | `csiCodes.ts` — `loadCsiData()` `import("./csiCodes.json")`; `useCsiData()` hook | Shipping the 606KB names+tree JSON in initial route bundles / the server validation bundle |
| **Validation split** | `csiCodeSet.ts` — codes-only `Set` + `isValidCsiCode()` | `gantt.sync` / `csiSpec` validation pulling names + running `buildTree()` server-side (uses the 14KB set instead) |
| **Tree + maps built once (lazily)** | `csiCodes.ts` — memoized inside `loadCsiData()` | Re-deriving the hierarchy / lookup maps on every load; and building them at all for validation-only importers |
| **Deferred search query** | `CsiCodePanel.tsx` — `useDeferredValue(search)` | The ~6,500-item filter blocking keystroke paints |
| **Pre-lowercased names** | `csiCodes.ts` — `nameLower` on divisions, Level-2 groups, and sections | 6,472 `.toLowerCase()` string allocations per keystroke during search |
| **`useMemo` filtering** | `CsiCodePanel.tsx` — `displayDivisions` keyed on the deferred `query` + `tree` | Full tree walk + filter recomputation on unrelated state changes (expand toggle, optimistic code) |
| **`React.memo` SectionItem** | `CsiCodePanel.tsx` — extracted memoized Level-3 row | Re-rendering every visible row when only one item's `isSelected` changes |
| **Stable `useCallback`** | `CsiCodePanel.tsx` — `handleSelect`, `toggleGroup` | New closure per row per render (breaks `React.memo`) |
| **Collapsed-by-default accordion** | `CsiCodePanel.tsx` — only the expanded division's groups and expanded groups' sections render | Mounting all 6,472 rows at once when not searching |
| **Search result caps** | `CsiCodePanel.tsx` — `MAX_GROUPS_PER_DIV` (25), `MAX_SECTIONS_PER_GROUP` (12) | Rendering hundreds of rows during broad searches (search force-expands the tree) |
| **O(1) lookup Maps** | `csiCodes.ts` — `divisionMap`, `subdivisionMap` on `CsiData` | Linear scans for code display |

**Still adequate at this scale** (6,472 items): the collapsed-by-default accordion + per-group/per-division search caps keep the number of *mounted* rows small regardless of total code count, so virtualization remains unnecessary. The names+tree payload is code-split and lazy-loaded (~68KB gzip async chunk), and validation runs off a codes-only set. If code count grows much further (Level-5) or the accordion is ever made to render all rows at once, revisit virtualization.

## Updating the code list

If MasterFormat releases a new edition:

1. Source the new list from CSI official sources or ARCAT
2. Replace `src/lib/constants/csiCodes.json` (same schema)
3. **Regenerate the codes-only validation file** `src/lib/constants/csiCodeSet.json` from the new data (flat sorted `string[]` of every division + subdivision code). The sync test fails if you forget.
4. Validate: all existing stored codes should still be present (superset guarantee)
5. Run `npx tsc --noEmit` and `npx vitest run src/__tests__/constants/csiCodes.test.ts` to verify — no code changes needed. The test asserts the derived tree still contains exactly the flat code set (no codes lost or invented), nesting/orphan handling hold, and `csiCodeSet.json` matches `csiCodes.json`.
6. The Zod `.refine()` validation (via `csiCodeSet.ts`) and the derived tree both auto-update since they derive from the same source JSON.

If existing codes are removed in the new edition, `formatCsiCodeWith()` / `useCsiName()` gracefully fall back to returning the raw code string (no crash).
