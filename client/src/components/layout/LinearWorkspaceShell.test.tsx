/**
 * @vitest-environment jsdom
 */

import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "./LinearWorkspaceShell";

describe("LinearWorkspaceShell", () => {
  it("shows a transition skeleton while switching tabs", () => {
    vi.useFakeTimers();

    function Harness() {
      const [activeTab, setActiveTab] = useState<"queue" | "details">("queue");

      return (
        <div>
          <button onClick={() => setActiveTab("details")}>Show details</button>
          <LinearWorkspaceShell
            title="Procurement"
            description="Test shell"
            activeTab={activeTab}
            tabs={[
              { value: "queue", label: "Queue" },
              { value: "details", label: "Details" },
            ]}
            onTabChange={tab => setActiveTab(tab)}
          >
            <LinearWorkspacePanel value="queue">
              <div>Queue content</div>
            </LinearWorkspacePanel>
            <LinearWorkspacePanel value="details">
              <div>Details content</div>
            </LinearWorkspacePanel>
          </LinearWorkspaceShell>
        </div>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));

    expect(
      screen.getByTestId("workspace-transition-skeleton")
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(181);
    });

    expect(
      screen.queryByTestId("workspace-transition-skeleton")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Details content")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("renders the workspace title as the dominant heading and keeps the section cue separate", () => {
    render(
      <LinearWorkspaceShell
        title="Accounting"
        description="Manage invoices and payments."
        section="Finance"
        activeTab="dashboard"
        tabs={[{ value: "dashboard", label: "Dashboard" }]}
        onTabChange={() => {}}
      >
        <LinearWorkspacePanel value="dashboard">
          <div>Dashboard content</div>
        </LinearWorkspacePanel>
      </LinearWorkspaceShell>
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Accounting" })
    ).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
  });
});
