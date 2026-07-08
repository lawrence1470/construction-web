import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ApprovalToggle from "@/components/approvals/ApprovalToggle";

// Hoisted mocks so the vi.mock factory can reference them at hoist time.
const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  invalidate: vi.fn(),
  isPending: false,
}));

vi.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: vi.fn() }),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    approval: {
      setStatus: {
        useMutation: () => ({
          mutate: mocks.mutate,
          isPending: mocks.isPending,
        }),
      },
      listAll: { invalidate: mocks.invalidate },
      summary: { invalidate: mocks.invalidate },
    },
    document: {
      search: { invalidate: mocks.invalidate },
      aiSearch: { invalidate: mocks.invalidate },
      listByFolder: { invalidate: mocks.invalidate },
      listByTask: { invalidate: mocks.invalidate },
    },
    useUtils: () => ({
      approval: {
        listAll: { invalidate: mocks.invalidate },
        summary: { invalidate: mocks.invalidate },
      },
      document: {
        search: { invalidate: mocks.invalidate },
        aiSearch: { invalidate: mocks.invalidate },
        listByFolder: { invalidate: mocks.invalidate },
        listByTask: { invalidate: mocks.invalidate },
      },
    }),
  },
}));

const baseProps = {
  documentId: "doc-1",
  organizationId: "org-1",
  projectId: "proj-1",
};

describe("ApprovalToggle (admin)", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.invalidate.mockReset();
    mocks.isPending = false;
  });

  it("renders an interactive button when the user can approve", () => {
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="unapproved"
        memberRole="admin"
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Click to mark as approved");
    expect(screen.getByText("Unapproved")).toBeInTheDocument();
  });

  it("calls approval.setStatus with approved=true when an unapproved doc is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="unapproved"
        memberRole="admin"
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith({
      documentId: "doc-1",
      organizationId: "org-1",
      approved: true,
    });
  });

  it("calls approval.setStatus with approved=false when an approved doc is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="approved"
        memberRole="admin"
      />,
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    await user.click(screen.getByRole("button"));

    expect(mocks.mutate).toHaveBeenCalledWith({
      documentId: "doc-1",
      organizationId: "org-1",
      approved: false,
    });
  });

  it("does not fire the mutation while a request is pending", async () => {
    mocks.isPending = true;
    const user = userEvent.setup();
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="unapproved"
        memberRole="admin"
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});

describe("ApprovalToggle (employee)", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
  });

  it("renders a read-only span instead of a button", () => {
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="unapproved"
        memberRole="member"
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Unapproved")).toBeInTheDocument();
  });

  it("does not fire the mutation when an employee clicks the badge", async () => {
    const user = userEvent.setup();
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="unapproved"
        memberRole="member"
      />,
    );

    await user.click(screen.getByText("Unapproved"));
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('shows the "Approved" label when approvalStatus="approved"', () => {
    render(
      <ApprovalToggle
        {...baseProps}
        approvalStatus="approved"
        memberRole="member"
      />,
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
  });
});
