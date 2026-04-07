import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvoiceBottom } from "./InvoiceBottom";

describe("InvoiceBottom", () => {
  it("renders totals and credit summary", () => {
    render(
      <InvoiceBottom
        subtotal={1200}
        adjustment={{ amount: 45, mode: "DISCOUNT", type: "DOLLAR" }}
        onAdjustmentChange={vi.fn()}
        showAdjustmentOnDocument
        onShowAdjustmentOnDocumentChange={vi.fn()}
        freight={25}
        onFreightChange={vi.fn()}
        total={1180}
        paymentTerms="NET_30"
        onPaymentTermsChange={vi.fn()}
        creditAvailable={9000}
        creditUtilizationPercent={42}
        creditWarning="Credit utilization is elevated."
        onOpenCredit={vi.fn()}
        totalCogs={700}
        totalMargin={480}
        marginPercent={40}
        showCogs
        showMargin
      />
    );

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("$1200.00")).toBeInTheDocument();
    expect(
      screen.getByText("Credit utilization is elevated.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Credit" })
    ).toBeInTheDocument();
  });

  it("calls change handlers for payment terms and decimal freight", () => {
    const onPaymentTermsChange = vi.fn();
    const onFreightChange = vi.fn();

    render(
      <InvoiceBottom
        subtotal={500}
        adjustment={null}
        onAdjustmentChange={vi.fn()}
        showAdjustmentOnDocument={false}
        onShowAdjustmentOnDocumentChange={vi.fn()}
        freight={0}
        onFreightChange={onFreightChange}
        total={500}
        paymentTerms="NET_30"
        onPaymentTermsChange={onPaymentTermsChange}
        creditAvailable={null}
        creditUtilizationPercent={null}
        creditWarning={null}
      />
    );

    fireEvent.click(screen.getByLabelText("Payment Terms"));
    fireEvent.click(screen.getByText("COD"));
    fireEvent.change(screen.getByLabelText("Freight"), {
      target: { value: "80.5" },
    });
    fireEvent.blur(screen.getByLabelText("Freight"));

    expect(onPaymentTermsChange).toHaveBeenCalledWith("COD");
    expect(onFreightChange).toHaveBeenCalledWith(80.5);
  });

  it("clears a local adjustment edit when the parent resets adjustment to null", () => {
    const onAdjustmentChange = vi.fn();
    const view = render(
      <InvoiceBottom
        subtotal={500}
        adjustment={{ amount: 25, mode: "DISCOUNT", type: "DOLLAR" }}
        onAdjustmentChange={onAdjustmentChange}
        showAdjustmentOnDocument
        onShowAdjustmentOnDocumentChange={vi.fn()}
        freight={0}
        onFreightChange={vi.fn()}
        total={475}
        paymentTerms="NET_30"
        onPaymentTermsChange={vi.fn()}
        creditAvailable={null}
        creditUtilizationPercent={null}
        creditWarning={null}
      />
    );

    const adjustmentInput = screen.getByLabelText("Whole Order Change");
    fireEvent.focus(adjustmentInput);
    fireEvent.change(adjustmentInput, { target: { value: "10" } });

    view.rerender(
      <InvoiceBottom
        subtotal={500}
        adjustment={null}
        onAdjustmentChange={onAdjustmentChange}
        showAdjustmentOnDocument
        onShowAdjustmentOnDocumentChange={vi.fn()}
        freight={0}
        onFreightChange={vi.fn()}
        total={500}
        paymentTerms="NET_30"
        onPaymentTermsChange={vi.fn()}
        creditAvailable={null}
        creditUtilizationPercent={null}
        creditWarning={null}
      />
    );

    expect(screen.getByLabelText("Whole Order Change")).toHaveValue("");
    expect(onAdjustmentChange).not.toHaveBeenCalled();
  });
});
