# Components Guide

Conventions for adding, naming, and structuring components in `src/components/`.

---

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `ui/` | Shared design-system primitives (Button, Label, dropdowns, image helpers, spinner, ProjectAvatar) |
| `layout/` | App shell: Header, Sidebar, MobileDrawer, OrgSwitcher, ProjectSwitcher, UserMenu, PageHeader |
| `providers/` | React context providers: ThemeRegistry, OrgProvider, ProjectProvider, LoadingProvider |
| `dashboard/` | Legacy placeholder components (ProjectsList, TeamActivity) — unused; superseded by `overview/` |
| `overview/` | Project Overview command-center at `/[orgSlug]/projects/[projectSlug]/overview` (OverviewContent, OverviewHero title row, StatCard, ProgressRing, NeedsAttentionCard, SiteCard, OverviewCard shell). Data: new `project.overview` + existing `gantt.requirementStats`, `approval.listOverdueSlots`, `weather.getByLocation`. Org home (`/[orgSlug]`) now redirects here instead of the Gantt. |
| `projects/` | Project CRUD dialogs and trees (AddProjectDialog, ProjectFormBody, ProjectsTree, ProjectDetailPanel, SidebarRowPreview) plus the portfolio surface at `/[orgSlug]/projects` (ProjectsView, ProjectsMap, ProjectsListPane) |
| `documents/` | Document feature components (DocumentList, UploadDialog, FileDropzone). Explorer cards (DocumentCardCompact/Detail/Gallery) render a real preview in their thumbnail box via `DocumentThumbnail` — images inline, and **PDF first pages rasterized to a canvas with pdf.js** (lazy/in-view, falls back to the file icon while rendering or on error). Clicking a card calls `onPreview` → the page opens `DocumentPreview`, a centered modal that shows images inline, PDFs/text in a same-origin iframe (served inline by the `/api/blob/[documentId]` proxy), and an "open in new tab" fallback for other types; steps through the result set with ‹ / › + ←/→. The pdf.js worker is self-hosted at `/pdf/pdf.worker.min.mjs` (copied from `node_modules` by `scripts/sync-pdf-worker.mjs` in the npm `postinstall` chain — keep it there, mirroring the Bryntum theme sync). |
| `approvals/` | Submittal/inspection approval workflow (ApprovalToggle, ReviewQueueContent, ReviewCard). The Review Queue's "Overdue" tab reads from `gantt.listSlots` / `approval.listOverdueSlots` so per-task slot due dates surface here. |
| `team/` | Team/invite management (MembersList, InviteDialog, RoleSelect, PendingInvitesList) |
| `onboarding/` | Onboarding wizard and step components |
| `bryntum/` | Gantt chart integration — has its own internal structure (see below) |

**Rule:** New feature components go in a directory named after their feature, not in `ui/` or `layout/`.

---

## Custom Hooks

Hooks are placed based on their scope:

- **`src/hooks/`** — Shared cross-feature hooks used by 2+ unrelated components (e.g. `useOrgFromUrl`, `useNotifications`, `useInvitationActions`). Mark with `'use client'`.
- **`src/components/<feature>/hooks/`** — Hooks scoped to a single feature (e.g. `bryntum/hooks/useGanttControls.ts`).

Use `src/hooks/` when the logic is consumed by components in different feature directories. Co-locate in the feature directory when the hook is only used within that feature.

---

## Shared Utilities (`src/lib/utils/`)

Pure, reusable utility functions live in `src/lib/utils/`. Current modules:

| File | Purpose |
|------|---------|
| `gantt.ts` | Gantt-specific data helpers |
| `getBaseURL.ts` | Base URL resolution |
| `slug.ts` | Slug generation |
| `files.tsx` | `getFileIcon(mimeType)` — returns Lucide icon for a file type |
| `formatting.ts` | `formatRole(role)`, `formatFileSize(bytes)` — display formatting helpers |
| `date.ts` | `parseLocalDate(yyyyMmDd)` — parse a `yyyy-MM-dd` string as a LOCAL date (not UTC) so date-picker round-trips and chips don't shift a day in negative-UTC timezones |
| `weather.ts` | `getWeatherIcon(owmCode)` — OpenWeatherMap icon code → Phosphor icon + label (shared by header `LocationWeather` and overview `SiteCard`) |
| `overviewStats.ts` | `computeOverviewStats(tasks, now)` — pure stats for the project Overview (counts, overdue, rolling weekly buckets, upcoming list); unit-tested, called by `project.overview` |

