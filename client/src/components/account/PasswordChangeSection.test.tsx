/**
 * @vitest-environment jsdom
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PasswordChangeSection } from "./PasswordChangeSection";

const { mockMutateAsync } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      changePassword: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mockMutateAsync,
        }),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PasswordChangeSection", () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
  });

  it("matches the 8-character password policy in hint text and validation", async () => {
    render(<PasswordChangeSection />);

    expect(
      screen.getByText("Must be at least 8 characters")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Current Password"), {
      target: { value: "current-password" },
    });
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      screen.getByText("Password must be at least 8 characters")
    ).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
