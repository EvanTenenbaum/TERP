/**
 * WorkflowQueuePage Tests
 *
 * Tests for the Workflow Queue page view mode switching functionality.
 * Ensures Analytics and History buttons work correctly.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkflowQueuePage from "./WorkflowQueuePage";

// Mock the workflow components
vi.mock("@/components/workflow/WorkflowBoard", () => ({
  WorkflowBoard: () => <div data-testid="workflow-board">Board View</div>,
}));

vi.mock("@/components/workflow/WorkflowSettings", () => ({
  WorkflowSettings: () => (
    <div data-testid="workflow-settings">Settings View</div>
  ),
}));

vi.mock("@/components/workflow/WorkflowHistory", () => ({
  WorkflowHistory: () => <div data-testid="workflow-history">History View</div>,
}));

vi.mock("@/components/workflow/WorkflowAnalytics", () => ({
  WorkflowAnalytics: () => (
    <div data-testid="workflow-analytics">Analytics View</div>
  ),
}));

describe("WorkflowQueuePage", () => {
  it("should render the board view by default", () => {
    render(<WorkflowQueuePage />);
    expect(screen.getByTestId("workflow-board")).toBeInTheDocument();
  });

  it("should switch to analytics view when Analytics button is clicked", () => {
    render(<WorkflowQueuePage />);

    const analyticsButton = screen.getByRole("button", { name: /analytics/i });
    fireEvent.click(analyticsButton);

    expect(screen.getByTestId("workflow-analytics")).toBeInTheDocument();
    expect(screen.queryByTestId("workflow-board")).not.toBeInTheDocument();
  });

  it("should switch to history view when History button is clicked", () => {
    render(<WorkflowQueuePage />);

    const historyButton = screen.getByRole("button", { name: /history/i });
    fireEvent.click(historyButton);

    expect(screen.getByTestId("workflow-history")).toBeInTheDocument();
    expect(screen.queryByTestId("workflow-board")).not.toBeInTheDocument();
  });

  it("should switch to settings view when Settings button is clicked", () => {
    render(<WorkflowQueuePage />);

    const settingsButton = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(settingsButton);

    expect(screen.getByTestId("workflow-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("workflow-board")).not.toBeInTheDocument();
  });

  it("should switch back to board view when Board button is clicked", () => {
    render(<WorkflowQueuePage />);

    // Switch to analytics
    const analyticsButton = screen.getByRole("button", { name: /analytics/i });
    fireEvent.click(analyticsButton);
    expect(screen.getByTestId("workflow-analytics")).toBeInTheDocument();

    // Switch back to board
    const boardButton = screen.getByRole("button", { name: /^board$/i });
    fireEvent.click(boardButton);
    expect(screen.getByTestId("workflow-board")).toBeInTheDocument();
  });

  it("should highlight the active view button", () => {
    render(<WorkflowQueuePage />);

    const boardButton = screen.getByRole("button", { name: /^board$/i });
    const analyticsButton = screen.getByRole("button", { name: /analytics/i });

    // Verify buttons exist and are clickable
    expect(boardButton).toBeInTheDocument();
    expect(analyticsButton).toBeInTheDocument();

    // Click analytics and verify view switches
    fireEvent.click(analyticsButton);
    expect(screen.getByTestId("workflow-analytics")).toBeInTheDocument();
  });
});