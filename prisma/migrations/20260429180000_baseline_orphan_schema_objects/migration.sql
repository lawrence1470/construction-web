-- Baseline migration: align _prisma_migrations history with schema.prisma + DB state
-- after schema changes were applied via `db push` instead of `prisma migrate dev`.
--
-- Every statement is idempotent so this migration is safe on every environment:
--   - Local DBs that already received these objects via past db push (the common case)
--   - Fresh DBs (recreates the orphan objects from scratch)
--   - Neon preview/production DBs (whether already drifted or clean)
--
-- See claudedocs/database-migrations.md for guidance on avoiding drift in the future.

-- 1. WaitlistEntry: model exists in schema.prisma but no prior migration created it.
CREATE TABLE IF NOT EXISTS "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
CREATE INDEX IF NOT EXISTS "WaitlistEntry_email_idx" ON "WaitlistEntry"("email");

-- 2. GanttTask: nullable INT columns added to schema.prisma without a migration.
ALTER TABLE "GanttTask" ADD COLUMN IF NOT EXISTS "requiredSubmittals" INTEGER;
ALTER TABLE "GanttTask" ADD COLUMN IF NOT EXISTS "requiredInspections" INTEGER;

-- 3. GanttTask.updatedAt: schema is `@updatedAt` (no SQL default needed); some
-- environments still carry a legacy DEFAULT from an earlier migration. DROP DEFAULT
-- is a no-op when no default exists, so this is safe everywhere.
ALTER TABLE "GanttTask" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- 4. Drop orphan trigram index. Created by 20260223000000_add_trigram_and_vector_search,
-- intentionally dropped by 20260223222302_add_project_member_table, but reappeared in
-- some local DBs via db push. No code uses trigram similarity on Document.name —
-- the GIN index on Document.searchVector covers all hybrid-search needs.
DROP INDEX IF EXISTS "Document_name_trgm_idx";
