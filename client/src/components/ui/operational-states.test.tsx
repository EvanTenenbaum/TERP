import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  OperationalEmptyState,
  WorkspacePanelSkeleton,
} from "./operational-states";

describe("OperationalEmptyState", () => {
  it("renders contextual filter badges and actions", () => {
    const onRefresh = vi.fn();

    render(
      <OperationalEmptyState
        title="No notifications need attention"
        description="Clear filters or wait for new work."
        searchActive
        filterActive
        action={{ label: "Refresh", onClick: onRefresh }}
      />
    );

    expect(screen.getByText("Filtered results")).toBeInTheDocument();
    expect(
      screen.getByText("No notifications need attention")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe("WorkspacePanelSkeleton", () => {
  it("renders a structured workspace loading shell", () => {
    render(
      <WorkspacePanelSkeleton
        eyebrow="Loading workspace"
        title="Preparing operational view"
        metaCount={2}
        rows={3}
      />
    );

    const status = screen.getByRole("status", { name: "Loading workspace" });
    expect(status).toBeInTheDocument();
    expect(screen.getByText("Preparing operational view")).toBeInTheDocument();
  });
});
