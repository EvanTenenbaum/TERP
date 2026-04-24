import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdjustmentContextDrawer } from "./AdjustmentContextDrawer";

const baseProps = {
  isOpen: true,
  batchId: 1,
  sku: "SKU-001",
  productName: "Test Product",
  previousValue: 100,
  currentValue: 50,
  onApply: vi.fn(),
  onCancel: vi.fn(),
};

describe("AdjustmentContextDrawer", () => {
  it("renders change summary with delta", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    expect(screen.getByText("SKU-001")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    // delta is -50
    expect(screen.getByText("−50")).toBeInTheDocument();
  });

  it("shows reason tags including Damaged and Count Discrepancy", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    expect(screen.getByText("Damaged")).toBeInTheDocument();
    expect(screen.getByText("Count Discrepancy")).toBeInTheDocument();
  });

  it("disables Apply when no reason selected", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).toBeDisabled();
  });

  it("enables Apply after selecting a reason", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    fireEvent.click(screen.getByText("Damaged"));
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).not.toBeDisabled();
  });

  it("calls onApply with reason and notes", () => {
    const onApply = vi.fn();
    render(<AdjustmentContextDrawer {...baseProps} onApply={onApply} />);
    fireEvent.click(screen.getByText("Damaged"));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "test note" } });
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalledWith({
      reason: "DAMAGED",
      notes: "test note",
    });
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = vi.fn();
    render(<AdjustmentContextDrawer {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not render when isOpen is false", () => {
    render(<AdjustmentContextDrawer {...baseProps} isOpen={false} />);
    expect(screen.queryByText("SKU-001")).not.toBeInTheDocument();
  });
});
