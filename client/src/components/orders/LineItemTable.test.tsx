/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LineItemTable, type LineItem } from "./LineItemTable";

const buildLineItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  batchId: 1001,
  batchSku: "LOT-001",
  productId: 11,
  productDisplayName: "Blue Dream 3.5g",
  quantity: 2,
  cogsPerUnit: 10,
  originalCogsPerUnit: 10,
  isCogsOverridden: false,
  marginPercent: 25,
  marginDollar: 2.5,
  isMarginOverridden: false,
  marginSource: "DEFAULT",
  unitPrice: 12.5,
  lineTotal: 25,
  isSample: false,
  ...overrides,
});

describe("LineItemTable powersheet actions", () => {
  it("duplicates selected rows via bulk actions", () => {
    const onChange = vi.fn();
    render(
      <LineItemTable
        clientId={123}
        items={[
          buildLineItem(),
          buildLineItem({ batchId: 2002, productId: 22 }),
        ]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("Select line item 1"));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems).toHaveLength(3);
    expect(nextItems[2].id).toBeUndefined();
  });

  it("applies bulk margin to selected rows", () => {
    const onChange = vi.fn();
    render(
      <LineItemTable
        clientId={123}
        items={[
          buildLineItem(),
          buildLineItem({ batchId: 2002, productId: 22 }),
        ]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("Select line item 1"));
    fireEvent.change(screen.getByPlaceholderText("Margin %"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply Margin" }));

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].marginPercent).toBe(30);
    expect(nextItems[1].marginPercent).toBe(25);
  });

  it("applies bulk COGS override only to selected rows and sets override reason", () => {
    const onChange = vi.fn();
    render(
      <LineItemTable
        clientId={123}
        items={[
          buildLineItem(),
          buildLineItem({ batchId: 2002, productId: 22 }),
        ]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("Select line item 1"));
    fireEvent.change(screen.getByPlaceholderText("COGS"), {
      target: { value: "14.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply COGS" }));

    const nextItems = onChange.mock.calls[0][0] as LineItem[];
    expect(nextItems[0].cogsPerUnit).toBe(14.5);
    expect(nextItems[0].isCogsOverridden).toBe(true);
    expect(nextItems[0].cogsOverrideReason).toBe("Bulk override");

    expect(nextItems[1].cogsPerUnit).toBe(10);
    expect(nextItems[1].isCogsOverridden).toBe(false);
    expect(nextItems[1].cogsOverrideReason).toBeUndefined();
  });
});
