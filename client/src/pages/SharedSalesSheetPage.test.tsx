/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SharedSalesSheetPage from "./SharedSalesSheetPage";

const sharedSheet = {
  clientName: "Golden State",
  createdAt: "2026-04-07T10:00:00.000Z",
  expiresAt: "2026-04-10T10:00:00.000Z",
  itemCount: 1,
  items: [
    {
      id: 1,
      name: "Blue Dream",
      category: "Flower",
      subcategory: "Indoor",
      brand: "Andy Rhan",
      batchSku: "BT-42",
      quantity: 12,
      price: 1200,
      imageUrl: null,
    },
  ],
};

vi.mock("wouter", () => ({
  useRoute: vi.fn(() => [true, { token: "share-token" }]),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      getByToken: {
        useQuery: vi.fn(() => ({
          data: sharedSheet,
          isLoading: false,
          error: null,
        })),
      },
    },
  },
}));

describe("SharedSalesSheetPage", () => {
  it("renders descriptor-rich item identity and confirmation terms", () => {
    render(<SharedSalesSheetPage />);

    expect(screen.getByText("Sales Catalogue")).toBeInTheDocument();
    expect(screen.getByText("Prepared for Golden State")).toBeInTheDocument();
    expect(screen.getByText("Blue Dream")).toBeInTheDocument();
    expect(screen.getByText("Andy Rhan • Indoor • BT-42")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pricing and availability are subject to final confirmation."
      )
    ).toBeInTheDocument();
  });
});
