/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuotesWorkSurface, buildQuoteComposerPath } from "./QuotesWorkSurface";

const mockSetLocation = vi.fn();
const mockInspector = {
  isOpen: false,
  open: vi.fn(),
  close: vi.fn(),
};
const mockQuotes = vi.hoisted(() => ({
  items: [
    {
      id: 91,
      orderNumber: "QUO-091",
      clientId: 10,
      quoteStatus: "UNSENT",
      total: "250.00",
      subtotal: "220.00",
      tax: "30.00",
      discount: "0.00",
      createdAt: "2026-03-01T00:00:00.000Z",
      validUntil: "2026-04-01T00:00:00.000Z",
    },
  ],
}));

function getSearchParams(path: string) {
  const [, query = ""] = path.split("?");
  return new URLSearchParams(query);
}

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=quotes", mockSetLocation],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clients: {
      list: {
        useQuery: () => ({
          data: { items: [{ id: 10, name: "Summit Dispensary" }] },
        }),
      },
    },
    orders: {
      getAll: {
        useQuery: () => ({
          data: {
            items: mockQuotes.items,
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      convertQuoteToSale: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      delete: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    quotes: {
      send: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("@/hooks/work-surface/useWorkSurfaceKeyboard", () => ({
  useWorkSurfaceKeyboard: () => ({
    keyboardProps: {},
  }),
}));

vi.mock("@/hooks/work-surface/useSaveState", () => ({
  useSaveState: () => ({
    setSaving: vi.fn(),
    setSaved: vi.fn(),
    setError: vi.fn(),
    SaveStateIndicator: <div data-testid="save-state-indicator" />,
  }),
}));

vi.mock("./InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
  InspectorField: () => null,
  useInspectorPanel: () => mockInspector,
}));

vi.mock("@/components/layout/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </header>
  ),
}));

describe("QuotesWorkSurface quote routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInspector.isOpen = false;
    mockQuotes.items = [
      {
        id: 91,
        orderNumber: "QUO-091",
        clientId: 10,
        quoteStatus: "UNSENT",
        total: "250.00",
        subtotal: "220.00",
        tax: "30.00",
        discount: "0.00",
        createdAt: "2026-03-01T00:00:00.000Z",
        validUntil: "2026-04-01T00:00:00.000Z",
      },
    ];
  });

  it("routes the New Quote button into the quote composer", () => {
    render(<QuotesWorkSurface />);

    fireEvent.click(screen.getByRole("button", { name: /new quote/i }));

    const route = mockSetLocation.mock.calls.at(-1)?.[0];
    expect(route).toBeTruthy();

    const params = getSearchParams(String(route));
    expect(params.get("tab")).toBe("create-order");
    expect(params.get("mode")).toBe("quote");
  });

  it("routes blank quote creation into the quote composer", () => {
    const params = getSearchParams(buildQuoteComposerPath());
    expect(params.get("tab")).toBe("create-order");
    expect(params.get("mode")).toBe("quote");
  });

  it("preserves explicit duplicate mode while keeping quote context", () => {
    const params = getSearchParams(
      buildQuoteComposerPath({ quoteId: 91, mode: "duplicate" })
    );
    expect(params.get("tab")).toBe("create-order");
    expect(params.get("quoteId")).toBe("91");
    expect(params.get("mode")).toBe("duplicate");
  });

  it("adds quote mode when editing an existing quote", () => {
    const params = getSearchParams(buildQuoteComposerPath({ quoteId: 91 }));
    expect(params.get("tab")).toBe("create-order");
    expect(params.get("quoteId")).toBe("91");
    expect(params.get("mode")).toBe("quote");
  });

  it("shows the guided empty state when no quotes exist", () => {
    mockQuotes.items = [];

    render(<QuotesWorkSurface />);

    expect(screen.getByText("No quotes found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Quote" })
    ).toBeInTheDocument();
  });
});
