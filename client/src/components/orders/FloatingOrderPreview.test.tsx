/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingOrderPreview } from "./FloatingOrderPreview";

describe("FloatingOrderPreview", () => {
  it("suppresses internal cost metrics when both cost toggles are disabled", () => {
    render(
      <FloatingOrderPreview
        clientName="Acme"
        orderType="SALE"
        subtotal={120}
        total={120}
        items={[
          {
            batchId: 1,
            productDisplayName: "Blue Dream",
            quantity: 2,
            unitPrice: 60,
            lineTotal: 120,
            marginPercent: 25,
            marginDollar: 15,
            cogsPerUnit: 45,
          },
        ]}
        showCogs={false}
        showMargin={false}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
      />
    );

    expect(screen.queryByText("Margin")).not.toBeInTheDocument();
    expect(screen.queryByText("COGS")).not.toBeInTheDocument();
    expect(screen.queryByText("Est. Profit:")).not.toBeInTheDocument();
    expect(screen.getAllByText("Order Preview").length).toBeGreaterThan(0);
  });
});
