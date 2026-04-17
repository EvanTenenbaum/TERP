/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SharedSalesSheetPage from "./SharedSalesSheetPage";

/**
 * Represents the client-safe shape returned by salesSheets.getByToken.
 * Internal fields (vendor, batchSku, cogs*, basePrice, priceMarkup) are
 * intentionally absent — they are stripped at the router layer.
 */
const sharedSheet = {
  id: 1,
  clientName: "Golden State",
  createdAt: "2026-04-07T10:00:00.000Z",
  expiresAt: "2026-04-10T10:00:00.000Z",
  itemCount: 1,
  totalValue: "14400.00",
  items: [
    {
      id: 1,
      name: "Blue Dream",
      category: "Flower",
      subcategory: "Indoor",
      brand: "Andy Rhan",
      // vendor intentionally absent — stripped by router
      // batchSku intentionally absent — stripped by router
      quantity: 12,
      price: 1200,
      imageUrl: null,
    },
  ],
};

/**
 * A sheet containing internal-only fields to assert that those fields
 * are never rendered even if somehow present in the response object.
 * In production the router strips these, but the UI must not render
 * them regardless.
 */
const sheetWithInternalFields = {
  ...sharedSheet,
  items: [
    {
      ...sharedSheet.items[0],
      // These fields simulate a hypothetical mis-configured router that
      // somehow included internal data. The page must never render them.
      vendor: "Secret Supplier LLC",
      batchSku: "BT-INTERNAL-42",
      cogs: 800,
      margin: 0.33,
      basePrice: 800,
      priceMarkup: 50,
      effectiveCogs: 800,
      unitCogs: 800,
    },
  ],
};

vi.mock("wouter", () => ({
  useRoute: vi.fn(() => [true, { token: "share-token" }]),
}));

const mockUseQuery = vi.fn(() => ({
  data: sharedSheet,
  isLoading: false,
  error: null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      getByToken: {
        useQuery: (...args: Parameters<typeof mockUseQuery>) =>
          mockUseQuery(...args),
      },
    },
  },
}));

describe("SharedSalesSheetPage", () => {
  it("renders product identity matching the internal pattern (strain + grower + type)", () => {
    render(<SharedSalesSheetPage />);

    // Strain / product name (primary identity)
    expect(screen.getByText("Blue Dream")).toBeInTheDocument();
    // Grower / brand (secondary identity line)
    expect(screen.getByText("Andy Rhan")).toBeInTheDocument();
    // Type badge (category or subcategory)
    expect(screen.getByText("Indoor")).toBeInTheDocument();
    // Tertiary identity line: category · subcategory
    expect(screen.getByText("Flower · Indoor")).toBeInTheDocument();
  });

  it("shows client name and date in the header for professional presentation", () => {
    render(<SharedSalesSheetPage />);

    expect(screen.getByText("Prepared for Golden State")).toBeInTheDocument();
    // Date is visible (April 7, 2026)
    expect(screen.getByText(/April 7, 2026/)).toBeInTheDocument();
  });

  it("shows pricing terms consistent with the internal view", () => {
    render(<SharedSalesSheetPage />);

    expect(screen.getByText("Sales Catalogue")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pricing and availability are subject to final confirmation."
      )
    ).toBeInTheDocument();
    // Price is formatted as currency
    expect(screen.getAllByText("$1,200.00").length).toBeGreaterThan(0);
  });

  it("does not render internal-only jargon: vendor, batchSku, COGS, margin, supplier names", () => {
    mockUseQuery.mockReturnValueOnce({
      data: sheetWithInternalFields,
      isLoading: false,
      error: null,
    });

    const { container } = render(<SharedSalesSheetPage />);
    const html = container.innerHTML;

    // Supplier name must not appear anywhere in the rendered output
    expect(html).not.toContain("Secret Supplier LLC");
    // Internal batch SKU must not appear
    expect(html).not.toContain("BT-INTERNAL-42");
    // COGS-related labels must not appear
    expect(html).not.toContain("cogs");
    expect(html).not.toContain("COGS");
    expect(html).not.toContain("margin");
    expect(html).not.toContain("Margin");
    expect(html).not.toContain("basePrice");
    expect(html).not.toContain("Base Price");
    expect(html).not.toContain("priceMarkup");
    expect(html).not.toContain("Markup");
    // The product and grower are still shown (not over-filtered)
    expect(screen.getByText("Blue Dream")).toBeInTheDocument();
    expect(screen.getByText("Andy Rhan")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<SharedSalesSheetPage />);
    expect(screen.getByText("Loading sales catalogue...")).toBeInTheDocument();
  });

  it("shows error state when link is invalid", () => {
    mockUseQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error("Not found"),
    });

    render(<SharedSalesSheetPage />);
    expect(screen.getByText("Link Not Valid")).toBeInTheDocument();
  });
});
