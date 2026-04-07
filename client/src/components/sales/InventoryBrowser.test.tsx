/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InventoryBrowser } from "./InventoryBrowser";
import type { PricedInventoryItem } from "./types";

function buildInventoryItem(
  overrides: Partial<PricedInventoryItem> = {}
): PricedInventoryItem {
  return {
    id: 101,
    name: "Blue Dream 3.5g",
    category: "Flower",
    basePrice: 8,
    retailPrice: 12,
    quantity: 12.5,
    priceMarkup: 50,
    appliedRules: [
      { ruleId: 1, ruleName: "Flower Markup", adjustment: "+50%" },
    ],
    ...overrides,
  };
}

const inventoryItem = buildInventoryItem();

describe("InventoryBrowser", () => {
  it("keeps units/+ controls paired on the left and normalizes quick quantity input", () => {
    const onAddItems = vi.fn();

    render(
      <InventoryBrowser
        inventory={[inventoryItem]}
        isLoading={false}
        onAddItems={onAddItems}
        selectedItems={[]}
      />
    );

    expect(screen.getByText("Units to Add")).toBeTruthy();

    const unitsInput = screen.getByLabelText(
      "Number of units to add for Blue Dream 3.5g"
    );
    fireEvent.change(unitsInput, { target: { value: "2.9" } });
    fireEvent.click(screen.getByLabelText("Quick add Blue Dream 3.5g"));

    expect(onAddItems).toHaveBeenCalledTimes(1);
    const [firstAddedItem] = onAddItems.mock.calls[0][0] as Array<{
      id: number;
      orderQuantity: number;
    }>;
    expect(firstAddedItem.id).toBe(101);
    expect(firstAddedItem.orderQuantity).toBe(2);
  });

  it("shows gross margin separately from the pricing-profile adjustment", () => {
    render(
      <InventoryBrowser
        inventory={[inventoryItem]}
        isLoading={false}
        onAddItems={vi.fn()}
        selectedItems={[]}
      />
    );

    expect(screen.getByText("Gross Margin")).toBeTruthy();
    expect(screen.getByText("+33.3%")).toBeTruthy();
    const [profileRule] = screen.getAllByTitle("Flower Markup (+50%)");
    expect(profileRule).toHaveTextContent("Profile rule");
    expect(profileRule).toHaveTextContent("+50.0% markup");
    expect(
      screen.getByText("Applied: Flower Markup (+50%)")
    ).toBeInTheDocument();
  });

  it("shows when multiple pricing rules contributed to the net markup", () => {
    render(
      <InventoryBrowser
        inventory={[
          {
            ...inventoryItem,
            priceMarkup: 42.5,
            appliedRules: [
              { ruleId: 1, ruleName: "Flower Markup", adjustment: "+50%" },
              { ruleId: 2, ruleName: "Aging Discount", adjustment: "-7.5%" },
            ],
          },
        ]}
        isLoading={false}
        onAddItems={vi.fn()}
        selectedItems={[]}
      />
    );

    expect(
      screen.getByText("Profile rules net +42.5% markup")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Applied: Flower Markup (+50%) +1 more")
    ).toBeInTheDocument();
  });

  it("searches across supplier and subcategory while defaulting to ready-to-sell batches", () => {
    render(
      <InventoryBrowser
        inventory={[
          buildInventoryItem({
            id: 201,
            name: "Andy Indoor Blue Dream",
            vendor: "Andy Rhan",
            subcategory: "Premium Indoor",
            status: "LIVE",
          }),
          buildInventoryItem({
            id: 202,
            name: "Andy Intake Blue Dream",
            vendor: "Andy Rhan",
            subcategory: "Premium Indoor",
            status: "AWAITING_INTAKE",
          }),
          buildInventoryItem({
            id: 203,
            name: "Outdoor Gelato",
            vendor: "Westside Farms",
            subcategory: "Outdoor",
            status: "LIVE",
          }),
        ]}
        isLoading={false}
        onAddItems={vi.fn()}
        selectedItems={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Search availability catalog"), {
      target: { value: "andy indoor" },
    });

    expect(screen.getByText("Andy Indoor Blue Dream")).toBeInTheDocument();
    expect(
      screen.queryByText("Andy Intake Blue Dream")
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Ready to sell only/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Include unavailable"));

    expect(screen.getByText("Andy Intake Blue Dream")).toBeInTheDocument();
  });

  it("filters by client price band and resets cleanly", () => {
    render(
      <InventoryBrowser
        inventory={[
          buildInventoryItem({
            id: 301,
            name: "Value Flower",
            retailPrice: 780,
          }),
          buildInventoryItem({
            id: 302,
            name: "Premium Flower",
            retailPrice: 1040,
          }),
        ]}
        isLoading={false}
        onAddItems={vi.fn()}
        selectedItems={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("Minimum client price"), {
      target: { value: "800" },
    });
    fireEvent.change(screen.getByLabelText("Maximum client price"), {
      target: { value: "1100" },
    });

    expect(screen.queryByText("Value Flower")).not.toBeInTheDocument();
    expect(screen.getByText("Premium Flower")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear Filters"));

    expect(screen.getByText("Value Flower")).toBeInTheDocument();
    expect(screen.getByText("Premium Flower")).toBeInTheDocument();
  });

  it("keeps unavailable rows out of bulk selection and add actions", () => {
    const onAddItems = vi.fn();

    render(
      <InventoryBrowser
        inventory={[
          buildInventoryItem({
            id: 401,
            name: "Ready Batch",
            vendor: "Andy Rhan",
            status: "LIVE",
          }),
          buildInventoryItem({
            id: 402,
            name: "Hold Batch",
            vendor: "Andy Rhan",
            status: "ON_HOLD",
          }),
        ]}
        isLoading={false}
        onAddItems={onAddItems}
        selectedItems={[]}
      />
    );

    fireEvent.click(screen.getByLabelText("Include unavailable"));

    expect(screen.getByLabelText("Quick add Hold Batch")).toBeDisabled();
    expect(screen.getByText("Select Visible (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Select Visible (1)"));
    fireEvent.click(screen.getByText("Add Selected (1)"));

    expect(onAddItems).toHaveBeenCalledTimes(1);
    expect(onAddItems.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 401, orderQuantity: 1 }),
      ])
    );
    expect(onAddItems.mock.calls[0][0]).toHaveLength(1);
  });

  it("applies a portable saved cut and lets the user clear it", () => {
    const onClearPortableCut = vi.fn();

    render(
      <InventoryBrowser
        inventory={[
          buildInventoryItem({
            id: 501,
            name: "Blue Dream Indoor",
            brand: "Andy Rhan",
            vendor: "Green Leaf",
            subcategory: "Premium Indoor",
            batchSku: "BATCH-501",
            status: "LIVE",
          }),
          buildInventoryItem({
            id: 502,
            name: "Blue Dream Outdoor",
            brand: "Westside Farms",
            vendor: "Westside Farms",
            subcategory: "Outdoor",
            batchSku: "BATCH-502",
            status: "LIVE",
          }),
        ]}
        isLoading={false}
        onAddItems={vi.fn()}
        selectedItems={[]}
        portableCut={{
          clientId: 77,
          viewId: 3,
          viewName: "Andy Indoor",
          filters: {
            search: "",
            categories: [],
            brands: ["Andy Rhan"],
            grades: [],
            priceMin: null,
            priceMax: null,
            strainFamilies: [],
            vendors: [],
            inStockOnly: false,
            includeUnavailable: false,
          },
        }}
        onClearPortableCut={onClearPortableCut}
      />
    );

    expect(screen.getByText("Saved cut: Andy Indoor")).toBeInTheDocument();
    expect(screen.getByText("Blue Dream Indoor")).toBeInTheDocument();
    expect(screen.queryByText("Blue Dream Outdoor")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /clear cut \+ filters/i })
    );
    expect(onClearPortableCut).toHaveBeenCalledTimes(1);
  });
});
