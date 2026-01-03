/**
 * DataCardGrid tests
 * Ensures KPI cards render with loading, error, and missing data states
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataCardGrid } from "./DataCardGrid";

const mockUseQuery = vi.fn();
const mockRefetch = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    dataCardMetrics: {
      getForModule: {
        useQuery: (input?: unknown, options?: unknown) =>
          mockUseQuery(input, options),
      },
    },
  },
}));

describe("DataCardGrid", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockRefetch.mockReset();
  });

  it("renders skeleton placeholders while metrics load", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<DataCardGrid moduleId="inventory" />);

    const skeletons = screen.getAllByTestId("metric-skeleton");
    expect(skeletons).toHaveLength(4);
  });

  it("renders cards for all metrics even when some data is missing", () => {
    mockUseQuery.mockReturnValue({
      data: {
        inventory_total_value: {
          value: 125000,
          updatedAt: "2024-01-01T00:00:00Z",
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<DataCardGrid moduleId="inventory" />);

    const cards = screen.getAllByTestId("metric-card");
    expect(cards).toHaveLength(4);

    const awaitingIntake = screen.getByText("Awaiting Intake");
    expect(
      awaitingIntake.closest('[data-testid="metric-card"]')
    ).toHaveTextContent("0");
  });

  it("shows a retryable error message when metrics fail to load", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error("Network down"),
      refetch: mockRefetch,
    });

    render(<DataCardGrid moduleId="inventory" />);

    expect(screen.getByText(/failed to load metrics/i)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retry);
    expect(mockRefetch).toHaveBeenCalled();
  });
});