---

## Naming Conventions

- **Component files**: PascalCase matching the default export — `AddProjectDialog.tsx`
- **Hook files**: camelCase prefixed with `use` — `useTaskPopover.ts`
- **Utility files**: camelCase — `calculatePopoverPlacement.ts`
- **Constant/config files**: camelCase — `ganttConfig.ts`, `constants.ts`
- **Type files**: camelCase — `types.ts`
- No `index.ts` barrel files in component directories.

---

## Component File Structure

```tsx
'use client'; // Only when using hooks, browser APIs, or event handlers

import { ... } from '@mui/material';
import { api } from '@/trpc/react';          // tRPC client
import { useRouter, useParams } from 'next/navigation';
import OtherComponent from '@/components/feature/OtherComponent';

// 1. Props interface — always explicit, never inline
interface MyComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 2. Default export — named function matching filename
export default function MyComponent({ open, onOpenChange }: MyComponentProps) {
  // 3. Hooks at the top
  // 4. Derived state
  // 5. Mutations / queries
  // 6. Handlers
  // 7. JSX
}
```

- Always `export default` for page/feature components.
- Named exports for re-usable UI primitives (see `ui/button.tsx`).
- Props interface named `<ComponentName>Props` in the same file.

---

## When to Add `'use client'`

Add `'use client'` when the component:
- Uses React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Calls tRPC client hooks (`api.xxx.useQuery`, `api.xxx.useMutation`)
- Handles browser events or reads browser APIs
- Uses `useRouter`, `useParams`, `usePathname`

Omit `'use client'` for pure presentational components that receive all data as props and have no interactivity. These can remain RSCs and be imported into client components without issue.

---

## Styling

MUI `sx` prop is the primary styling mechanism. Do not use CSS modules or Tailwind classes on MUI components.

```tsx
// ✅ MUI sx — use theme tokens
<Box sx={{ bgcolor: 'background.paper', borderColor: 'divider', p: 2 }}>

// ✅ CSS variables — for one-off colors from the design system
<Icon style={{ color: 'var(--accent-primary)' }} />

// ❌ Avoid hardcoded colors
<Box sx={{ bgcolor: '#fff', color: '#333' }}>
```

**Always prefer Phosphor icons (`@phosphor-icons/react`) over Lucide.** Phosphor is the primary icon library for this project. Only use Lucide for `getFileIcon()` in `files.tsx` (legacy). Phosphor icons use the `size` prop: `<Icon size={18} weight="regular" />`.

---

## Page Transitions

Page transitions are handled with a simple CSS animation in `AppShell.tsx` — no third-party libraries. The main content `<Box>` uses `key={pathname}` to force a remount on route changes, which replays a `page-enter` keyframe animation defined in `globals.css`.

**How it works:**
- `AppShell` reads `usePathname()` and passes it as `key` to the main content wrapper
- On route change, React unmounts/remounts the main `<Box>`, triggering the CSS animation
- The sidebar and header are outside the keyed element, so they stay completely stable

**Key files:**
- `src/components/layout/AppShell.tsx` — `key={pathname}` on the main content `<Box>`
- `src/styles/globals.css` — `@keyframes page-enter` definition

**Rules:**
- Do **not** use the View Transitions API (`document.startViewTransition`) — it causes timeout errors with this app's data fetching and Suspense boundaries
- Do **not** use `next-view-transitions` package — same timeout issue
- Do **not** give the header or sidebar a `view-transition-name` — it pulls them out of flow and causes layout shift
- Keep the animation scoped to the main content area only
- The `key={pathname}` approach is intentional — state-based animation toggling doesn't reliably re-trigger CSS animations

---

## Data Fetching

Components fetch their own data via tRPC — do not thread props through multiple layers.

```tsx
// ✅ Fetch inside the component that needs it
const { data: projects = [], isLoading } = api.project.list.useQuery(
  { organizationId },
  { retry: false, enabled: !!organizationId }
);

// ✅ Derive org context from URL params + org list (standard pattern)
const params = useParams<{ orgSlug?: string }>();
const { data: organizations = [] } = api.organization.list.useQuery(undefined, { retry: false });
const currentOrg = organizations.find((o) => o.slug === params.orgSlug);
```

