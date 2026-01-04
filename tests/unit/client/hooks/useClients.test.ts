import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const sampleClients = [
  {
    id: 1,
    name: "Alpha",
    email: "alpha@test",
    phone: "111-1111",
    teriCode: "ALPHA",
  },
  {
    id: 2,
    name: "Beta",
    email: "beta@test",
    phone: "222-2222",
    teriCode: "BETA",
  },
];

describe("useClientsData", () => {
  it("returns clients and lookup helpers", async () => {
    vi.doMock("@/lib/trpc", () => ({
      trpc: {
        clients: {
          list: {
            useQuery: vi.fn(() => ({
              data: { items: sampleClients },
              isLoading: false,
              error: null,
            })),
          },
        },
      },
    }));

    const { useClientsData } = await import("@/hooks/useClientsData");
    const { result } = renderHook(() => useClientsData());

    expect(result.current.clients).toHaveLength(2);
    expect(result.current.getClientName(1)).toBe("Alpha");
    expect(result.current.getClientById(2)?.teriCode).toBe("BETA");
  });

  it("falls back to unknown names when client is missing", async () => {
    vi.doMock("@/lib/trpc", () => ({
      trpc: {
        clients: {
          list: {
            useQuery: vi.fn(() => ({
              data: { items: [] as typeof sampleClients },
              isLoading: false,
              error: null,
            })),
          },
        },
      },
    }));

    const { useClientsData } = await import("@/hooks/useClientsData");
    const { result } = renderHook(() => useClientsData());

    expect(result.current.getClientName(999)).toBe("Unknown");
    expect(result.current.clients).toHaveLength(0);
  });
});
