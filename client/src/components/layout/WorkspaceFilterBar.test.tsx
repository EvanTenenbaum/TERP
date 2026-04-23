/**
 * Tests for WorkspaceFilterBar + LinearWorkspaceShell filterStrip slot
 * (TER-1310).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "./LinearWorkspaceShell";
import { WorkspaceFilterBar } from "./WorkspaceFilterBar";

describe("WorkspaceFilterBar", () => {
  it("renders children inside a toolbar with default aria-label", () => {
    render(
      <WorkspaceFilterBar>
        <button>Status</button>
      </WorkspaceFilterBar>
    );
    const toolbar = screen.getByRole("toolbar", { name: "Filters" });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toContainElement(
      screen.getByRole("button", { name: "Status" })
    );
  });

  it("honors a custom aria-label", () => {
    render(
      <WorkspaceFilterBar aria-label="Order filters">
        <span>facet</span>
      </WorkspaceFilterBar>
    );
    expect(
      screen.getByRole("toolbar", { name: "Order filters" })
    ).toBeInTheDocument();
  });

  it("carries the canonical `linear-workspace-filter-strip` class for shared chrome", () => {
    render(
      <WorkspaceFilterBar>
        <span>facet</span>
      </WorkspaceFilterBar>
    );
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).toContain("linear-workspace-filter-strip");
  });
});

describe("LinearWorkspaceShell filterStrip slot", () => {
  it("does not render the filter row when filterStrip is absent", () => {
    render(
      <LinearWorkspaceShell
        title="Orders"
        activeTab="queue"
        tabs={[
          { value: "queue", label: "Queue" },
          { value: "details", label: "Details" },
        ]}
        onTabChange={() => {}}
      >
        <LinearWorkspacePanel value="queue">
          <div>Queue content</div>
        </LinearWorkspacePanel>
      </LinearWorkspaceShell>
    );
    expect(
      document.querySelector(
        "[data-slot='linear-workspace-filter-row']"
      )
    ).toBeNull();
  });

  it("renders the filter row below the tab row when filterStrip is provided", () => {
    render(
      <LinearWorkspaceShell
        title="Orders"
        activeTab="queue"
        tabs={[
          { value: "queue", label: "Queue" },
          { value: "details", label: "Details" },
        ]}
        onTabChange={() => {}}
        filterStrip={
          <WorkspaceFilterBar aria-label="Order filters">
            <button>Pending</button>
          </WorkspaceFilterBar>
        }
      >
        <LinearWorkspacePanel value="queue">
          <div>Queue content</div>
        </LinearWorkspacePanel>
      </LinearWorkspaceShell>
    );
    const filterRow = document.querySelector(
      "[data-slot='linear-workspace-filter-row']"
    );
    expect(filterRow).not.toBeNull();
    expect(filterRow).toContainElement(
      screen.getByRole("toolbar", { name: "Order filters" })
    );
    expect(filterRow).toContainElement(
      screen.getByRole("button", { name: "Pending" })
    );
  });
});