Cache invalidation after mutations: `void utils.xxx.invalidate()` — always fire-and-forget with `void`.

### Private blob URLs (documents, project images)

Both live in the private `construction-uploads` store. Raw blob URLs are **never exposed to the client** — tRPC read procedures rewrite them to authenticated proxy paths before returning, and upload route responses return the proxy URL directly:

| Model field | Proxy path | Access check | Render path |
|---|---|---|---|
| `Document.blobUrl` | `/api/blob/[documentId]` | project member | any tRPC document query or `/api/upload` |
| `Project.imageUrl` | `/api/blob/project-image/[projectId]` | org member | `project.list/getById/getBySlug/getActive/setActive/update` + `[orgSlug]/projects/[projectSlug]/layout.tsx` |
| `GanttTask.coverImageUrl` | `/api/blob/task-cover/[taskId]` | org member | `gantt.taskDetail` |

Each Gantt task has its own dedicated cover image — a standalone upload, **not** tied to the Photos folder or the `Document` table. The cover is a private blob whose URL is stored directly on `GanttTask.coverImageUrl` (mirrors the `Project.imageUrl` pattern). Upload/replace go through `POST /api/upload/task-cover` (which persists `coverImageUrl` immediately and cleans up the previous blob), removal through `DELETE` on the same route; both are gated on `canManageProjects`. `gantt.taskDetail` rewrites the stored URL to the `/api/blob/task-cover/[taskId]` proxy. See `CoverImageBanner.tsx` — it uploads via `trackUpload` (so the global toast chip shows progress) and supports drag-and-drop, replace, and remove. The legacy `gantt.pinPhoto` / `coverDocumentId` pin-from-Photos mechanism has been removed (the `coverDocumentId` column is left in place, unused).

Client code uses these like any other URL (`<img src>`, `<iframe src>`, `<a href>`, `fetch()`, `window.open()`); the browser sends its session cookie and the proxy enforces tenancy. Never attempt to render the raw blob CDN URL — it will 403.

**Forms that upload and preview**: private URLs don't render in `<img>`, so forms that show a just-uploaded image before submit must use a local object URL for preview (`URL.createObjectURL(file)` + `revokeObjectURL` on unmount/replace) and keep the form state field for the raw URL that gets submitted. See `ProjectFormBody.tsx` and `manage/page.tsx` for the `previewUrl ?? imageUrl` display pattern. The tRPC update mutation also defensively treats an incoming proxy URL as a no-op (the form round-trips the unchanged proxy URL when the user edits other fields).

User avatars (`user.image`) are the opposite: they live in the **public** avatars store and are rendered directly via the public CDN URL — no proxy involved.

---

## TextField / Input Styling

All `TextField` components use the global `MuiOutlinedInput` theme override defined in `src/theme/theme.ts`. **Do not add custom `sx` to override border, focus ring, or background color on TextFields** — the theme handles this for both light and dark modes automatically.

The global style gives every input:
- `divider` border color at rest (soft, consistent with the design system)
- `text.primary` border at 32% opacity on hover
- `primary.main` border color + a 3px low-opacity focus ring (boxShadow) on focus

Border *width* stays at 1px in every state. Do not bump the focused border to a non-default width — MUI's `<legend>` notch and floating label are calibrated for a 1px border, and the extra width clips the top of the label letters. Use the focus ring (boxShadow) for emphasis instead.

The only deliberate exception is `OtpInput.tsx` — its box-style digit appearance overrides the global styles via component-level `sx`, which takes precedence over `styleOverrides`. Do not replicate this pattern elsewhere.

---

## Forms

Use `react-hook-form` + `zodResolver` + a Zod schema from `src/lib/validations/`.

```tsx
const { control, handleSubmit, reset, formState: { errors } } = useForm<InputType>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});

// Wrap MUI inputs with Controller
<Controller
  name="fieldName"
  control={control}
  render={({ field }) => (
    <TextField {...field} error={!!errors.fieldName} helperText={errors.fieldName?.message} />
  )}
/>
```

---

## UI Primitives (`ui/`)

