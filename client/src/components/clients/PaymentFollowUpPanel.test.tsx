/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentFollowUpPanel } from "./PaymentFollowUpPanel";

const { useQuery } = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      communications: {
        list: {
          useQuery,
        },
      },
    },
  },
}));

describe("PaymentFollowUpPanel", () => {
  it("shows only payment follow-up entries and wires quick actions", () => {
    const onLogFollowUp = vi.fn();

    useQuery.mockReturnValue({
      data: [
        {
          id: 1,
          communicationType: "CALL",
          subject: "Payment follow-up: call",
          notes: "Promised ACH on Friday",
          communicatedAt: "2026-04-08T08:30:00.000Z",
          loggedByName: "Evan",
        },
        {
          id: 2,
          communicationType: "EMAIL",
          subject: "General relationship check-in",
          notes: "Not money-specific",
          communicatedAt: "2026-04-07T08:30:00.000Z",
          loggedByName: "Evan",
        },
      ],
      isLoading: false,
    });

    render(
      <PaymentFollowUpPanel
        clientId={7}
        context={{
          mode: "customer",
          receivableAmount: 420,
        }}
        onLogFollowUp={onLogFollowUp}
      />
    );

    expect(screen.getByText("Payment Follow-up")).toBeInTheDocument();
    expect(screen.getByText("Payment follow-up: call")).toBeInTheDocument();
    expect(
      screen.queryByText("General relationship check-in")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(content =>
        content.includes("$420.00 outstanding receivable to track.")
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log Call" }));
    fireEvent.click(screen.getByRole("button", { name: "Log Email" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Note" }));

    expect(onLogFollowUp).toHaveBeenNthCalledWith(1, "CALL");
    expect(onLogFollowUp).toHaveBeenNthCalledWith(2, "EMAIL");
    expect(onLogFollowUp).toHaveBeenNthCalledWith(3, "NOTE");
  });
});
