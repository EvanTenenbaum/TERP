/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountingWorkspacePage from "./AccountingWorkspacePage";

let mockActiveTab = "invoices";
const mockSetActiveTab = vi.fn();

vi.mock("@/hooks/useQueryTabState", () => ({
  useQueryTabState: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}));

vi.mock("@/hooks/useWorkspaceHomeTelemetry", () => ({
  useWorkspaceHomeTelemetry: vi.fn(),
}));

vi.mock("@/components/spreadsheet-native/PilotSurfaceBoundary", () => ({
  PilotSurfaceBoundary: ({
    fallback,
  }: {
    fallback: ReactNode;
    children: ReactNode;
  }) => fallback,
}));

vi.mock("@/pages/accounting/AccountingDashboard", () => ({
  default: () => <div>Accounting Dashboard</div>,
}));

describe("AccountingWorkspacePage", () => {
  beforeEach(() => {
    mockActiveTab = "invoices";
    mockSetActiveTab.mockReset();
  });

  it("renders a table-shaped workspace skeleton for loading invoice surfaces", () => {
    render(<AccountingWorkspacePage />);

    // The 420-fork changed the fallback text to include trailing "..." ellipsis.
    // Use getAllByText to avoid throwing when the text also appears in a parent container.
    expect(screen.getAllByText("Loading invoices...").length).toBeGreaterThan(
      0
    );
  });

  it("renders table-shaped workspace skeletons for bills and payments too", () => {
    mockActiveTab = "bills";
    const { unmount } = render(<AccountingWorkspacePage />);

    expect(screen.getAllByText("Loading bills...").length).toBeGreaterThan(0);

    unmount();
    mockActiveTab = "payments";
    render(<AccountingWorkspacePage />);

    expect(screen.getAllByText("Loading payments...").length).toBeGreaterThan(
      0
    );
  });
});