`ui/` components wrap MUI with project-specific conveniences. Prefer them over bare MUI when available.

| Component | MUI base | Notes |
|-----------|----------|-------|
| `Button` | `MuiButton` | Wraps MUI Button; adds `loading` and `loadingPosition` (`'start'` \| `'end'`) props with auto-sized spinner per MUI size (`small`=14px, `medium`=16px, `large`=18px). Uses MUI's native `variant` and `size` props. |
| `DropdownMenu` | Radix primitive via Shadcn | Use for action menus; compatible with `asChild` |
| `sheet.tsx` | Radix Sheet | Slide-in panels |
| `Label` | MUI | Accessible form labels |
| `LoadingSpinner` | `CircularProgress` | Standard loading indicator |
| `ImageWithFallback` / `OptimizedImage` | `next/image` | Always use over bare `<img>` |
| `FileDropzone` | `react-dropzone` | Standalone or embedded dropzone; accepts `getRootProps`/`getInputProps` for standalone mode |
| `UploadOverlay` | `CircularProgress` | Upload progress overlay with spinner; variants: `dark` (image overlay), `light` (form area) |
| `UploadStatusChips` | MUI + framer-motion | Toast-style upload chips, fixed bottom-right. Pure render; consumes `UploadEntry[]`. |
| `UploadStatusChipsHost` | — | Reads global `uploadStatusStore` and renders the chips with 4s auto-dismiss for done entries. Mounted once per layout (already in `AppShell` and `(onboarding)/layout.tsx`). |
| `ProjectAvatar` | `next/image` + `Box` | Renders project cover image (with `onError` fallback) or project icon; used in ProjectSwitcher and ProjectFormBody |

For any MUI component without a `ui/` wrapper, use MUI directly — do not create wrappers unless the abstraction is used in 3+ places.

### Standardized upload chip — use the global store, not local spinner state

Every upload UI in the app — documents, avatars, org logos, project cover images, onboarding logos — funnels its progress through one toast chip in the bottom-right corner. The chip is mounted once via `UploadStatusChipsHost` in `AppShell` and the onboarding layout, and is fed by the Zustand store at `src/store/uploadStatusStore.ts`.

**To add a new upload site**, do NOT introduce another inline spinner / scrim / "Uploading..." label. Use the `trackUpload` helper:

```ts
import { trackUpload } from '@/store/uploadStatusStore';

const result = await trackUpload<{ imageUrl: string }>(
  file,
  () => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch('/api/your/endpoint', { method: 'POST', body: formData });
  },
  { doneLabel: 'Cover image ready', maxBytes: 5 * 1024 * 1024 },
);

if (result.ok && result.data?.imageUrl) {
  // use the URL — round-trip into form state, etc.
} else if (result.error) {
  // surface to caller (snackbar, inline error). The chip already shows the error.
}
```

The helper wraps a fetch in chip lifecycle (pending → uploading → done | error), parses the JSON body, and returns `{ ok, data?, error? }`. Each `id` is internally generated (`crypto.randomUUID`), `doneLabel` overrides the default "Uploaded · {size}" line, and `maxBytes` short-circuits with an error chip if exceeded. The fetch shape and response parsing stay with the caller — different endpoints return different bodies.

**Form-integrated uploads (project cover, etc.) keep their `URL.createObjectURL` previews** so the form shows the chosen image immediately. Just don't render a second progress indicator — the chip is the single source of truth.

**Do not** mount `<UploadStatusChips />` or `<UploadStatusChipsHost />` directly inside feature components — the host is already global. Mounting a second instance double-renders chips and z-index-fights with the original.

---

## Providers (`providers/`)

Providers wrap context around the app. They are initialized in `src/app/(app)/layout.tsx`.

- `OrgProvider` — exposes `useOrg()` for current organization
- `ProjectProvider` — exposes `useProject()` for active project
- `LoadingProvider` — global loading overlay (`useLoading()` → `showLoading` / `hideLoading`)
- `ThemeRegistry` — MUI emotion SSR setup. Also mounts MUI X's `LocalizationProvider` (`dateAdapter={AdapterDateFns}`, date-fns v4) so any `DatePicker` works app-wide and inherits the light/dark MUI theme.

Do not create new providers for feature-scoped state — use Zustand stores in `src/store/` instead.

