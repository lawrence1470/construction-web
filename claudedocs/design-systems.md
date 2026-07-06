# Design Systems

This project runs **two independent design systems**. They share the same Next.js app and globals.css file, but they do not share tokens, fonts (in practice), or styling patterns. Treat them as separate concerns.

---

## 1. Marketing Design System

**Scope**: the public-facing landing page at `src/app/page.tsx` and any other unauthenticated marketing surface.

**Aesthetic**: glass/gradient hero, serif display type (Instrument Serif, Playfair), soft blues, large imagery. Bespoke, hand-crafted, "visit our site" feel.

**Where it lives**:
- `src/app/page.tsx` — uses a **local** `const t = { bg, fg, accent, ... }` token object and inline `style={{}}` props. Does NOT consume the MUI theme.
- `src/styles/globals.css` — `--lp-*` variable block (landing-page tokens: `--lp-bg`, `--lp-fg`, `--lp-glass`, `--lp-cta`, etc.).
- Fonts: Geist, Instrument Serif, Playfair Display, Inter — loaded in root `src/app/layout.tsx` and referenced via their CSS variables.

**Rules**:
- Marketing code is styled with inline `style={{}}` and `--lp-*` CSS vars — **not** with MUI `sx`, **not** with the `lightTheme` palette.
- Do not import from `@/theme/theme` inside marketing pages.
- Do not use `components-guide.md` tightness/density conventions here — marketing is deliberately spacious.

---

## 2. App Design System

**Scope**: everything behind auth — `src/app/(app)/**` — the product UI (dashboard, projects, Gantt, documents, team, settings).

**Aesthetic**: data-dense, compact, utilitarian. Construction PM tool. Tight typography (9–13px), thin borders, light surfaces, navy primary (`#2B2D42`). See `claudedocs/components-guide.md` for density rules.

**Where it lives**:
- `src/theme/theme.ts` — MUI `lightTheme` and `darkTheme` with palette, typography, and custom tokens (`palette.sidebar`, `palette.status`, `palette.accent`, `palette.timeline`, `palette.docExplorer`, etc.). Both themes share the same typography scale.
- `src/styles/globals.css` — all non-`--lp-*` variables: `--bg-*`, `--text-*`, `--border-*`, `--accent-primary`, `--sidebar-*`, `--status-*`, `--radius-*`, `--grid-*`, `--timeline-*`, `--gantt-*`. Dark values live in a `[data-theme="dark"] { ... }` block below the `:root` defaults.
- `src/components/providers/ThemeRegistry.tsx` — wraps the app tree with `<ThemeProvider>`, owns the light/dark mode state, and exposes `useThemeMode()`. An inline script in `src/app/layout.tsx` sets `data-theme` on `<html>` before hydration to avoid FOUC.
- Fonts: primary body is Geist Sans (`var(--font-geist-sans)`) via `theme.typography.fontFamily`; JetBrains Mono is loaded and reserved for code/tabular/technical labels.

**Dark mode boundary**: dark CSS variables only override the app tokens. The `--lp-*` block is NOT overridden, so the landing page stays light regardless of user preference. Theme mode lives in `localStorage` under the key `theme-mode`; initial mode follows `prefers-color-scheme` when no stored preference exists.

**Bryntum Gantt dark mode**: the Gantt chart uses Bryntum's pre-built `stockholm-dark` theme, loaded on demand via `useBryntumThemeAssets.ts`. The light theme (`@bryntum/gantt/gantt.css`) is statically bundled and always present. When the user toggles dark mode, the hook injects `<link href="/bryntum/stockholm-dark.css">` into `<head>` so its rules override the bundled light theme (source order wins on equal specificity). Switching back to light removes the link. The dark CSS is copied from `node_modules/@bryntum/gantt/stockholm-dark.css` to `public/bryntum/` by `scripts/sync-bryntum-theme.mjs`, which runs as part of the npm `postinstall` hook — keep the script in the postinstall chain when editing `package.json`. Our custom `--gantt-*` CSS variables layered on top of Bryntum's theme also have dark-mode overrides in the `[data-theme="dark"]` block of `globals.css`.

