/**
 * Skeleton component tests
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CardSkeleton } from "./CardSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { DashboardSkeleton } from "./DashboardSkeleton";

describe("Skeleton components", () => {
  it("renders the requested number of table skeleton rows and columns", () => {
    render(<TableSkeleton rows={3} columns={4} />);

    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(3);
    expect(screen.getAllByTestId("skeleton-cell")).toHaveLength(3 * 4);
  });

  it("renders card skeleton structure", () => {
    render(<CardSkeleton />);

    expect(screen.getByTestId("card-skeleton-header")).toBeInTheDocument();
    expect(screen.getAllByTestId("card-skeleton-line")).not.toHaveLength(0);
  });

  it("combines dashboard-level skeletons", () => {
    render(<DashboardSkeleton />);

    expect(screen.getAllByTestId("card-skeleton")).toHaveLength(4);
    expect(screen.getByTestId("table-skeleton-wrapper")).toBeInTheDocument();
  });
});