### Date inputs — use MUI X `DatePicker`

For date fields, use `DatePicker` from `@mui/x-date-pickers/DatePicker` (MUI X v8) — **not** a native `<input type="date">`. It renders a modern, theme-consistent calendar and supports `maxDate`/`minDate` to disable out-of-range days. The picker works in `Date` objects; when the form/wire value is a `yyyy-MM-dd` string, convert at the boundary (`value={s ? new Date(s) : null}`, `onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}`). See `ProjectStartCard.tsx` (Gantt) and the project Settings page for working examples. `LocalizationProvider` is already global (in `ThemeRegistry`) — do not mount another.

---

## Bryntum (`bryntum/`)

The Gantt chart integration has its own internal structure because of the complexity of the Bryntum library:

```
bryntum/
  BryntumGanttWrapper.tsx   ← main wrapper (entry point)
  types.ts                  ← shared TypeScript types
  constants.ts              ← event names, column IDs, etc.
  config/
    ganttConfig.ts          ← Bryntum config object
  components/
    TaskDetailsPopover.tsx
    SubmittalDrawer.tsx       ← right-side drawer for managing per-slot submittals/inspections. Draft editor: count/name/due-date edits stay local until the user clicks Save (commits the whole list via gantt.saveSlots), with a Save/Discard bar, a discard guard on close/tab-switch, and uploads disabled on unsaved draft slots. On Save it flashes "Saved ✓", then fires onSaved → the popover auto-closes the drawer and shows a transient confirmation banner (RequirementsSavedBanner in TaskDetailsPopover)
    BryntumPanelHeader.tsx
    ProjectStartCard.tsx      ← banner above the toolbar showing the project start date (the Gantt scheduling floor). Owners/admins can edit it inline (read-only for members). Saves via `project.update`; on success it sets `gantt.project.startDate` live so bars can immediately slide to the new floor. See "Project start date" note below.
    TaskLinkingBar.tsx        ← floating confirm toast for Shift-click/Link-mode dependency creation
    task-popover/             ← extracted sub-components for TaskDetailsPopover
      types.ts
      TaskHeader.tsx
      CoverImageBanner.tsx
      FolderRow.tsx
      BaseFolderContent.tsx
      PhotosFolderContent.tsx
      TrackableFolderContent.tsx
      RequirementCounter.tsx
      DocumentPreviewDialog.tsx   ← centered popup viewer (images inline, PDFs in an iframe). Steps through the clicked doc's sibling set via ‹ / › + ←/→ ("N / M" counter, edge hovers); the parent overlays live approval state so the in-header approve toggle (trackable submittal/inspection docs only) stays correct while navigating
      CsiCodePanel.tsx
  hooks/
    useTaskPopover.ts
    useTaskLinking.ts         ← Shift-click / Link-mode ordered selection → Finish-to-Start dependencies
    useBryntumThemeAssets.ts
  utils/
    calculatePopoverPlacement.ts
```

Follow this sub-structure if adding more Gantt-related code. Do not add Gantt logic to other `components/` folders.

**IMPORTANT: Always consult the Bryntum Gantt documentation before making any changes to Gantt-related code.** Bryntum has many non-obvious internal behaviors (e.g. parent task duration being auto-calculated and non-editable by default, event firing order, scheduling engine quirks) that are not apparent from the config alone. The docs and support forum are the authoritative source:
- API docs: https://bryntum.com/products/gantt/docs/api/
- Forum: https://forum.bryntum.com/
- Support issues: https://github.com/bryntum/support/issues

### Project start date = the scheduling floor

`Project.startDate` (nullable) is sent to Bryntum as the project's start date (`gantt.ts` load route, only when set). In Bryntum, **the project start date is the lower scheduling boundary** for auto-scheduled tasks — bars cannot be dragged earlier than it. When it's null, Bryntum derives the floor from the **earliest task**, which is why bars "snapped back" before this field existed.

The field is editable in two places, both writing through the same `project.update` mutation (gated by `canManageProjects`): the **Settings** page and the **`ProjectStartCard`** banner above the Gantt toolbar. `project.update` rejects a start date later than the earliest task (it would shove earlier tasks forward). The Gantt project config sets **`autoSetConstraints: true`** so that lowering the start date pins each task at its own date (implicit `startnoearlier` constraint) instead of collapsing unconstrained tasks onto the new floor. After a successful save the card sets `gantt.project.startDate` on the live instance so the floor moves without a page reload. The wire format is a `yyyy-MM-dd` string (or `""`/null to clear); the mutation parses it to a `Date`.