**Rules**:
- App components style with MUI `sx` + theme tokens (`theme.palette.sidebar.background`, `theme.palette.primary.main`, etc.).
- For raw CSS, use the `--*` vars from `globals.css` (non-`--lp-*` block).
- Follow `components-guide.md` for density, icon sizing, typography scale, and active-state patterns.
- Bryntum Gantt themes read `--gantt-*` tokens from `globals.css` — treat those as part of the app system.

---

## 3. Boundary Rules

**Never cross-pollinate tokens.** A change to one system must not leak into the other.

| File / Surface | Marketing | App | Notes |
|---|---|---|---|
| `src/app/page.tsx` | ✅ | — | Landing only; local `t` tokens + inline styles. |
| `src/app/(app)/**` | — | ✅ | Authenticated product UI. |
| `src/app/(auth)/**` (sign-in, sign-up, reset) | — | ✅ | Entry to the app — styled with the app system, not marketing. |
| `src/theme/theme.ts` | — | ✅ | App MUI theme; marketing ignores it. |
| `src/styles/globals.css` — `--lp-*` block | ✅ | — | Marketing-only tokens. Do not reference from app code. |
| `src/styles/globals.css` — non-`--lp-*` block (`--bg-*`, `--text-*`, `--accent-primary`, `--sidebar-*`, `--status-*`, `--radius-*`, `--grid-*`, `--timeline-*`, `--gantt-*`) | — | ✅ | App tokens. Do not reference from marketing code. |
| `src/app/layout.tsx` (root) | ✅ | ✅ | Loads all fonts globally so each side can reference what it needs. Do not remove a font just because one side stops using it. |
| `src/components/ui/Logo.tsx` | ✅ | ✅ | Shared component. If rebranding, treat as a cross-cutting change that affects both systems. |

---

## 4. Common Pitfalls to Avoid

- **Don't apply the app's MUI theme to marketing.** The landing page is intentionally *not* wrapped in anything that would impose `lightTheme` — keep it that way.
- **Don't add `--lp-*` variables to app components**, and don't add app tokens to the landing page's inline `t` object.
- **Don't delete fonts from root `layout.tsx`** just because one system doesn't use them — both systems share the same `<html>` element and the unused-by-you side may still need them.
- **When the app design system changes**, do not "sync" the marketing page to match. Marketing has its own aesthetic by design.
- **When updating `globals.css`**, scope edits carefully — the file contains both systems' tokens, so misreading a variable name can cross the boundary.

---

## 5. Theme Parity Rules (Light ↔ Dark)

Every UI surface in the app design system must work in both light and dark modes. These rules exist because hardcoded color literals look fine in one mode and break in the other — and TypeScript can't catch it.

### Rule 1 — Every role-color must flow through a theme-aware token

**Role-colors** = text, background, surface, border, divider, hover, selected, action, primary, error, warning, success, info. These MUST resolve to different values in light and dark.

✅ **Do:**
```tsx
sx={{ bgcolor: 'background.paper', color: 'text.primary', borderColor: 'divider' }}
sx={{ bgcolor: 'action.hover' }}      // subtle tint, flips per mode
sx={{ bgcolor: 'action.selected' }}   // stronger tint, flips per mode
style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
```

❌ **Don't:**
```tsx
sx={{ bgcolor: 'rgba(0,0,0,0.04)' }}  // invisible in dark
sx={{ color: '#171717' }}              // dark text on dark bg
sx={{ borderColor: '#e5e5e5' }}        // specific light-mode value
```

### Rule 2 — Contrast text must flip with its background

When a background token flips with the theme (e.g. `--accent-primary` is dark navy in light, near-white in dark), the text that sits *on* that background must flip too. Pair them.

✅ **Do:**
```tsx
sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
style={{ background: 'var(--accent-primary)', color: 'var(--accent-contrast)' }}
```

❌ **Don't:**
```tsx
sx={{ bgcolor: 'var(--accent-primary)', color: '#fff' }}  // white on white in dark mode
sx={{ bgcolor: 'primary.main', color: '#fff' }}           // ignores primary.contrastText
```

### Rule 3 — Semantic colors are allowed hardcoded, but must be tested in both modes

