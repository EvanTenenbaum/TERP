/**
 * @vitest-environment jsdom
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShrinkageReport } from "./ShrinkageReport";

const { mockUseShrinkageReportQuery } = vi.hoisted(() => ({
  mockUseShrinkageReportQuery: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventoryMovements: {
      getShrinkageReport: {
        useQuery: mockUseShrinkageReportQuery,
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/reports/shrinkage", vi.fn()],
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Pie: () => <div />,
  Cell: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Bar: () => <div />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select
      value={value ?? ""}
      onChange={event => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: () => null,
}));

describe("ShrinkageReport", () => {
  beforeEach(() => {
    mockUseShrinkageReportQuery.mockReset();
    mockUseShrinkageReportQuery.mockReturnValue({
      data: {
        summary: {
          totalShrinkageEvents: 1,
          totalShrinkageQty: 5,
          suspiciousEvents: 0,
        },
        byReason: [{ reason: "DAMAGED", count: 1, totalQty: 5 }],
        byCategory: [{ category: "Flower", count: 1, totalQty: 5 }],
        items: [
          {
            id: 1,
            batchId: 100,
            sku: "SKU-100",
            code: "BATCH-100",
            productName: "Blue Dream",
            category: "Flower",
            shrinkageQty: 5,
            reason: "DAMAGED",
            notes: "Broken jar",
            date: new Date("2026-03-06T12:00:00.000Z"),
            performedBy: "Test User",
            isSuspicious: false,
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it("passes the selected reason filter to the shrinkage query", () => {
    render(<ShrinkageReport />);

    expect(mockUseShrinkageReportQuery).toHaveBeenCalled();
    expect(mockUseShrinkageReportQuery.mock.lastCall?.[0]).toMatchObject({
      adjustmentReason: undefined,
    });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "DAMAGED" } });

    expect(mockUseShrinkageReportQuery.mock.lastCall?.[0]).toMatchObject({
      adjustmentReason: "DAMAGED",
    });
  });
});