---

## Tight Typography & Spacing (Sidebar Density Pattern)

The sidebar, mobile drawer, and project tree use a deliberate **compact density** that differs from MUI's loose defaults. Apply these exact values whenever building sidebar-style navigation, trees, or any panel that needs to show a lot of content without scrolling.

### Typography scale

| Role | `fontSize` | `fontWeight` | Notes |
|---|---|---|---|
| Section label (ALL CAPS) | `0.5625rem` (9px) | 600 | `letterSpacing: '0.12em'`, `textTransform: 'uppercase'`, `userSelect: 'none'` |
| Nav item / tree item | `0.8125rem` (13px) | 400–500 | Active items: `fontWeight: 550`, `letterSpacing: '-0.005em'` |
| Secondary / meta text | `0.6875rem` (11px) | 400–500 | Task counts, email, status labels |
| Document filename | `0.75rem`–`0.8rem` | 400 | Always truncate — see text overflow rule below |

Always set `lineHeight` explicitly — MUI's default (1.5) is too loose:
- Single-line rows: `lineHeight: 1`
- Stacked name + secondary (e.g. user profile): `lineHeight: 1.2`

### Spacing

```tsx
// Nav item row
sx={{ px: 1.25, py: 0.875, borderRadius: '8px' }}  // 10px / 7px

// Tree item label Box (the inner label wrapper)
sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.375 }}  // 3px vertical

// Gap between sibling nav rows
gap: '1px'

// Icon-to-label gap
gap: 1       // 8px — tree items
gap: 1.25    // 10px — sidebar nav items
```

### Icons

**Always use Phosphor (`@phosphor-icons/react`) over Lucide.** Phosphor is the project's primary icon library.

| Context | Size | Notes |
|---|---|---|
| Sidebar nav | `size={17}` | `weight={isActive ? 'fill' : 'regular'}` |
| Header site-conditions chip (weather + site date/time) | `size={10}`–`size={13}` | `weight="bold"` |
| Tree folders / tasks | `size={14}` | |
| Tree documents | `size={12}` | |
| Utility (refresh, add) | `size={14}` | `weight="bold"` for action buttons |
| Chevrons / small indicators | `size={13}` | |
| Notification bell | `size={18}` | `weight="regular"` |

### Active-state indicator (left bar)

```tsx
<Box sx={{
  position: 'absolute',
  left: 0,
  top: '50%',
  transform: 'translateY(-50%)',
  width: '2.5px',
  height: 16,
  borderRadius: '0 2px 2px 0',
  bgcolor: 'sidebar.indicator',
}} />
```

### Key rules

- **Never rely on MUI's default `minHeight`** on `ListItem` / `MenuItem` — it adds ~48px. Override explicitly or avoid those components in favour of plain `Box` rows.
- **Set `lineHeight` every time.** Omitting it inherits 1.5 from the theme and breaks compact rows.
- **Truncate long text** — always add `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, `whiteSpace: 'nowrap'` on the text `Box`, and `minWidth: 0` on its flex parent so it can actually shrink.
- **`borderRadius: '8px'`** on all interactive row backgrounds for consistency (avatars use `10px`).
- **`userSelect: 'none'`** on non-interactive labels (section headers, group names).

### Reference implementations

- `src/components/layout/Sidebar.tsx` — nav items, section labels, user profile footer
- `src/components/layout/MobileDrawer.tsx` — identical density at 300px width
- `src/components/projects/ProjectsTree.tsx` — MUI `SimpleTreeView` with compact `TreeItem` labels

---

## Adding a New Feature Slice

1. Create `src/components/<feature>/` directory.
2. Use PascalCase filenames matching exported component names.
3. Add `'use client'` only where needed — split into server/client parts if a component is mostly static.
4. Define Zod schema in `src/lib/validations/<feature>.ts` before building forms.
5. Add tRPC router in `src/server/routers/<feature>.ts` and register in `src/server/root.ts`.
6. Update `claudedocs/codebase-overview.md` if the new slice changes the directory structure.