Status colors (success green, warning amber, error red, info blue) carry *meaning* and their identity matters — red should stay red across modes. These may use literal values. However:

- They must have **sufficient contrast** against both `background.default` and `background.paper` in both modes.
- Pill/badge backgrounds built from status colors (`rgba(34,197,94,0.15)` etc.) MUST have dark-mode mirrors. See `palette.status.activeBg`/`activeText` etc. in `theme.ts`.

### Rule 4 — Image overlays and scrims may use literal rgba

Intentional dark overlays on top of images (photo scrims, hover overlays, modal backdrops) stay hardcoded because the surface *below* them is always an image, not a theme surface. Safe cases:

- `AvatarUploader` hover overlay — over user photo
- `CoverImageBanner` gradient — over project cover image
- `image-dropzone` overlay — over image preview
- `DocumentCardGallery` top/bottom gradients — over document thumbnail
- `loading-spinner` backdrop — intentional modal scrim
- `UploadOverlay` — already theme-aware via `isDark` prop

### Rule 5 — Tint levels: prefer MUI action tokens

For the most common "slightly darker / slightly lighter than the surface" needs, use MUI's theme action tokens. They auto-flip.

| Intent | Use | Light value | Dark value |
|---|---|---|---|
| Hover background | `action.hover` | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.04)` |
| Selected / pressed | `action.selected` | `rgba(43,45,66,0.08)` | `rgba(255,255,255,0.06)` |
| Focus ring tint | `action.focus` (default) | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.12)` |
| Disabled surface | `action.disabledBackground` | `#e6e6e6` | `rgba(255,255,255,0.08)` |

### Rule 6 — Shadows: acceptable as-is, but understand the degradation

`boxShadow: '0 1px 3px rgba(0,0,0,0.04)'` and similar micro-shadows **do not flip** automatically. On dark backgrounds they become nearly invisible. This is not a readability bug — it's aesthetic drift. If a card's elevation is part of its identity, replace with a theme-aware shadow using `theme.shadows[N]` or a CSS var. Otherwise leave.

### Rule 7 — Icons inside buttons: set `color` on the button, not the icon

Phosphor icons default to `color="currentColor"` — they inherit the CSS `color` of the nearest ancestor. Native `<button>` elements have a *browser default* text color (system-dependent, usually a dark gray) that wins unless you override it. When a button has `bgcolor: 'transparent'` and no `color` set, the icon inside picks up that default and becomes invisible in dark mode.

✅ **Do** — set `color` on the button so both icon (via `currentColor`) and text (via inheritance) flow from one source:
```tsx
<Box component="button" sx={{ bgcolor: 'transparent', color: 'text.primary' }}>
  <SomeIcon size={14} />
  <Typography sx={{ color: 'inherit' }}>Label</Typography>
</Box>
```

❌ **Don't** — put `color` only on the Typography and leave the icon to inherit whatever:
```tsx
<Box component="button" sx={{ bgcolor: 'transparent' }}>  {/* no color — icon invisible in dark */}
  <SomeIcon size={14} />
  <Typography sx={{ color: 'text.primary' }}>Label</Typography>
</Box>
```

The same applies to any wrapper that styles `button` / `a` / etc. with transparent backgrounds and houses a Phosphor icon. The fix is always: hoist `color` up to the interactive wrapper.

### Rule 7b — How to verify a component in both modes

Before landing any change that touches color/surface/text:

1. Toggle dark mode from the sidebar profile menu.
2. Inspect the component in both modes with the Chrome devtools "elements" panel — ensure visible contrast against its parent surface.
3. If you wrote a new hardcoded literal, ask: *does this value represent a role (bg/text/border) or is it intentionally fixed (status, image overlay)?*
4. Role → must use a theme token. Fixed → OK, but verify contrast in both modes.

### Rule 8 — Contrast thresholds (WCAG)

Target WCAG AA: **4.5:1** for normal text, **3:1** for large/UI text. The theme is designed so that `text.primary` and `text.secondary` both pass on `background.default` and `background.paper` in both modes. If you introduce a new text color or new bg, verify the pair.

