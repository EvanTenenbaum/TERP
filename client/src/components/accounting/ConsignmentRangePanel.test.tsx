import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConsignmentRangePanel } from "./ConsignmentRangePanel";

const hoisted = vi.hoisted(() => ({
  queryResult: {
    data: undefined as
      | {
          items: Array<{
            batchId: number;
            productName: string;
            batchCode: string;
            agreedRangeMin: number;
            agreedRangeMax: number;
            actualAvgSalePrice: number;
            unitsSold: number;
            isBelowVendorRange: boolean;
            belowRangeReason: string | null;
            payableAmountDue: number;
            rangeComplianceStatus: "IN_RANGE" | "BELOW_RANGE" | "ABOVE_RANGE";
          }>;
          summary: {
            totalBatchCount: number;
            inRangeCount: number;
            outOfRangeCount: number;
            belowRangeCount: number;
            totalUnitsSold: number;
            inRangeUnitsSold: number;
            outOfRangeUnitsSold: number;
            belowRangeUnitsSold: number;
          };
        }
      | undefined,
    isLoading: false,
    isPending: false,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    vendorPayables: {
      getRangeCompliance: {
        useQuery: vi.fn(() => hoisted.queryResult),
      },
    },
  },
}));

describe("ConsignmentRangePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.queryResult.data = undefined;
    hoisted.queryResult.isLoading = false;
    hoisted.queryResult.isPending = false;
  });

  it("renders a loading skeleton while the query is pending", () => {
    hoisted.queryResult.isLoading = true;
    hoisted.queryResult.isPending = true;

    render(<ConsignmentRangePanel vendorClientId={12} />);

    expect(screen.getByTestId("consignment-range-loading")).toBeInTheDocument();
  });

  it("renders the empty state when no range data is available", () => {
    hoisted.queryResult.data = {
      items: [],
      summary: {
        totalBatchCount: 0,
        inRangeCount: 0,
        outOfRangeCount: 0,
        belowRangeCount: 0,
        totalUnitsSold: 0,
        inRangeUnitsSold: 0,
        outOfRangeUnitsSold: 0,
        belowRangeUnitsSold: 0,
      },
    };

    render(<ConsignmentRangePanel vendorClientId={12} />);

    expect(
      screen.getByText("No consignment range data available")
    ).toBeInTheDocument();
  });

  it("shows the summary text for in-range batches", () => {
    hoisted.queryResult.data = {
      items: [
        {
          batchId: 1,
          productName: "Blue Dream",
          batchCode: "BD-1",
          agreedRangeMin: 8,
          agreedRangeMax: 11,
          actualAvgSalePrice: 9.25,
          unitsSold: 5,
          isBelowVendorRange: false,
          belowRangeReason: null,
          payableAmountDue: 40,
          rangeComplianceStatus: "IN_RANGE",
        },
        {
          batchId: 2,
          productName: "Gelato",
          batchCode: "GE-2",
          agreedRangeMin: 8,
          agreedRangeMax: 11,
          actualAvgSalePrice: 9.5,
          unitsSold: 4,
          isBelowVendorRange: false,
          belowRangeReason: null,
          payableAmountDue: 32,
          rangeComplianceStatus: "IN_RANGE",
        },
        {
          batchId: 3,
          productName: "Runtz",
          batchCode: "RU-3",
          agreedRangeMin: 8,
          agreedRangeMax: 11,
          actualAvgSalePrice: 7.5,
          unitsSold: 2,
          isBelowVendorRange: true,
          belowRangeReason: "Promo clearance",
          payableAmountDue: 16,
          rangeComplianceStatus: "BELOW_RANGE",
        },
      ],
      summary: {
        totalBatchCount: 3,
        inRangeCount: 2,
        outOfRangeCount: 1,
        belowRangeCount: 1,
        totalUnitsSold: 11,
        inRangeUnitsSold: 9,
        outOfRangeUnitsSold: 2,
        belowRangeUnitsSold: 2,
      },
    };

    render(<ConsignmentRangePanel vendorClientId={12} />);

    expect(screen.getByText(/2 of 3 batches in range/i)).toBeInTheDocument();
  });

  it("renders a below-range badge for flagged batches", () => {
    hoisted.queryResult.data = {
      items: [
        {
          batchId: 3,
          productName: "Runtz",
          batchCode: "RU-3",
          agreedRangeMin: 8,
          agreedRangeMax: 11,
          actualAvgSalePrice: 7.5,
          unitsSold: 2,
          isBelowVendorRange: true,
          belowRangeReason: "Promo clearance",
          payableAmountDue: 16,
          rangeComplianceStatus: "BELOW_RANGE",
        },
      ],
      summary: {
        totalBatchCount: 1,
        inRangeCount: 0,
        outOfRangeCount: 1,
        belowRangeCount: 1,
        totalUnitsSold: 2,
        inRangeUnitsSold: 0,
        outOfRangeUnitsSold: 2,
        belowRangeUnitsSold: 2,
      },
    };

    render(<ConsignmentRangePanel vendorClientId={12} />);

    expect(screen.getByText("Below Range")).toBeInTheDocument();
  });

  it("shows the captured below-range reason for flagged batches", () => {
    hoisted.queryResult.data = {
      items: [
        {
          batchId: 3,
          productName: "Runtz",
          batchCode: "RU-3",
          agreedRangeMin: 8,
          agreedRangeMax: 11,
          actualAvgSalePrice: 7.5,
          unitsSold: 2,
          isBelowVendorRange: true,
          belowRangeReason: "Promo clearance",
          payableAmountDue: 16,
          rangeComplianceStatus: "BELOW_RANGE",
        },
      ],
      summary: {
        totalBatchCount: 1,
        inRangeCount: 0,
        outOfRangeCount: 1,
        belowRangeCount: 1,
        totalUnitsSold: 2,
        inRangeUnitsSold: 0,
        outOfRangeUnitsSold: 2,
        belowRangeUnitsSold: 2,
      },
    };

    render(<ConsignmentRangePanel vendorClientId={12} />);

    expect(screen.getByText(/reason: promo clearance/i)).toBeInTheDocument();
  });
});
