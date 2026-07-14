// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the tRPC module so procedures become passthrough chains exposing `_handler`.
// IMPORTANT: `.query()` / `.mutation()` must return a NEW object so that routers
// with many procedures (like ganttRouter) don't share a single mutated chain.
vi.mock("@/server/api/trpc", () => {
  const buildChain = () => {
    const chain: Record<string, unknown> = {
      input: (schema: unknown) => {
        chain._schema = schema;
        return chain;
      },
      query: (handler: unknown) => ({ _handler: handler, _schema: chain._schema }),
      mutation: (handler: unknown) => ({ _handler: handler, _schema: chain._schema }),
    };
    return chain;
  };
  return {
    createTRPCRouter: (routes: Record<string, unknown>) => routes,
    protectedProcedure: buildChain(),
    publicProcedure: buildChain(),
    projectProcedure: buildChain(),
    orgProcedure: buildChain(),
  };
});

type Handler = (args: { ctx: ReturnType<typeof makeCtx>; input: unknown }) => Promise<{
  success: boolean;
  tasks: { rows: Array<{ $PhantomId?: string; id: string }> };
}>;

const ORG_ID = "org-1";
const PROJECT_ID = "proj-1";

type MockTx = {
  ganttTask: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  ganttDependency: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  ganttResource: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  ganttAssignment: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  ganttTimeRange: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
};

function makeCtx() {
  const tx: MockTx = {
    ganttTask: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({ id: "real-existing" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      // Empty project by default → no per-parent rows → new tasks start at 0.
      groupBy: vi.fn().mockResolvedValue([]),
    },
    ganttDependency: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ganttResource: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ganttAssignment: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ganttTimeRange: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  return {
    tx,
    db: {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: PROJECT_ID,
          organizationId: ORG_ID,
        }),
      },
      $transaction: vi.fn(async (fn: (tx: MockTx) => Promise<unknown>) => fn(tx)),
    },
    session: { user: { id: "user-1", email: "u@example.com" } },
    organization: { id: ORG_ID },
    membership: { role: "owner" as const },
    projectMember: { role: "owner" as const },
  };
}

