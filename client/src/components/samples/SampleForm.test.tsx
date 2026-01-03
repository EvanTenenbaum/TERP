/**
 * SampleForm Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SampleForm, type SampleFormValues } from "./SampleForm";

const clients = [
  { id: 1, label: "Client A" },
  { id: 2, label: "Client B" },
];

const products = [
  { id: 10, label: "Product Alpha" },
  { id: 11, label: "Product Beta" },
];

describe("SampleForm", () => {
  it("renders required fields", () => {
    render(
      <SampleForm
        open
        onOpenChange={() => undefined}
        onSubmit={vi.fn()}
        clients={clients}
        productOptions={products}
      />
    );

    expect(screen.getByLabelText(/product/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it("validates required inputs before submit", async () => {
    render(
      <SampleForm
        open
        onOpenChange={() => undefined}
        onSubmit={vi.fn()}
        clients={clients}
        productOptions={products}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /create sample/i }));

    expect(await screen.findByText(/product is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/client is required/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/quantity is required/i)
    ).toBeInTheDocument();
  });

  it("submits form values", async () => {
    const handleSubmit = vi.fn<Promise<void>, [SampleFormValues]>((async () => {
      // noop
    }) as () => Promise<void>);

    render(
      <SampleForm
        open
        onOpenChange={() => undefined}
        onSubmit={handleSubmit}
        clients={clients}
        productOptions={products}
      />
    );

    fireEvent.change(screen.getByLabelText(/product/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/client/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: "2026-01-10" },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "Need quickly" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create sample/i }));

    await waitFor(() =>
      expect(handleSubmit).toHaveBeenCalledWith({
        productId: 10,
        clientId: 1,
        quantity: "5",
        dueDate: "2026-01-10",
        notes: "Need quickly",
      })
    );
  });
});
