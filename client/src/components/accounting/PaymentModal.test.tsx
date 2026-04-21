import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentModal } from "./PaymentModal";

const {
  mockInvalidateInvoices,
  mockInvalidatePayments,
  mockMutate,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockInvalidateInvoices: vi.fn(),
  mockInvalidatePayments: vi.fn(),
  mockMutate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      accounting: {
        invoices: {
          list: { invalidate: mockInvalidateInvoices },
        },
      },
      payments: {
        list: { invalidate: mockInvalidatePayments },
      },
    }),
    payments: {
      recordPayment: {
        useMutation: vi.fn(
          (config?: {
            onSuccess?: (data: {
              paymentNumber: string;
              amount: number;
              invoiceStatus: string;
              amountDue: number;
            }) => void;
            onError?: (error: Error) => void;
          }) => ({
            mutate: (input: unknown) => {
              mockMutate(input);
              config?.onSuccess?.({
                paymentNumber: "PAY-100",
                amount: 125.5,
                invoiceStatus: "PARTIALLY_PAID",
                amountDue: 10,
              });
            },
            mutateAsync: async (input: unknown) => {
              mockMutate(input);
              const data = {
                paymentNumber: "PAY-100",
                amount: 125.5,
                invoiceStatus: "PARTIALLY_PAID",
                amountDue: 10,
              };
              config?.onSuccess?.(data);
              return data;
            },
            isPending: false,
          })
        ),
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe("PaymentModal", () => {
  const invoice = {
    id: 34,
    invoiceNumber: "INV-000034",
    totalAmount: "250.00",
    amountPaid: "124.50",
    amountDue: "125.50",
    status: "SENT",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("renders a stable payment overlay and pre-fills the amount due", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <PaymentModal
        open={true}
        onOpenChange={onOpenChange}
        invoice={invoice}
      />
    );

    expect(screen.getByTestId("record-payment-dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/payment amount/i)).toHaveValue(125.5);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <PaymentModal
        open={true}
        onOpenChange={onOpenChange}
        invoice={{ ...invoice }}
      />
    );

    expect(screen.getByLabelText(/payment amount/i)).toHaveValue(125.5);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("records a payment and closes cleanly on success", async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <PaymentModal
        open={true}
        onOpenChange={onOpenChange}
        invoice={invoice}
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: 34,
          amount: 125.5,
          paymentMethod: "CASH",
        })
      );
    });

    expect(mockInvalidateInvoices).toHaveBeenCalled();
    expect(mockInvalidatePayments).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    const toastMarkup = renderToStaticMarkup(
      <>{mockToastSuccess.mock.calls[0]?.[0]}</>
    );
    expect(toastMarkup).toContain("Payment recorded for invoice INV-000034");
    expect(toastMarkup).toContain("Remaining balance: $10.00 (was $125.50)");
  });
});
