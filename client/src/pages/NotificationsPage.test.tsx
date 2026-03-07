/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPage } from "./NotificationsPage";
import { ThemeProvider } from "@/contexts/ThemeContext";

let mockSearch = "";
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/notifications", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: ({ label }: { label: string }) => <button>{label}</button>,
}));

vi.mock("@/components/inbox/InboxPanel", () => ({
  InboxPanel: () => <div>Mock Inbox Panel</div>,
}));

vi.mock("@/components/alerts/AlertsPanel", () => ({
  AlertsPanel: () => <div>Mock Alerts Panel</div>,
}));

describe("NotificationsPage", () => {
  beforeEach(() => {
    mockSearch = "";
    mockSetLocation.mockClear();
  });

  const renderPage = () =>
    render(
      <ThemeProvider>
        <NotificationsPage />
      </ThemeProvider>
    );

  it("renders the system notifications hub by default", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Notifications" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "System Notifications" })
    ).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Mock Inbox Panel")).toBeInTheDocument();
  });

  it("opens the alerts tab from the query string", () => {
    mockSearch = "?tab=alerts";
    renderPage();
    expect(screen.getByRole("tab", { name: "Alerts" })).toHaveAttribute(
      "data-state",
      "active"
    );
    expect(screen.getByText("Mock Alerts Panel")).toBeInTheDocument();
  });

  it("falls back to system notifications for unknown tab values", () => {
    mockSearch = "?tab=legacy";
    renderPage();
    expect(
      screen.getByRole("tab", { name: "System Notifications" })
    ).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Mock Inbox Panel")).toBeInTheDocument();
  });
});