**Known-passing pairs** (don't break these):
| Text | Surface | Light | Dark |
|---|---|---|---|
| `text.primary` | `background.default` | ~15:1 | ~16:1 |
| `text.primary` | `background.paper` | ~15:1 | ~14:1 |
| `text.secondary` | `background.default` | ~4.3:1 | ~5.0:1 |
| `text.secondary` | `background.paper` | ~4.0:1 | ~4.5:1 |
| `text.disabled` | `background.default` | ~5.3:1 | ~2.8:1 (disabled exempt) |

**Why `text.secondary` differs per mode**: Linear's `#8a8f98` works on near-black (~5:1) but fails WCAG AA on light (~2.9:1). We use `#6b7280` in light and `#8a8f98` in dark to maintain AA in both.

**`text.disabled` is non-readable by design** (~2.8:1 in dark). WCAG exempts disabled states. Do not use `text.disabled` for content meant to be read — it's for non-interactive state only.

### Rule 9 — Surface stacking (dark mode)

Dark mode uses a three-tier elevation stack:
| Tier | Token | Value | Purpose |
|---|---|---|---|
| Deepest | `sidebar.background` | `#08090a` | Sidebar, recedes |
| Main | `background.default` | `#0f1011` | Main content area |
| Elevated | `background.paper` / `card.background` | `#191a1b` | Cards, dialogs, dropdowns |

This mirrors light mode where `background.paper` (`#FFFFFF`) sits above `background.default` (`#f7f8f8`), keeping the semantic hierarchy consistent across modes. When adding a new elevation level (e.g. a raised card over a card), either use `action.hover`/`action.selected` for subtle tint or introduce a new token — don't reuse `sidebar.background` for non-sidebar surfaces.

### Rule 10 — Available tokens

**Theme palette (MUI, use in `sx`):**

- `background.default`, `background.paper`, `card.background`
- `text.primary`, `text.secondary`, `text.disabled`
- `divider`, `primary.*` (main/light/dark/contrastText), `secondary.*`, `error.*`, `warning.*`, `success.*`, `info.*`
- `sidebar.{background, border, indicator, activeBg, hoverBg, activeItemBg}`
- `status.{active, inProgress, onHold, completed, archived, activeBg, activeText, inProgressBg, inProgressText}`
- `docExplorer.{destructiveMain, destructiveDark, destructiveLight, linkedGreen, badgeBg, aiPurple}`
- `timeline.{accent, accentSubtle}`, `grid.line`, `warm.{main, dark, contrastText, subtle}` — `warm` is the app's **signature amber accent** (active nav indicator, progress fills, live/attention states; NOT button fills — contained amber + white text fails AA)
- `action.{hover, selected, focus, disabled, disabledBackground}`

**CSS variables (use in inline `style`, raw CSS, template-literal styles):**
- `--bg-primary`, `--bg-secondary`, `--bg-sidebar`, `--bg-card`, `--bg-input`, `--bg-hover`, `--bg-accent`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-color`, `--border-light`, `--accent-primary`, `--accent-subtle`, `--accent-contrast`
- `--sidebar-*`, `--status-*`, `--gantt-*`, `--timeline-*`, `--grid-line`, `--radius-*`, `--focus-ring`
- `--accent-warm`, `--accent-warm-hover`, `--accent-warm-contrast`, `--accent-warm-subtle` — signature amber accent (has dark-mode overrides)
- `--shadow-card`, `--shadow-card-hover` — card elevation scale (dark values are stronger since shadows barely read on near-black); pair with a `translateY(-1px)` hover lift gated behind `prefers-reduced-motion`
- `.stagger-in` utility class (globals.css) — direct children cascade in with capped nth-child delays; reduced-motion safe

All of these flip when the user toggles dark mode. Do not hardcode a value when a token exists for it.

---

## 6. When to Update This File

Update this doc when:
- The boundary between marketing and app changes (e.g. a new route group, a shared component moves).
- A new independent design system is added (e.g. a dedicated admin or embed surface).
- The list of tokens/files owned by either system shifts.

Do NOT update this file for:
- Token value tweaks within a single system (those belong in `components-guide.md` or inline).
- One-off color changes.
