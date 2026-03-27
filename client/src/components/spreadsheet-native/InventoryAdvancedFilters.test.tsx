/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  InventoryAdvancedFilters,
  createDefaultInventoryFilters,
  hasActiveFilters,
  filtersToQueryInput,
} from "./InventoryAdvancedFilters";

describe("createDefaultInventoryFilters", () => {
  it("returns empty/default state", () => {
    const defaults = createDefaultInventoryFilters();
    expect(defaults.search).toBe("");
    expect(defaults.statuses).toEqual([]);
    expect(defaults.categories).toEqual([]);
    expect(defaults.subcategories).toEqual([]);
    expect(defaults.stockLevel).toBe("all");
    expect(defaults.suppliers).toEqual([]);
    expect(defaults.brands).toEqual([]);
    expect(defaults.grades).toEqual([]);
    expect(defaults.dateFrom).toBe("");
    expect(defaults.dateTo).toBe("");
    expect(defaults.location).toBe("");
    expect(defaults.cogsMin).toBe("");
    expect(defaults.cogsMax).toBe("");
    expect(defaults.stockStatus).toBe("ALL");
    expect(defaults.ageBracket).toBe("ALL");
    expect(defaults.batchId).toBe("");
  });
});

describe("hasActiveFilters", () => {
  it("returns false for default state", () => {
    expect(hasActiveFilters(createDefaultInventoryFilters())).toBe(false);
  });

  it("returns true when search is set", () => {
    const filters = { ...createDefaultInventoryFilters(), search: "flower" };
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("returns true when status is selected", () => {
    const filters = {
      ...createDefaultInventoryFilters(),
      statuses: ["LIVE"],
    };
    expect(hasActiveFilters(filters)).toBe(true);
  });
});

describe("filtersToQueryInput", () => {
  it("returns empty object for default filters", () => {
    const input = filtersToQueryInput(createDefaultInventoryFilters());
    expect(input.search).toBeUndefined();
    expect(input.status).toBeUndefined();
    expect(input.stockLevel).toBeUndefined();
  });

  it("maps search to query input", () => {
    const filters = { ...createDefaultInventoryFilters(), search: "indoor" };
    const input = filtersToQueryInput(filters);
    expect(input.search).toBe("indoor");
  });

  it("maps statuses array", () => {
    const filters = {
      ...createDefaultInventoryFilters(),
      statuses: ["LIVE", "ON_HOLD"],
    };
    const input = filtersToQueryInput(filters);
    expect(input.status).toEqual(["LIVE", "ON_HOLD"]);
  });

  it("maps cogsMin/cogsMax to numbers", () => {
    const filters = {
      ...createDefaultInventoryFilters(),
      cogsMin: "10",
      cogsMax: "100",
    };
    const input = filtersToQueryInput(filters);
    expect(input.minCogs).toBe(10);
    expect(input.maxCogs).toBe(100);
  });

  it("omits stockStatus when ALL", () => {
    const filters = {
      ...createDefaultInventoryFilters(),
      stockStatus: "ALL",
    };
    const input = filtersToQueryInput(filters);
    expect(input.stockStatus).toBeUndefined();
  });

  it("includes stockStatus when not ALL", () => {
    const filters = {
      ...createDefaultInventoryFilters(),
      stockStatus: "CRITICAL",
    };
    const input = filtersToQueryInput(filters);
    expect(input.stockStatus).toBe("CRITICAL");
  });
});

describe("InventoryAdvancedFilters component", () => {
  const defaultFilters = createDefaultInventoryFilters();

  it("renders filter panel when isOpen is true", () => {
    render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen={false}
        onOpenChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onFiltersChange when a status checkbox is toggled", () => {
    const onFiltersChange = vi.fn();
    render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    // Click the "Live" checkbox
    const liveCheckbox = screen.getByRole("checkbox", { name: /live/i });
    fireEvent.click(liveCheckbox);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    const updated = onFiltersChange.mock.calls[0][0];
    expect(updated.statuses).toContain("LIVE");
  });

  it("calls onOpenChange when close button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );
    const closeBtn = screen.getByRole("button", { name: /close filters/i });
    fireEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onFiltersChange with defaults when Clear All is clicked", () => {
    const onFiltersChange = vi.fn();
    const activeFilters = {
      ...defaultFilters,
      statuses: ["LIVE"],
      search: "flower",
    };
    render(
      <InventoryAdvancedFilters
        filters={activeFilters}
        onFiltersChange={onFiltersChange}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Clear All"));
    expect(onFiltersChange).toHaveBeenCalledWith(
      createDefaultInventoryFilters()
    );
  });

  it("renders subcategory filter only when subcategoryOptions are provided", () => {
    const { rerender } = render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen={true}
        onOpenChange={vi.fn()}
        subcategoryOptions={[]}
      />
    );
    expect(screen.queryByText("Subcategory")).not.toBeInTheDocument();

    rerender(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen={true}
        onOpenChange={vi.fn()}
        subcategoryOptions={["Indoor", "Outdoor"]}
      />
    );
    expect(screen.getByText("Subcategory")).toBeInTheDocument();
  });
});
