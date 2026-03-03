/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InventoryBrowser } from "./InventoryBrowser";
import type { PricedInventoryItem } from "./types";

const inventoryItem: PricedInventoryItem = {
  id: 101,
  name: "Blue Dream 3.5g",
  category: "Flower",
  basePrice: 8,
  retailPrice: 12,
  quantity: 12.5,
  priceMarkup: 50,
  appliedRules: [],
};

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
});
