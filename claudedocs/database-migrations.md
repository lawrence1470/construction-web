# Database Migrations

How to evolve the database schema in this project without causing drift. Read this before running any Prisma CLI command that touches the database.

This project has been bitten by drift before — that's why this document exists. The cleanup migration `prisma/migrations/20260429180000_baseline_orphan_schema_objects/` was created to recover from a `db push` that left `WaitlistEntry`, `GanttTask.requiredSubmittals`, `GanttTask.requiredInspections`, and an orphan trigram index out of migration history. The rules below are how we don't do that again.

---

## Golden Rules

1. **`prisma migrate dev` is the only way to change the schema.** Never `prisma db push`.
2. **Migration files in `prisma/migrations/` are the source of truth.** The local DB, Neon preview, and Neon production all derive from those files. If a change isn't in a file, it isn't real.
3. **Never edit an applied migration.** Once a migration has been deployed anywhere (local, preview, prod), it is immutable. To change something, write a new migration.
4. **Never delete an applied migration file.** The `_prisma_migrations` table on every environment that ran it will be out of sync with the directory and you'll spend an afternoon recovering.
5. **Raw SQL goes in migrations, not in `schema.prisma`.** Generated columns, GIN/GIST indexes, custom Postgres functions, extensions, and triggers can't be expressed in `schema.prisma`. Add them to a migration via `--create-only` (see below).
6. **Commit the migration file in the same PR as the `schema.prisma` change.** A schema change without a migration file is the textbook recipe for the drift this project just recovered from.

---

## The Three Commands

| Command | When to use | What it does | What it doesn't do |
|---|---|---|---|
| `prisma migrate dev` | **Development only.** When you change `schema.prisma` and want a migration file. | Creates a new migration file from the schema diff, applies it to the local DB, regenerates Prisma Client. Uses a shadow database to detect drift and evaluate data loss. | Never run in CI or production — it can prompt to reset the DB. |
| `prisma migrate deploy` | **CI / preview / production.** Run by Vercel on every deploy via `npm run db:migrate`. Also run on every Conductor workspace start by `conductor.json` so a fresh workspace can never start with unapplied migrations. | Applies pending migrations in order. Idempotent — already-applied ones are skipped. | Does **not** detect drift, does **not** use the shadow DB, does **not** generate the Prisma Client (we run `prisma generate` separately in the build script). |
| `prisma db push` | **Never in this project.** | Mutates the DB directly to match `schema.prisma` with no migration file. | Does not record what changed. Re-runs lose data on column renames. Mixes badly with a project that has migration history (this is exactly what caused our orphan-schema drift). |

