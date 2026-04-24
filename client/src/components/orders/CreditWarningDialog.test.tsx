/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreditWarningDialog } from "./CreditWarningDialog";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentPropsWithoutRef<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ ...props }: React.ComponentPropsWithoutRef<"textarea">) => (
    <textarea {...props} />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: React.ComponentPropsWithoutRef<"label">) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const creditCheck = {
  allowed: false,
  warning: "This order exceeds the credit limit by $500.00.",
  requiresOverride: true,
  creditLimit: 1000,
  currentExposure: 900,
  newExposure: 1500,
  availableCredit: 100,
  utilizationPercent: 150,
  enforcementMode: "SOFT_BLOCK" as const,
};

describe("CreditWarningDialog", () => {
  it("shows actionable next-step buttons for payment history, payment entry, and override requests", () => {
    render(
      <CreditWarningDialog
        open
        onOpenChange={vi.fn()}
        creditCheck={creditCheck}
        orderTotal={600}
        clientName="Acme"
        onProceed={vi.fn()}
        onRequestOverride={vi.fn()}
        onViewPaymentHistory={vi.fn()}
        onRecordPayment={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Next steps")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request credit override/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view payment history/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /record payment/i })
    ).toBeInTheDocument();
  });

  it("passes the typed reason into the override request callback", () => {
    const onRequestOverride = vi.fn();

    render(
      <CreditWarningDialog
        open
        onOpenChange={vi.fn()}
        creditCheck={creditCheck}
        orderTotal={600}
        clientName="Acme"
        onProceed={vi.fn()}
        onRequestOverride={onRequestOverride}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(
      screen.getByLabelText(/override \/ credit request reason/i),
      {
        target: { value: "Manager approved extended terms." },
      }
    );
    fireEvent.click(
      screen.getByRole("button", { name: /request credit override/i })
    );

    expect(onRequestOverride).toHaveBeenCalledWith(
      "Manager approved extended terms."
    );
  });
});
