/**
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AdjustQuantityDialog } from "./AdjustQuantityDialog";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useDialogComposition: () => ({
    isComposing: () => false,
    setComposing: () => {},
    justEndedComposing: () => false,
    markCompositionEnd: () => {},
  }),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select
      data-testid="qty-adjustment-reason"
      value={value ?? ""}
      onChange={event => onValueChange?.(event.target.value)}
    >
      <option value="">Select reason</option>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

describe("AdjustQuantityDialog", () => {
  it("requires an adjustment amount and reason", () => {
    const onSubmit = vi.fn();

    render(
      <AdjustQuantityDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByTestId("submit-adjustment"));

    expect(
      screen.getByText("Adjustment amount is required.")
    ).toBeInTheDocument();
    expect(screen.getByText("Select a reason.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits structured reason and optional notes", () => {
    const onSubmit = vi.fn();

    render(
      <AdjustQuantityDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        currentQuantity="125.5"
        itemLabel="Selected batch: SKU-100"
      />
    );

    fireEvent.change(screen.getByTestId("qty-adjustment"), {
      target: { value: "-5" },
    });
    fireEvent.change(screen.getByTestId("qty-adjustment-reason"), {
      target: { value: "DAMAGED" },
    });
    fireEvent.change(screen.getByTestId("qty-adjustment-notes"), {
      target: { value: "Broken jar during storage" },
    });
    fireEvent.click(screen.getByTestId("submit-adjustment"));

    expect(onSubmit).toHaveBeenCalledWith({
      adjustment: -5,
      adjustmentReason: "DAMAGED",
      notes: "Broken jar during storage",
    });
    expect(screen.getByText("Selected batch: SKU-100")).toBeInTheDocument();
    expect(screen.getByText("Current on-hand: 125.5")).toBeInTheDocument();
  });
});