The official Prisma guidance is unambiguous: `db push` is for "prototyping" only and "Avoid `migrate dev` and `db push` in production as they can be destructive or lead to a migrationless workflow." ([Prisma docs: Migration strategies](https://www.prisma.io/docs/orm/more/best-practices)). Once a project commits its first migration file, `db push` becomes hostile to the migration history.

---

## Standard Workflow: Schema Change

Use this for any change you can express in `schema.prisma` (adding/removing fields, indexes, relations, models).

```bash
# 1. Make sure you're up to date and applied
git pull
npx prisma migrate status         # should say "Database schema is up to date"

# 2. Edit prisma/schema.prisma

# 3. Generate the migration. Pick a descriptive snake_case name.
npx prisma migrate dev --name add_document_review_status

# 4. Inspect the generated SQL before committing — Prisma sometimes generates
#    expensive operations (full-table rewrites, locking index creates) you'll
#    want to know about.
cat prisma/migrations/<timestamp>_add_document_review_status/migration.sql

# 5. Commit the migration file AND the schema change together
git add prisma/schema.prisma prisma/migrations/<timestamp>_add_document_review_status/
git commit -m "Add document review status"

# 6. Restart the dev server so it picks up the regenerated Prisma Client
#    (HMR doesn't re-import @prisma/client)
```

`prisma migrate dev` writes the SQL to a new directory under `prisma/migrations/`, applies it to the local DB, regenerates the Prisma Client, and inserts a row into `_prisma_migrations`. ([Prisma docs: Mental model](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/mental-model))

---

## Raw SQL Workflow

Use this when the change can't be expressed in `schema.prisma`. Examples in this project:

| Migration | What it adds in raw SQL | Why |
|---|---|---|
| `20260221200655_add_document_search` | `Document.searchVector tsvector GENERATED ALWAYS AS (...)` | Prisma can't express generated columns. |
| `20260223000000_add_trigram_and_vector_search` | `CREATE EXTENSION pg_trgm`, `CREATE EXTENSION vector`, GIN indexes | Extensions and GIN indexes aren't `schema.prisma` constructs. |
| `20260224000000_openai_embeddings_1536` | `Document.embedding vector(1536)` | pgvector types via `Unsupported("vector(1536)")` in schema, but the column type itself goes in raw SQL. |
| `20260405000000_hybrid_search` | `CREATE FUNCTION hybrid_document_search(...)` | Custom Postgres function for hybrid search. |
| `20260429180000_baseline_orphan_schema_objects` | `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP INDEX IF EXISTS` | Idempotent baseline to recover from past `db push` drift. |

**Workflow:**

```bash
# 1. Generate an empty migration file. This stages a directory but does NOT apply it.
npx prisma migrate dev --name add_my_function --create-only

# 2. Edit prisma/migrations/<timestamp>_add_my_function/migration.sql to add raw SQL.
#    If schema.prisma also changed, the auto-generated SQL is already in the file —
#    add your raw SQL alongside it.

# 3. Apply it.
npx prisma migrate dev
```

The `--create-only` flag is the official escape hatch for raw SQL. ([Prisma docs: Postgres extensions](https://www.prisma.io/docs/postgres/database/postgres-extensions))

### Idempotent SQL guards

For migrations that may run on environments in slightly different states (true of any baseline or recovery migration), use Postgres's idempotent forms:

```sql
CREATE TABLE IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
CREATE EXTENSION IF NOT EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
DROP INDEX IF EXISTS ...
DROP TABLE IF EXISTS ...
```

These are standard Postgres syntax and the official docs use them directly (e.g. `CREATE EXTENSION IF NOT EXISTS "postgis";`).

For normal forward-evolution migrations from `migrate dev`, the auto-generated SQL is **not** idempotent — it assumes a known starting state. That's correct: every environment runs the migrations in the same order, so each one starts from a deterministic state. Don't sprinkle `IF NOT EXISTS` on every routine migration.

---

## Drift Detection and Recovery

### What "drift" means here

Drift is any disagreement between three things that should always agree:

1. `prisma/migrations/` directory on disk
2. The `_prisma_migrations` table in the database
3. The actual schema of the database (tables, columns, indexes, etc.)

If anyone has ever run `db push` against a DB that also receives migrations, those three diverge. You won't notice immediately because Prisma Client doesn't re-validate the DB schema at runtime — it trusts what `schema.prisma` says. The pain shows up when the next person runs `prisma migrate dev` and it refuses to proceed.

### Detect drift

```bash
# Compares prisma/migrations/ ↔ _prisma_migrations table.
# Reports unapplied or missing migrations. Does NOT compare DB schema to schema.prisma.
npx prisma migrate status

# Compares migration history (what files would produce on a fresh DB) ↔ live DB.
# Returns SQL representing the actual drift. Empty output means clean.
# Requires a shadow DB.
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-url "$POSTGRES_PRISMA_URL" \
  --shadow-database-url "postgresql://construction:construction@localhost:5432/construction_shadow" \
  --script
```

`migrate status` and `migrate diff` answer different questions. `status` checks whether all migration files have been applied. `diff` checks whether applying all the migration files to a clean DB would produce the same schema as your live DB. **The drift this project hit was invisible to `status` and only visible to `diff`** — `_prisma_migrations` had every file applied, but the DB had extra objects from past `db push`.

### Fix drift

| Drift type | Fix |
|---|---|
| Migration file exists, not applied to DB | `npx prisma migrate deploy` |
| Migration applied to DB, file deleted (someone removed an applied migration) | Restore the file from git history. If the file is truly gone, `prisma migrate resolve --rolled-back <name>` then write a new migration. **Never recover by deleting the row from `_prisma_migrations`.** |
| Object in DB that no migration creates (the case this project hit) | Write an idempotent baseline migration that creates the object with `IF NOT EXISTS`. See `prisma/migrations/20260429180000_baseline_orphan_schema_objects/migration.sql` as the canonical example. |
| Drift on local only (multiple workspaces share `construction-postgres`) and you have no important local data | `docker volume rm construction-pgdata`, restart the container, `npx prisma migrate deploy`. Nuclear option but legitimate. |

`prisma migrate resolve --applied <name>` only inserts a row in `_prisma_migrations` — it does not run the SQL. Use it when you've already applied a migration manually and want Prisma to know. ([Prisma docs: From Drizzle](https://www.prisma.io/docs/guides/switch-to-prisma-orm/from-drizzle))

### When `migrate dev` says "drift detected"

If you change `schema.prisma` and run `migrate dev` and Prisma says drift was detected and offers to reset the DB:

1. **Don't accept the reset reflexively.** It deletes all local data including across every Conductor workspace sharing this DB.
2. Run `prisma migrate diff --from-migrations ... --to-url ...` to see the actual drift SQL.
3. If the drift is benign (orphan objects from a past `db push`), write an idempotent baseline migration like `20260429180000_baseline_orphan_schema_objects` that captures the orphan objects. Apply it with `migrate deploy`. Now the DB and migration history agree.
4. Only then re-run `migrate dev` for your actual schema change.

---

## Conductor Workspaces (Local Development)

A single Docker container `construction-postgres` is shared across every Conductor workspace. The migration files in `prisma/migrations/` are per-branch (per-worktree), but the DB is one shared mutable object. Two consequences:

- **A migration applied in workspace A is permanent for workspace B.** When workspace B checks out a branch that doesn't have that migration file, `prisma migrate status` will report drift (file missing, row in `_prisma_migrations` exists). It still runs, just with a warning.
- **Never delete a migration file after it has been applied to the shared DB.** The orphan row in `_prisma_migrations` will haunt every other workspace. If the change needs to be undone, write a forward migration that reverses it.

`conductor.json`'s `run` script applies `prisma migrate deploy && prisma generate` on every workspace start. The common path (pull, switch workspace, restart) self-heals. The two rules above cover what self-heal can't.

---

## Production Deployment (Vercel + Neon)

`vercel.json`'s `buildCommand` is:

```
npx prisma migrate deploy && npx prisma generate && npx next build
```

Every Vercel deploy applies pending migrations against that environment's Neon DB before the Next.js build runs. Database branching is handled by the Vercel-Neon integration:

- **Production deploys** target the `main` Neon branch.
- **Preview deploys** target an auto-created `preview/...` Neon branch forked from `main` at deploy time.

`migrate deploy` does not detect drift, does not reset, and does not use a shadow DB. ([Prisma docs: CLI reference](https://www.prisma.io/docs/orm/reference/prisma-cli-reference)) That's intentional — production deploys must be deterministic and never destructive. The corollary is that any drift introduced into a production DB by hand will not be auto-corrected by deploys; it has to be addressed with a baseline migration.

### Long-running migrations and backfills

If a migration is going to take more than a few seconds (large table rewrites, index builds on millions of rows), it shouldn't run inside the build. Options:

- **Two-phase additive change.** Add a nullable column in one migration. Backfill via a separate one-off script run out of band. Add the `NOT NULL` constraint in a later migration.
- **`CREATE INDEX CONCURRENTLY`** for indexes on hot tables (does not block writes; cannot run inside a transaction — Prisma migrations run each statement in autocommit mode by default but verify if you depend on this).

We haven't hit this problem yet at our scale, but if you write a migration that touches every row in `Document` or `GanttTask`, plan for it.

---

## Common Pitfalls (Real-World)

| Pitfall | Why it bites | Fix |
|---|---|---|
| Editing an applied migration | Other environments already ran the old version. Their `_prisma_migrations` records the old checksum. The next deploy reports drift. | Write a new migration with the correction. The old one stays as-is forever. |
| `db push` "just to test something" | Side effects survive the test. Future `migrate dev` runs see drift. | Use `--create-only` and discard the file if you don't want to keep the change. |
| Deleting a migration file because "it didn't work" | If it was applied anywhere, `_prisma_migrations` keeps the row. Restoring later is messy. | Write a reversal migration. |
| Schema change in PR without a migration file | Reviewer can't tell what SQL will run on prod. Often means `db push` was used. | PR checklist (see `claudedocs/vercel.md`) catches this; CI should too. |
| Adding `NOT NULL` to existing column | Migration fails on populated tables. | Two-phase: add nullable column, backfill data, add constraint. |
| Forgetting the shadow DB exists during `migrate dev` | First-run on a new machine fails with "shadow database does not exist." | Either let Prisma manage it (default) or pre-create `<dbname>_shadow` and pass `shadowDatabaseUrl`. We don't currently configure one for `migrate dev`. |
| Running `migrate dev` on production by accident | Prompts to reset the production DB. | Never run `migrate dev` outside of local. CI should only ever run `migrate deploy`. |

---

## Quick Reference Card

```bash
# Adding a schema change (the 99% case)
npx prisma migrate dev --name <descriptive_name>

# Adding raw SQL (extensions, generated columns, custom functions, GIN indexes)
npx prisma migrate dev --name <descriptive_name> --create-only
# ... edit migration.sql ...
npx prisma migrate dev

# Check if local DB matches migration files
npx prisma migrate status

# Check if live DB schema actually matches what migrations would produce
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-url "$POSTGRES_PRISMA_URL" \
  --shadow-database-url "postgresql://construction:construction@localhost:5432/construction_shadow" \
  --script
# (create the shadow DB once: docker exec construction-postgres psql -U construction -d postgres -c "CREATE DATABASE construction_shadow")

# Inspect what's actually in the DB
npx prisma studio

# Mark a manually-run migration as applied (for baselines)
npx prisma migrate resolve --applied <migration_name>

# Apply pending migrations (CI, restart, fresh workspace)
npx prisma migrate deploy
```

**Forbidden in this project:**

```bash
npx prisma db push          # ← do not run, ever
```

---

## Further Reading

- [Prisma Migrate mental model](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/mental-model)
- [Shadow database](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database)
- [CLI reference: migrate dev / deploy / status / diff / resolve](https://www.prisma.io/docs/orm/reference/prisma-cli-reference)
- [Best practices: deployment & migration strategies](https://www.prisma.io/docs/orm/more/best-practices)
- [Postgres extensions in Prisma migrations](https://www.prisma.io/docs/postgres/database/postgres-extensions)
