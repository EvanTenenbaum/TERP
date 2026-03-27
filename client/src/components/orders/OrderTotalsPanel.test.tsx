/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTotalsPanel } from "./OrderTotalsPanel";

describe("OrderTotalsPanel", () => {
  it("can hide internal cost and margin rows independently", () => {
    render(
      <OrderTotalsPanel
        totals={{
          subtotal: 100,
          totalCogs: 60,
          totalMargin: 40,
          avgMarginPercent: 40,
          adjustmentAmount: 0,
          total: 100,
        }}
        warnings={[]}
        isValid
        showCogs={false}
        showMargin={false}
      />
    );

    expect(screen.queryByText("Total COGS")).not.toBeInTheDocument();
    expect(screen.queryByText("Total Margin")).not.toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });
});
