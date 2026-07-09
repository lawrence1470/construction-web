import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TRPCClientError } from "@trpc/client";
import AddProjectMembersStep from "@/components/projects/AddProjectMembersStep";

const mocks = vi.hoisted(() => ({
  bulkAddMutateAsync: vi.fn(),
  invitationCreateMutateAsync: vi.fn(),
  invalidateProjectMemberList: vi.fn(),
  invalidateInvitationList: vi.fn(),
  invalidateListProjectMemberships: vi.fn(),
  showSnackbar: vi.fn(),
  members: [] as Array<{
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }>,
  membersLoading: false,
  failEmails: new Set<string>(),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    member: {
      list: {
        useQuery: () => ({
          data: mocks.members,
          isLoading: mocks.membersLoading,
        }),
      },
    },
    projectMember: {
      bulkAdd: {
        useMutation: () => ({
          mutateAsync: mocks.bulkAddMutateAsync,
          isPending: false,
        }),
      },
    },
    invitation: {
      create: {
        useMutation: () => ({
          mutateAsync: mocks.invitationCreateMutateAsync,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      projectMember: {
        list: { invalidate: mocks.invalidateProjectMemberList },
        listProjectMemberships: { invalidate: mocks.invalidateListProjectMemberships },
      },
      invitation: {
        list: { invalidate: mocks.invalidateInvitationList },
      },
    }),
  },
}));

vi.mock("@/hooks/useSnackbar", () => ({
  useSnackbar: () => ({ showSnackbar: mocks.showSnackbar }),
}));

const baseProps = {
  projectId: "proj-123",
  projectName: "Westside Tower",
  organizationId: "org-456",
  currentUserId: "user-self",
  onComplete: vi.fn(),
  onSkip: vi.fn(),
};

const otherUser = (id: string, name: string, email: string) => ({
  id: `m-${id}`,
  role: "member",
  user: { id, name, email, image: null },
});

describe("AddProjectMembersStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.failEmails = new Set();
    mocks.membersLoading = false;
    mocks.members = [
      otherUser("user-self", "Me Self", "me@buildco.com"),
      otherUser("user-jordan", "Jordan Marquez", "jordan@buildco.com"),
      otherUser("user-samira", "Samira Patel", "samira@buildco.com"),
    ];

    mocks.bulkAddMutateAsync.mockImplementation(
      async (input: { members: Array<{ userId: string; role: string }> }) => ({
        added: input.members.length,
      })
    );

    mocks.invitationCreateMutateAsync.mockImplementation(
      async (input: { email: string }) => {
        if (mocks.failEmails.has(input.email)) {
          throw new TRPCClientError(`Couldn't reach ${input.email}`);
        }
        return { invitation: { id: `inv-${input.email}` } };
      }
    );
  });

  it("renders org members and excludes the current user", () => {
    render(<AddProjectMembersStep {...baseProps} />);

    expect(screen.getByText("Jordan Marquez")).toBeInTheDocument();
    expect(screen.getByText("Samira Patel")).toBeInTheDocument();
    expect(screen.queryByText("Me Self")).not.toBeInTheDocument();
  });

  it("shows the project name in the subtitle", () => {
    render(<AddProjectMembersStep {...baseProps} />);
    expect(screen.getByText("Westside Tower")).toBeInTheDocument();
  });

  it("filters the list when typing in search", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "samira");

    expect(screen.getByText("Samira Patel")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Marquez")).not.toBeInTheDocument();
  });

  it("shows an empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    await user.type(screen.getByPlaceholderText(/search teammates/i), "zzz");
    expect(screen.getByText(/no teammates match/i)).toBeInTheDocument();
  });

  it("disables Add to project until at least one teammate is selected", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const addButton = screen.getByRole("button", { name: /add to project/i });
    expect(addButton).toBeDisabled();

    await user.click(screen.getByText("Jordan Marquez"));
    expect(addButton).not.toBeDisabled();
  });

  it("calls bulkAdd with selected members defaulting to 'member' role", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} onComplete={onComplete} />);

    await user.click(screen.getByText("Jordan Marquez"));
    await user.click(screen.getByRole("button", { name: /add to project/i }));

    await waitFor(() => {
      expect(mocks.bulkAddMutateAsync).toHaveBeenCalledWith({
        projectId: "proj-123",
        members: [{ userId: "user-jordan", role: "member" }],
      });
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("calls onSkip without firing bulkAdd when Skip is clicked", async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} onSkip={onSkip} />);

    await user.click(screen.getByText("Jordan Marquez"));
    await user.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(onSkip).toHaveBeenCalled();
    expect(mocks.bulkAddMutateAsync).not.toHaveBeenCalled();
  });

  it("shows empty state when there are no other org members", () => {
    mocks.members = [otherUser("user-self", "Me Self", "me@buildco.com")];
    render(<AddProjectMembersStep {...baseProps} />);

    expect(
      screen.getByText(/no other teammates in your organization/i)
    ).toBeInTheDocument();
  });

  it("shows an invite action for an unknown valid email", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    await user.type(screen.getByPlaceholderText(/search teammates/i), "new@buildco.com");

    expect(screen.getByText(/invite new@buildco\.com by email/i)).toBeInTheDocument();
  });

  it("does not show an invite action for an existing member's email", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    await user.type(screen.getByPlaceholderText(/search teammates/i), "jordan@buildco.com");

    expect(
      screen.queryByText(/invite jordan@buildco\.com by email/i)
    ).not.toBeInTheDocument();
  });

  it("does not show an invite action for the current user's own email", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    await user.type(screen.getByPlaceholderText(/search teammates/i), "me@buildco.com");

    expect(
      screen.queryByText(/invite me@buildco\.com by email/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/that's you/i)).toBeInTheDocument();
  });

  it("adds a pending invite when clicked, clears search, and enables Add", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "new@buildco.com");
    await user.click(screen.getByText(/invite new@buildco\.com by email/i));

    expect(search).toHaveValue("");
    expect(screen.getByText("new@buildco.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add to project/i })).not.toBeDisabled();
  });

  it("keeps a pending invite row visible while the search text changes", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "new@buildco.com");
    await user.click(screen.getByText(/invite new@buildco\.com by email/i));

    await user.type(search, "samira");

    expect(screen.getByText("new@buildco.com")).toBeInTheDocument();
    expect(screen.getByText("Samira Patel")).toBeInTheDocument();
  });

  it("normalizes and dedupes emails (trims + lowercases)", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "  New@Ex.com ");
    await user.click(screen.getByText(/invite new@ex\.com by email/i));

    await user.type(search, "NEW@ex.com");
    expect(screen.queryByText(/invite new@ex\.com by email/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("new@ex.com")).toHaveLength(1);
  });

  it("removes a pending invite when its remove button is clicked", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "new@buildco.com");
    await user.click(screen.getByText(/invite new@buildco\.com by email/i));
    expect(screen.getByText("new@buildco.com")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /remove invite for new@buildco\.com/i })
    );

    expect(screen.queryByText("new@buildco.com")).not.toBeInTheDocument();
  });

  it("submits only invitation.create when only pending invites are present", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} onComplete={onComplete} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "new@buildco.com");
    await user.click(screen.getByText(/invite new@buildco\.com by email/i));
    await user.click(screen.getByRole("button", { name: /add to project/i }));

    await waitFor(() => {
      expect(mocks.invitationCreateMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-456",
        projectId: "proj-123",
        email: "new@buildco.com",
        role: "member",
      });
    });
    expect(mocks.bulkAddMutateAsync).not.toHaveBeenCalled();
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("submits both bulkAdd and invitation.create when members and invites are combined", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} onComplete={onComplete} />);

    await user.click(screen.getByText("Jordan Marquez"));

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "new@buildco.com");
    await user.click(screen.getByText(/invite new@buildco\.com by email/i));

    await user.click(screen.getByRole("button", { name: /add to project/i }));

    await waitFor(() => {
      expect(mocks.bulkAddMutateAsync).toHaveBeenCalledWith({
        projectId: "proj-123",
        members: [{ userId: "user-jordan", role: "member" }],
      });
    });
    await waitFor(() => {
      expect(mocks.invitationCreateMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-456",
        projectId: "proj-123",
        email: "new@buildco.com",
        role: "member",
      });
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it("submits the selected role for a pending invite", async () => {
    const user = userEvent.setup();
    render(<AddProjectMembersStep {...baseProps} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "new@buildco.com");
    await user.click(screen.getByText(/invite new@buildco\.com by email/i));

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Admin" }));

    await user.click(screen.getByRole("button", { name: /add to project/i }));

    await waitFor(() => {
      expect(mocks.invitationCreateMutateAsync).toHaveBeenCalledWith({
        organizationId: "org-456",
        projectId: "proj-123",
        email: "new@buildco.com",
        role: "admin",
      });
    });
  });

  it("keeps the failed invite, removes the succeeded one, skips onComplete, and names the failed email in the error", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    mocks.failEmails.add("bad@buildco.com");

    render(<AddProjectMembersStep {...baseProps} onComplete={onComplete} />);

    const search = screen.getByPlaceholderText(/search teammates/i);
    await user.type(search, "good@buildco.com");
    await user.click(screen.getByText(/invite good@buildco\.com by email/i));

    await user.type(search, "bad@buildco.com");
    await user.click(screen.getByText(/invite bad@buildco\.com by email/i));

    await user.click(screen.getByRole("button", { name: /add to project/i }));

    await waitFor(() => {
      expect(screen.queryByText("good@buildco.com")).not.toBeInTheDocument();
    });
    expect(screen.getByText("bad@buildco.com")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mocks.showSnackbar).toHaveBeenCalledWith(
        expect.stringContaining("bad@buildco.com"),
        "error"
      );
    });
  });

  it("keeps the member selection when bulkAdd fails", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    mocks.bulkAddMutateAsync.mockRejectedValueOnce(
      new TRPCClientError("Failed to add teammates")
    );

    render(<AddProjectMembersStep {...baseProps} onComplete={onComplete} />);

    await user.click(screen.getByText("Jordan Marquez"));
    await user.click(screen.getByRole("button", { name: /add to project/i }));

    await waitFor(() => {
      expect(mocks.showSnackbar).toHaveBeenCalled();
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
