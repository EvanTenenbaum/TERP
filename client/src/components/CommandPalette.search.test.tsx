/**
 * @vitest-environment jsdom
 */

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

const mockSetLocation = vi.fn();
const mockSearchGlobal = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation] as const,
  useSearch: () => "",
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlags: () => ({
    flags: { "spreadsheet-view": true },
    isLoading: false,
    error: null,
    isEnabled: () => true,
    isModuleEnabled: () => true,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useRecentPages", () => ({
  useRecentPages: () => ({
    recentPages: [],
    recordPage: vi.fn(),
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    search: {
      global: {
        useQuery: (input: { query: string }, options?: { enabled?: boolean }) =>
          mockSearchGlobal(input, options),
      },
    },
  },
}));

describe("CommandPalette live search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetLocation.mockClear();
    mockSearchGlobal.mockImplementation(
      (input: { query: string }, options?: { enabled?: boolean }) => {
        if (!options?.enabled) {
          return {
            data: { quotes: [], orders: [], customers: [], products: [] },
            isLoading: false,
          };
        }

        if (input.query === "qac") {
          return {
            data: {
              quotes: [],
              orders: [],
              customers: [
                {
                  id: 203,
                  title: "QA Customer",
                  description: "Relationship record",
                  url: "/relationships/203",
                },
              ],
              products: [],
            },
            isLoading: false,
          };
        }

        if (input.query === "emer") {
          return {
            data: {
              quotes: [],
              orders: [
                {
                  id: 31,
                  title: "Order #SO-031",
                  description: "Emerald Valley Collective LLC · CONFIRMED",
                  url: "/sales?tab=orders&id=31",
                },
              ],
              customers: [],
              products: [],
            },
            isLoading: false,
          };
        }

        return {
          data: { quotes: [], orders: [], customers: [], products: [] },
          isLoading: false,
        };
      }
    );
  });

  it("renders server-backed customer results while search mode is active", async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);

    const input = screen.getByPlaceholderText("Type a command or search...");
    fireEvent.change(input, { target: { value: "qac" } });

    await act(async () => {
      vi.advanceTimersByTime(301);
    });

    expect(screen.getByText("QA Customer")).toBeInTheDocument();
    expect(screen.queryByText("Go to Dashboard")).not.toBeInTheDocument();
  });

  it("renders live order results for client-name searches", async () => {
    render(<CommandPalette open onOpenChange={() => {}} />);

    const input = screen.getByPlaceholderText("Type a command or search...");
    fireEvent.change(input, { target: { value: "emer" } });

    await act(async () => {
      vi.advanceTimersByTime(301);
    });

    expect(screen.getByText("Order #SO-031")).toBeInTheDocument();
    expect(
      screen.getByText(/Emerald Valley Collective LLC/i)
    ).toBeInTheDocument();
  });
});
