/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrderStatusActions } from "./OrderStatusActions";

describe("OrderStatusActions", () => {
  it("shows ready-for-packing transitions without the legacy pending label", async () => {
    render(
      <OrderStatusActions
        currentStatus="READY_FOR_PACKING"
        orderNumber="ORD-1001"
        onStatusChange={vi.fn()}
      />
    );

    fireEvent.pointerDown(
      screen.getByRole("button", { name: /change status/i })
    );

    expect(await screen.findByText("Packed")).toBeInTheDocument();
    expect(await screen.findByText("Shipped")).toBeInTheDocument();
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for Packing")).not.toBeInTheDocument();
  });
});
