/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddCommunicationModal } from "./AddCommunicationModal";

const mutateAsync = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      communications: {
        add: {
          useMutation: vi.fn(() => ({
            mutateAsync,
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe("AddCommunicationModal", () => {
  it("prefills payment follow-up drafts and submits them", async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();
    mutateAsync.mockResolvedValue({ success: true, id: 11 });

    render(
      <AddCommunicationModal
        clientId={7}
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
        draft={{
          type: "CALL",
          subject: "Payment follow-up: call",
          notes: "Receivable: $420.00",
          title: "Log Payment Follow-up",
        }}
      />
    );

    expect(screen.getByText("Log Payment Follow-up")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject *")).toHaveValue(
      "Payment follow-up: call"
    );
    expect(screen.getByLabelText("Notes")).toHaveValue("Receivable: $420.00");

    fireEvent.click(screen.getByRole("button", { name: "Save Communication" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 7,
          type: "CALL",
          subject: "Payment follow-up: call",
          notes: "Receivable: $420.00",
        })
      );
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
