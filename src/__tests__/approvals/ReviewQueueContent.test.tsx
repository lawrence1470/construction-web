import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ReviewQueueContent from "@/components/approvals/ReviewQueueContent";

// Hoisted mock state — controlled per test via mocks.setQueryData / setMemberRole.
const mocks = vi.hoisted(() => ({
  listAllArgs: null as Record<string, unknown> | null,
  listAllResult: {
    data: undefined as { project: { name: string }; documents: unknown[] } | undefined,
    isLoading: false,
  },
  summary: {
    data: undefined as { pending: number; approved: number } | undefined,
  },
  memberRole: "admin",
}));

vi.mock("@/components/providers/ProjectProvider", () => ({
  useProjectContext: () => ({
    projectId: "proj-1",
    projectName: "Sunset Tower",
    projectSlug: "sunset",
    projectIcon: "building",
    projectImageUrl: null,
    projectLocation: "",
    organizationId: "org-1",
  }),
}));

vi.mock("@/components/providers/OrgProvider", () => ({
  useOrgContext: () => ({
    orgId: "org-1",
    orgSlug: "celn",
    orgName: "CELN",
    memberRole: mocks.memberRole,
  }),
}));

vi.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: vi.fn() }),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    approval: {
      summary: {
        useQuery: () => ({ data: mocks.summary.data }),
      },
      listAll: {
        useQuery: (args: Record<string, unknown>) => {
          mocks.listAllArgs = args;
          return mocks.listAllResult;
        },
      },
      listOverdueSlots: {
        useQuery: () => ({ data: undefined, isLoading: false }),
      },
      // ApprovalToggle mocks (we don't render the toggle in these tests but
      // ReviewCard imports the toggle which calls these).
      setStatus: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    document: {
      search: { invalidate: vi.fn() },
      aiSearch: { invalidate: vi.fn() },
      listByFolder: { invalidate: vi.fn() },
      listByTask: { invalidate: vi.fn() },
    },
    useUtils: () => ({
      approval: {
        listAll: { invalidate: vi.fn() },
        summary: { invalidate: vi.fn() },
      },
      document: {
        search: { invalidate: vi.fn() },
        aiSearch: { invalidate: vi.fn() },
        listByFolder: { invalidate: vi.fn() },
        listByTask: { invalidate: vi.fn() },
      },
    }),
  },
}));

const sampleDocs = [
  {
    id: "d-1",
    name: "Concrete shop drawings.pdf",
    blobUrl: "/api/blob/d-1",
    mimeType: "application/pdf",
    size: 1024,
    folderId: "submittals-shop",
    createdAt: new Date("2026-04-01"),
    approvalStatus: "unapproved",
    approvedAt: null,
    uploadedBy: { id: "u-1", name: "Jane", email: "jane@example.com" },
    approvedBy: null,
  },
  {
    id: "d-2",
    name: "Roof inspection.jpg",
    blobUrl: "/api/blob/d-2",
    mimeType: "image/jpeg",
    size: 2048,
    folderId: "inspections-structural",
    createdAt: new Date("2026-04-02"),
    approvalStatus: "unapproved",
    approvedAt: null,
    uploadedBy: { id: "u-2", name: "Joe", email: "joe@example.com" },
    approvedBy: null,
  },
];

beforeEach(() => {
  mocks.listAllArgs = null;
  mocks.summary.data = { pending: 2, approved: 5 };
  mocks.listAllResult = {
    data: { project: { name: "Sunset Tower" }, documents: sampleDocs },
    isLoading: false,
  };
  mocks.memberRole = "admin";
});

describe("ReviewQueueContent (admin)", () => {
  it("renders the project name in the header", () => {
    render(<ReviewQueueContent />);
    expect(screen.getByText("Review Queue")).toBeInTheDocument();
    expect(screen.getByText("Sunset Tower")).toBeInTheDocument();
  });

  it("does not show the read-only notice when the user can approve", () => {
    render(<ReviewQueueContent />);
    expect(
      screen.queryByText(/only owners and admins can approve/i),
    ).not.toBeInTheDocument();
  });

  it("renders a row per document with interactive approval toggles", () => {
    render(<ReviewQueueContent />);
    expect(screen.getByText("Concrete shop drawings.pdf")).toBeInTheDocument();
    expect(screen.getByText("Roof inspection.jpg")).toBeInTheDocument();
    // Two toggle buttons (one per row) — admin sees buttons, not spans
    const buttons = screen
      .getAllByRole("button")
      .filter((b) => /unapproved|approved/i.test(b.textContent ?? ""));
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("starts on the Pending tab and shows pending count", () => {
    render(<ReviewQueueContent />);
    expect(screen.getByRole("tab", { name: /Pending \(2\)/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Approved \(5\)/i })).toBeInTheDocument();
  });

  it("re-issues the query with status='approved' when the Approved tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ReviewQueueContent />);

    await user.click(screen.getByRole("tab", { name: /Approved \(5\)/i }));

    expect(mocks.listAllArgs).toMatchObject({
      organizationId: "org-1",
      projectId: "proj-1",
      status: "approved",
    });
  });

  it("re-issues the query with category='submittals' when the Submittals filter is selected", async () => {
    const user = userEvent.setup();
    render(<ReviewQueueContent />);

    await user.click(screen.getByRole("button", { name: /Submittals/i }));

    expect(mocks.listAllArgs).toMatchObject({ category: "submittals" });
  });
});

describe("ReviewQueueContent (member)", () => {
  beforeEach(() => {
    mocks.memberRole = "member";
  });

  it("shows the read-only notice for non-approvers", () => {
    render(<ReviewQueueContent />);
    expect(
      screen.getByText(
        /only owners and admins can approve/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders no clickable approval pills for members", () => {
    render(<ReviewQueueContent />);

    const pillButtons = screen
      .queryAllByRole("button")
      .filter((b) => /^(Unapproved|Approved)$/.test((b.textContent ?? "").trim()));
    expect(pillButtons).toHaveLength(0);
  });
});

describe("ReviewQueueContent empty + loading states", () => {
  it("shows the empty state copy for the pending tab when there are no docs", () => {
    mocks.listAllResult = {
      data: { project: { name: "Sunset Tower" }, documents: [] },
      isLoading: false,
    };

    render(<ReviewQueueContent />);
    expect(screen.getByText("Nothing waiting on you")).toBeInTheDocument();
  });
});
