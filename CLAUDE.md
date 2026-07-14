# Project Notes

## Codebase Reference
@claudedocs/environment-setup.md
@claudedocs/database-migrations.md
@claudedocs/auth-and-permissions.md
@claudedocs/architecture-and-typescript.md
@claudedocs/testing-guide.md
@claudedocs/components-guide.md
@claudedocs/embeddings.md
@claudedocs/trpc-guide.md
@claudedocs/vercel.md
@claudedocs/csi-codes.md
@claudedocs/design-systems.md
@claudedocs/release-workflow.md

## Documentation Update Rules
When making changes that affect these docs, update them in the same task:
- New/modified env vars → update `claudedocs/environment-setup.md`
- Schema changes, migrations, drift recovery, raw SQL patterns → update `claudedocs/database-migrations.md`
- Auth, roles, permissions, or middleware changes → update `claudedocs/auth-and-permissions.md`
- Architecture or TypeScript pattern changes → update `claudedocs/architecture-and-typescript.md`
- New tests added or test patterns change → update `claudedocs/testing-guide.md`
- New components, naming/styling changes, or new feature slices → update `claudedocs/components-guide.md`
- tRPC routers, procedures, or data-fetching pattern changes → update `claudedocs/trpc-guide.md`
- Vercel env vars, deployments, or project config changes → update `claudedocs/vercel.md`
- CSI code list changes, data sources, or selector behavior → update `claudedocs/csi-codes.md`
- Boundary between marketing and app design systems (new shared files, new route groups, new independent surfaces, changes to `--lp-*` vs app token ownership) → update `claudedocs/design-systems.md`
- Branch model, the `preview` → `main` promotion process, or how production/preview databases relate → update `claudedocs/release-workflow.md`

## Vercel
- See `claudedocs/vercel.md` for full Vercel configuration reference
- Team: CELN (`celn`) — always use `--scope celn` with Vercel CLI
- Production URL: https://celn.app
- Staging URL: https://preview.celn.app

## Behavioral Guidelines

Reduce common LLM coding mistakes. Bias toward caution over speed — use judgment for trivial tasks.

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
