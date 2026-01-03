/**
 * SupplyForm validation tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SupplyForm } from "./SupplyForm";

// Mock StrainInput to a simple input for test isolation
vi.mock("@/components/inventory/StrainInput", () => ({
  StrainInput: ({
    onChange,
  }: {
    onChange: (id: number | null, name: string) => void;
  }) => (
    <input
      data-testid="strain-input"
      onChange={e => onChange(Number(e.target.value) || null, e.target.value)}
    />
  ),
}));

describe("SupplyForm", () => {
  const onSubmit = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onSubmit.mockReset();
    onOpenChange.mockReset();
  });

  const fillCommonFields = () => {
    fireEvent.change(screen.getByLabelText(/^Category$/i), {
      target: { value: "Edible" },
    });
    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Sample Gummies" },
    });
    fireEvent.change(screen.getByLabelText(/Quantity Available/i), {
      target: { value: "5" },
    });
  };

  it("prevents submission when quantity is not a valid number", async () => {
    render(
      <SupplyForm
        open
        onOpenChange={onOpenChange}
        vendorId={1}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/^Category$/i), {
      target: { value: "Edible" },
    });
    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Sample Gummies" },
    });
    const quantityField = screen.getByLabelText(
      /Quantity Available/i
    ) as HTMLInputElement;
    fireEvent.change(quantityField, { target: { value: "abc" } });
    expect(quantityField.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /create supply/i }));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("requires strain when category is flower", () => {
    render(
      <SupplyForm
        open
        onOpenChange={onOpenChange}
        vendorId={1}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/^Category$/i), {
      target: { value: "Flower" },
    });
    fireEvent.change(screen.getByLabelText(/Quantity Available/i), {
      target: { value: "10" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create supply/i }));

    expect(screen.getByText(/Strain is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces server errors from onSubmit", async () => {
    onSubmit.mockRejectedValueOnce(new Error("Server validation failed"));

    render(
      <SupplyForm
        open
        onOpenChange={onOpenChange}
        vendorId={1}
        onSubmit={onSubmit}
      />
    );

    fillCommonFields();

    await fireEvent.click(
      screen.getByRole("button", { name: /create supply/i })
    );

    expect(
      await screen.findByText(/server validation failed/i)
    ).toBeInTheDocument();
  });
});
