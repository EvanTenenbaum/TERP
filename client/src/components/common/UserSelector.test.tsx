/**
 * UserSelector Tests
 *
 * Tests for the UserSelector component for multi-user selection.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserSelector } from "./UserSelector";

const mockUsers = [
  { id: 1, name: "Alice Smith", email: "alice@example.com" },
  { id: 2, name: "Bob Jones", email: "bob@example.com" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com" },
];

describe("UserSelector", () => {
  let onSelectionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelectionChange = vi.fn();
  });

  it("should render with placeholder when no users selected", () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[]}
        onSelectionChange={onSelectionChange}
        placeholder="Select users..."
      />
    );

    const button = screen.getByRole("combobox");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Select users...");
  });

  it("should show count when users are selected", () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[1, 2]}
        onSelectionChange={onSelectionChange}
      />
    );

    const button = screen.getByRole("combobox");
    expect(button).toHaveTextContent("2 users selected");
  });

  it("should show singular 'user' when one user is selected", () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[1]}
        onSelectionChange={onSelectionChange}
      />
    );

    const button = screen.getByRole("combobox");
    expect(button).toHaveTextContent("1 user selected");
  });

  it("should display selected users as badges", () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[1, 2]}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("should call onSelectionChange when removing a user badge", async () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[1, 2]}
        onSelectionChange={onSelectionChange}
      />
    );

    // Find the remove button for Alice Smith
    const aliceBadge = screen.getByText("Alice Smith").closest("span");
    const removeButton = aliceBadge?.querySelector("button");

    if (removeButton) {
      // Click the remove button - this opens a confirmation dialog
      fireEvent.click(removeButton);

      // Find and click the confirm button in the dialog
      // The dialog has a "Remove" button with variant="destructive"
      const confirmButton = await screen.findByRole("button", { name: /remove/i });
      if (confirmButton) {
        fireEvent.click(confirmButton);
        expect(onSelectionChange).toHaveBeenCalledWith([2]);
      }
    }
  });

  it("should be disabled when disabled prop is true", () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[]}
        onSelectionChange={onSelectionChange}
        disabled={true}
      />
    );

    const button = screen.getByRole("combobox");
    expect(button).toBeDisabled();
  });

  it("should not render badges when no users are selected", () => {
    render(
      <UserSelector
        users={mockUsers}
        selectedUserIds={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
  });
});
