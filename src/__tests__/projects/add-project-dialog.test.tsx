import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AddProjectDialog from "@/components/projects/AddProjectDialog";

const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  session: { user: { id: "user-1" } } as { user: { id: string } } | null,
}));

vi.mock("@/hooks/useOrgFromUrl", () => ({
  useOrgFromUrl: () => ({
    orgSlug: "test-org",
    activeOrganizationId: "org-123",
    currentOrg: { id: "org-123", slug: "test-org" },
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: mocks.session }),
}));

vi.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));

vi.mock("@/components/providers/LoadingProvider", () => ({
  useLoading: () => ({ showLoading: mocks.showLoading, hideLoading: mocks.hideLoading }),
}));

vi.mock("@/components/projects/TemplatePickerStep", () => ({
  __esModule: true,
  default: ({ onContinue }: { onContinue: () => void }) => (
    <button onClick={onContinue}>continue-template</button>
  ),
}));

vi.mock("@/components/projects/ProjectFormBody", () => ({
  __esModule: true,
  default: ({
    onSuccess,
  }: {
    onSuccess?: (project: { id: string; slug: string; name: string }) => void;
  }) => (
    <button
      onClick={() =>
        onSuccess?.({ id: "proj-1", slug: "my-project", name: "My Project" })
      }
    >
      create-project
    </button>
  ),
}));

vi.mock("@/components/projects/AddProjectMembersStep", () => ({
  __esModule: true,
  default: ({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) => (
    <div>
      <button onClick={onComplete}>complete-members</button>
      <button onClick={onSkip}>skip-members</button>
    </div>
  ),
}));

describe("AddProjectDialog", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = { user: { id: "user-1" } };
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
    });
  });

  const advanceToMembersStep = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByText("continue-template"));
    await user.click(screen.getByText("create-project"));
  };

  it("always advances to the members step and shows a 3-step stepper", async () => {
    const user = userEvent.setup();
    render(<AddProjectDialog open onOpenChange={vi.fn()} />);

    await advanceToMembersStep(user);

    expect(screen.getByLabelText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByText("complete-members")).toBeInTheDocument();
  });

  it("navigates to the project's Gantt page and closes the dialog on complete", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectDialog open onOpenChange={onOpenChange} />);

    await advanceToMembersStep(user);
    await user.click(screen.getByText("complete-members"));

    expect(mocks.showLoading).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/test-org/projects/my-project/gantt");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a created snackbar without the dropdown copy and navigates on skip", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectDialog open onOpenChange={onOpenChange} />);

    await advanceToMembersStep(user);
    await user.click(screen.getByText("skip-members"));

    expect(mocks.showSnackbar).toHaveBeenCalledWith('"My Project" created', "success");
    expect(mocks.showSnackbar).not.toHaveBeenCalledWith(
      expect.stringContaining("dropdown"),
      expect.anything()
    );
    expect(mockPush).toHaveBeenCalledWith("/test-org/projects/my-project/gantt");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates directly without ever rendering the members step when session is missing", async () => {
    mocks.session = null;
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectDialog open onOpenChange={onOpenChange} />);

    await user.click(screen.getByText("continue-template"));
    await user.click(screen.getByText("create-project"));

    expect(screen.queryByText("complete-members")).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/test-org/projects/my-project/gantt");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
