import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import CsiCodePanel from "@/components/bryntum/components/task-popover/CsiCodePanel";

// Mock state available at hoist time (see testing-guide.md).
const mocks = vi.hoisted(() => ({
  getForCodeData: null as Record<string, unknown> | null,
  listForProjectData: [] as string[],
  attachMutate: vi.fn(),
  detachMutate: vi.fn(),
  invalidate: vi.fn(),
  trackUpload: vi.fn(),
  showSnackbar: vi.fn(),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    csiSpec: {
      getForCode: { useQuery: () => ({ data: mocks.getForCodeData, isLoading: false }) },
      listForProject: { useQuery: () => ({ data: mocks.listForProjectData }) },
      attach: { useMutation: () => ({ mutate: mocks.attachMutate, isPending: false }) },
      detach: { useMutation: () => ({ mutate: mocks.detachMutate, isPending: false }) },
    },
    useUtils: () => ({
      csiSpec: {
        getForCode: { invalidate: mocks.invalidate },
        listForProject: { invalidate: mocks.invalidate },
      },
    }),
  },
}));

vi.mock("@/store/uploadStatusStore", () => ({ trackUpload: mocks.trackUpload }));
vi.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));

const specDoc = {
  id: "doc1",
  name: "spec-sheet.pdf",
  blobUrl: "/api/blob/doc1",
  mimeType: "application/pdf",
  size: 1234,
  createdAt: new Date("2026-01-01"),
  uploadedBy: { id: "u1", name: "Bob", email: "bob@example.com" },
  folderId: "",
  approvalStatus: "unapproved",
  approvedAt: null,
  approvedBy: null,
};

function renderPanel(overrides: Partial<Parameters<typeof CsiCodePanel>[0]> = {}) {
  const onOpenDocument = vi.fn();
  render(
    <CsiCodePanel
      csiCode="03 30 00"
      taskId="task1"
      ganttInstance={null}
      projectId="proj1"
      canManage
      onOpenDocument={onOpenDocument}
      onClose={vi.fn()}
      {...overrides}
    />,
  );
  return { onOpenDocument };
}

beforeEach(() => {
  mocks.getForCodeData = null;
  mocks.listForProjectData = [];
  mocks.attachMutate.mockReset();
  mocks.detachMutate.mockReset();
  mocks.trackUpload.mockReset();
});

describe("CsiCodePanel — spec document banner", () => {
  it("shows the attached document and opens it on click", async () => {
    mocks.getForCodeData = specDoc;
    const { onOpenDocument } = renderPanel();

    const fileButton = screen.getByText("spec-sheet.pdf");
    expect(fileButton).toBeInTheDocument();

    await userEvent.click(fileButton);
    expect(onOpenDocument).toHaveBeenCalledWith(
      expect.objectContaining({ id: "doc1", name: "spec-sheet.pdf" }),
    );
  });

  it("shows the upload control when no document and the user can manage", () => {
    mocks.getForCodeData = null;
    renderPanel({ canManage: true });
    expect(screen.getByText(/attach spec document/i)).toBeInTheDocument();
  });

  it("hides the upload control for users who cannot manage", () => {
    mocks.getForCodeData = null;
    renderPanel({ canManage: false });
    expect(screen.queryByText(/attach spec document/i)).not.toBeInTheDocument();
  });

  it("hides the remove button for non-managers but still shows the document", () => {
    mocks.getForCodeData = specDoc;
    renderPanel({ canManage: false });
    expect(screen.getByText("spec-sheet.pdf")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /remove spec document/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a roll-up indicator on a collapsed division that contains a document", async () => {
    // Selected code is in division 03 (auto-expanded); the doc lives in the
    // collapsed division 00, so its header shows the roll-up indicator.
    // The tree lazy-loads, so await its appearance.
    mocks.listForProjectData = ["00 21 00"];
    renderPanel({ csiCode: "03 30 00" });
    expect(
      await screen.findByLabelText("Contains attached documents"),
    ).toBeInTheDocument();
  });

  it("does not flag prefix-sharing sibling codes that have no document", async () => {
    // Regression: 00 51/52/54/55 00 are orphan Level-2 leaves sharing the "00 5"
    // prefix. Only 00 52 00 has a doc, so only it should show the indicator.
    mocks.listForProjectData = ["00 52 00"];
    renderPanel({ csiCode: "00 52 00" }); // selecting it expands division 00
    expect(
      await screen.findAllByLabelText("Has attached document"),
    ).toHaveLength(1);
  });

  it("shows a loading spinner while removing the document", async () => {
    mocks.getForCodeData = specDoc;
    renderPanel({ canManage: true });

    expect(screen.queryByTestId("doc-loading")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /remove spec document/i }),
    );

    expect(mocks.detachMutate).toHaveBeenCalled();
    expect(screen.getByTestId("doc-loading")).toBeInTheDocument();
  });

  it("does not bleed the loading spinner onto a different code when switching mid-op", async () => {
    // Regression: busy state is per-code. Start a remove on 03 30 00, then switch
    // to 03 31 00 — the new code must show its own state, not the spinner.
    mocks.getForCodeData = specDoc;
    const baseProps = {
      taskId: "task1",
      ganttInstance: null,
      projectId: "proj1",
      canManage: true,
      onOpenDocument: vi.fn(),
      onClose: vi.fn(),
    } as const;

    const { rerender } = render(<CsiCodePanel csiCode="03 30 00" {...baseProps} />);
    await userEvent.click(
      screen.getByRole("button", { name: /remove spec document/i }),
    );
    expect(screen.getByTestId("doc-loading")).toBeInTheDocument();

    rerender(<CsiCodePanel csiCode="03 31 00" {...baseProps} />);
    expect(screen.queryByTestId("doc-loading")).not.toBeInTheDocument();
    // The switched-to code shows its own document, not a stuck spinner.
    expect(screen.getByText("spec-sheet.pdf")).toBeInTheDocument();
  });
});
