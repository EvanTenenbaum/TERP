/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import AccountPage from "./AccountPage";

vi.mock("wouter", () => ({
  Link: ({
    href,
    className,
    children,
  }: {
    href: string;
    className?: string;
    children: ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/account/ProfileSection", () => ({
  ProfileSection: () => <div>Mock Profile Section</div>,
}));

vi.mock("@/components/account/PasswordChangeSection", () => ({
  PasswordChangeSection: () => <div>Mock Password Section</div>,
}));

vi.mock("@/pages/settings/NotificationPreferences", () => ({
  NotificationPreferencesPage: () => (
    <div>Mock Notification Preferences Section</div>
  ),
}));

describe("AccountPage", () => {
  it("renders notification preferences directly on the account page", () => {
    render(<AccountPage />);

    expect(
      screen.getByText("Mock Notification Preferences Section")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /manage notification preferences/i })
    ).not.toBeInTheDocument();
  });
});
