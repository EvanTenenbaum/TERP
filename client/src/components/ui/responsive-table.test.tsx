import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResponsiveTable } from "./responsive-table";

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

describe("ResponsiveTable", () => {
  it("renders the canonical operational empty state when no rows exist", () => {
    render(
      <ResponsiveTable
        columns={[{ key: "name", label: "Name", priority: "primary" }]}
        data={[]}
        emptyMessage="No clients match this view yet."
      />
    );

    expect(screen.getByTestId("responsive-table-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No clients match this view yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Adjust this view or add new records to populate the table.")
    ).toBeInTheDocument();
  });
});