describe("gantt.sync — add task", () => {
  let sync: { _handler: Handler };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/server/api/routers/gantt");
    const router = mod.ganttRouter as unknown as Record<string, typeof sync>;
    sync = router.sync!;
  });

  it("creates a DB row when Bryntum sends a single added task (the toolbar-click case)", async () => {
    const ctx = makeCtx();
    const now = new Date("2026-05-14T00:00:00.000Z");
    const tomorrow = new Date("2026-05-15T00:00:00.000Z");

    const result = await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [
            {
              $PhantomId: "_phant_1",
              name: "New Task",
              startDate: now,
              endDate: tomorrow,
              duration: 1,
            },
          ],
        },
      },
    });

    expect(ctx.tx.ganttTask.create).toHaveBeenCalledTimes(1);

    const createArgs = ctx.tx.ganttTask.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data).toMatchObject({
      projectId: PROJECT_ID,
      name: "New Task",
      duration: 1,
      parentId: null,
    });
    expect(createArgs.data.id).toEqual(expect.any(String));
    expect(createArgs.data.startDate).toEqual(now);
    expect(createArgs.data.endDate).toEqual(tomorrow);

    expect(result.success).toBe(true);
    expect(result.tasks.rows).toHaveLength(1);
    expect(result.tasks.rows[0]).toMatchObject({
      $PhantomId: "_phant_1",
      id: expect.any(String),
    });
    // The real DB ID must NOT equal the phantom ID — that would mean swap failed
    expect(result.tasks.rows[0]!.id).not.toBe("_phant_1");
  });

  it("defaults missing name to 'New Task' (matches handleAddTask omitting fields)", async () => {
    const ctx = makeCtx();

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [{ $PhantomId: "_phant_x" }],
        },
      },
    });

    expect(ctx.tx.ganttTask.create).toHaveBeenCalledTimes(1);
    const createArgs = ctx.tx.ganttTask.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.name).toBe("New Task");
  });

  it("resolves a child's phantom parentId to the parent's real ID within one batch", async () => {
    const ctx = makeCtx();

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [
            { $PhantomId: "_parent", name: "Parent" },
            { $PhantomId: "_child", name: "Child", parentId: "_parent" },
          ],
        },
      },
    });

    expect(ctx.tx.ganttTask.create).toHaveBeenCalledTimes(2);

    // Find the create call that corresponds to the parent (parentId === null)
    // and the one that corresponds to the child (parentId !== null).
    const callsData = ctx.tx.ganttTask.create.mock.calls.map(
      (c) => (c[0] as { data: Record<string, unknown> }).data,
    );
    const parentCall = callsData.find((d) => d.name === "Parent");
    const childCall = callsData.find((d) => d.name === "Child");

    expect(parentCall).toBeDefined();
    expect(childCall).toBeDefined();
    expect(parentCall!.parentId).toBeNull();
    // Child's parentId should equal the parent's real generated ID, NOT the phantom string
    expect(childCall!.parentId).toBe(parentCall!.id);
    expect(childCall!.parentId).not.toBe("_parent");
  });

  // The Bryntum sync contract: every added task that carries $PhantomId MUST get
  // a corresponding row in the response. Without it, Bryntum's afterSyncAttempt
  // throws "Cannot set properties of undefined (setting 'isBeingMaterialized')"
  // and the client-side record stays phantom (silent autosave failure / dupes).
  // This test pins the positive direction of the contract.
  it("returns a tasks.rows entry for every added task that carries $PhantomId", async () => {
    const ctx = makeCtx();

    const result = await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [
            { $PhantomId: "_p1", name: "Task A" },
            { $PhantomId: "_p2", name: "Task B" },
            { $PhantomId: "_p3", name: "Task C" },
          ],
        },
      },
    });

    expect(result.tasks.rows).toHaveLength(3);

    const returnedPhantomIds = result.tasks.rows.map((r) => r.$PhantomId).sort();
    expect(returnedPhantomIds).toEqual(["_p1", "_p2", "_p3"]);

    // Every returned row must have a real DB id distinct from its phantom id
    for (const row of result.tasks.rows) {
      expect(row.id).toEqual(expect.any(String));
      expect(row.id).not.toBe(row.$PhantomId);
    }
  });

  // The contract-violation direction: if an added task arrives without $PhantomId
  // (e.g., reconcileSyncPack regresses), the server warns instead of silently
  // dropping the row — turning an opaque client crash into a visible terminal log.
  it("warns when an added task arrives without $PhantomId (visibility for client regressions)", async () => {
    const ctx = makeCtx();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [{ name: "Phantomless task" }],
        },
      },
    });

    // DB row was still written — the warning is purely informational
    expect(ctx.tx.ganttTask.create).toHaveBeenCalledTimes(1);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Added task without $PhantomId"),
      expect.objectContaining({ name: "Phantomless task" }),
    );

    warnSpy.mockRestore();
  });

  // Regression: Bryntum's CrudManager treats every entry in `tasks.rows` as a
  // phantom→real id swap and dereferences `phantomMap[row.$PhantomId]`. Pushing
  // an "update" row (which has no $PhantomId) into the same array makes
  // afterSyncAttempt throw "Cannot set properties of undefined (setting
  // 'isBeingMaterialized')" the moment a sync contains both adds and updates —
  // which happens every time a subtask is added (parent task gets re-ordered).
  it("does NOT push updated tasks into tasks.rows (only adds with $PhantomId)", async () => {
    const ctx = makeCtx();
    // Mark the updated row as existing so the update mock resolves
    ctx.tx.ganttTask.update.mockResolvedValue({ id: "existing-real-id" });

    const result = await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [{ $PhantomId: "_new1", name: "New task" }],
          updated: [{ id: "existing-real-id", name: "Renamed" }],
        },
      },
    });

    // 1 add → 1 row. The update must NOT contribute a row.
    expect(result.tasks.rows).toHaveLength(1);
    expect(result.tasks.rows[0]!.$PhantomId).toBe("_new1");
    // No entry in rows should be missing $PhantomId — that's the contract.
    for (const row of result.tasks.rows) {
      expect(row.$PhantomId).toBeDefined();
    }
    // Sanity: the update still ran against the DB.
    expect(ctx.tx.ganttTask.update).toHaveBeenCalledTimes(1);
  });

  // Regression for the "rows reshuffle on refresh" bug: Bryntum never sends our
  // custom orderIndex, so added root tasks must be appended after the root
  // group's current max instead of all defaulting to 0 (which makes load
  // ordering a non-deterministic tie). Here the root group already has tasks up
  // to index 4, so the two new root tasks must get 5 and 6 in batch order.
  it("appends new tasks after the existing max orderIndex (no 0-collision)", async () => {
    const ctx = makeCtx();
    ctx.tx.ganttTask.groupBy.mockResolvedValue([
      { parentId: null, _max: { orderIndex: 4 } },
    ]);

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [
            { $PhantomId: "_a", name: "First added" },
            { $PhantomId: "_b", name: "Second added" },
          ],
        },
      },
    });

    const callsData = ctx.tx.ganttTask.create.mock.calls.map(
      (c) => (c[0] as { data: Record<string, unknown> }).data,
    );
    const first = callsData.find((d) => d.name === "First added");
    const second = callsData.find((d) => d.name === "Second added");

    expect(first!.orderIndex).toBe(5);
    expect(second!.orderIndex).toBe(6);
  });

  // The append index is scoped PER SIBLING GROUP (parentId), not project-wide.
  // This is the core of the reorder-survives-reload fix: orderIndex must live
  // in the same 0-based space as Bryntum's per-level position, so an un-moved
  // sibling is never stranded with a project-scale index. Here the root group
  // is at index 9 but the parent "P1" group only reaches 2, so a new child of
  // P1 must get 3 — not 10.
  it("scopes the append index to the task's own sibling group", async () => {
    const ctx = makeCtx();
    ctx.tx.ganttTask.groupBy.mockResolvedValue([
      { parentId: null, _max: { orderIndex: 9 } },
      { parentId: "P1", _max: { orderIndex: 2 } },
    ]);
    // P1 already exists, so it is not an orphan parent.
    ctx.tx.ganttTask.findMany.mockResolvedValue([{ id: "P1" }]);

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: { added: [{ $PhantomId: "_child", name: "Child of P1", parentId: "P1" }] },
      },
    });

    const createArgs = ctx.tx.ganttTask.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.parentId).toBe("P1");
    expect(createArgs.data.orderIndex).toBe(3);
  });

  // An empty project (no per-parent rows) must start new tasks at 0, not crash.
  it("starts new tasks at orderIndex 0 in an empty project", async () => {
    const ctx = makeCtx();
    // groupBy already returns [] by default → root group starts at 0

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: { added: [{ $PhantomId: "_first", name: "Only task" }] },
      },
    });

    const createArgs = ctx.tx.ganttTask.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.orderIndex).toBe(0);
  });

  // Drag-to-reorder: Bryntum sends the moved sibling as an UPDATE carrying its
  // recalculated tree position in `orderedParentIndex`. The server must map that
  // onto the orderIndex column so the order survives reload.
  it("maps orderedParentIndex onto orderIndex on a reorder", async () => {
    const ctx = makeCtx();
    ctx.tx.ganttTask.update.mockResolvedValue({ id: "task-moved" });

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          updated: [{ id: "task-moved", orderedParentIndex: 2 }],
        },
      },
    });

    expect(ctx.tx.ganttTask.update).toHaveBeenCalledTimes(1);
    const updateArgs = ctx.tx.ganttTask.update.mock.calls[0]![0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(updateArgs.where.id).toBe("task-moved");
    expect(updateArgs.data.orderIndex).toBe(2);
  });

  // parentIndex is the structural fallback used when orderedParentIndex is absent
  // (equal to it when no column sorter is active).
  it("falls back to parentIndex when orderedParentIndex is absent", async () => {
    const ctx = makeCtx();
    ctx.tx.ganttTask.update.mockResolvedValue({ id: "task-moved" });

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          updated: [{ id: "task-moved", parentIndex: 3 }],
        },
      },
    });

    const updateArgs = ctx.tx.ganttTask.update.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(updateArgs.data.orderIndex).toBe(3);
  });

  // Bulletproof reorder: an un-moved sibling must not keep a stale orderIndex.
  // Bryntum only re-sends the rows that moved (here C and B), never the row that
  // stays put (A). The group is stored with non-0-based indices (6, 7, 8), so a
  // per-row write alone would leave A at 6 and reload the group as C, B, A. The
  // post-loop renumber must rebuild the whole group as a dense 0..N-1 sequence,
  // pulling the un-moved A back to 0 → final order A, C, B.
  it("renumbers the whole sibling group so an un-moved row isn't stranded", async () => {
    const ctx = makeCtx();
    ctx.tx.ganttTask.findMany.mockImplementation(
      (args: { where?: { id?: { in?: string[] }; parentId?: string | null } }) => {
        const where = args?.where ?? {};
        // renumber step 1: final parents of the moved rows (both root → null)
        if (where.id?.in) {
          return Promise.resolve(where.id.in.map((id) => ({ id, parentId: null })));
        }
        // renumber step 2: current children of the root group, pre-reorder order
        if ("parentId" in where) {
          return Promise.resolve([
            { id: "A", orderIndex: 6 },
            { id: "B", orderIndex: 7 },
            { id: "C", orderIndex: 8 },
          ]);
        }
        return Promise.resolve([]);
      },
    );

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          updated: [
            { id: "C", orderedParentIndex: 1 },
            { id: "B", orderedParentIndex: 2 },
          ],
        },
      },
    });

    // Last orderIndex written per id across the tentative write + the renumber.
    const finalOrder = new Map<string, number>();
    for (const call of ctx.tx.ganttTask.update.mock.calls) {
      const arg = call[0] as { where: { id: string }; data: { orderIndex?: number } };
      if (typeof arg.data.orderIndex === "number") {
        finalOrder.set(arg.where.id, arg.data.orderIndex);
      }
    }
    expect(finalOrder.get("A")).toBe(0); // un-moved row rescued from its stale 6
    expect(finalOrder.get("C")).toBe(1);
    expect(finalOrder.get("B")).toBe(2);
  });

  it("nulls parentId when the referenced parent does not exist (orphan defense)", async () => {
    const ctx = makeCtx();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sync._handler({
      ctx,
      input: {
        organizationId: ORG_ID,
        projectId: PROJECT_ID,
        tasks: {
          added: [
            {
              $PhantomId: "_orphan",
              name: "Orphan",
              parentId: "ghost-parent-id-that-does-not-exist",
            },
          ],
        },
      },
    });

    const createArgs = ctx.tx.ganttTask.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.parentId).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Orphan parentId"),
      expect.objectContaining({ unresolvedParentId: "ghost-parent-id-that-does-not-exist" }),
    );

    warnSpy.mockRestore();
  });
});
