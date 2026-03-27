import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCatalogueDraft } from "./useCatalogueDraft";

// Mock tRPC
vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      saveDraft: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      deleteDraft: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
      getDrafts: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDraftById: { useQuery: vi.fn(() => ({ data: null })) },
      generateShareLink: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
      },
      save: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
    useUtils: vi.fn(() => ({
      salesSheets: { getDrafts: { invalidate: vi.fn() } },
    })),
  },
}));

describe("useCatalogueDraft", () => {
  it("returns initial state with no draft", () => {
    const { result } = renderHook(() =>
      useCatalogueDraft({ clientId: null, items: [] })
    );
    expect(result.current.currentDraftId).toBeNull();
    expect(result.current.draftName).toBe("");
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.lastSaveTime).toBeNull();
    expect(result.current.canShare).toBe(false);
    expect(result.current.canConvert).toBe(false);
  });

  it("marks dirty when items change after initial load", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [{ id: 1 }] as never[] } }
    );
    // Initial load should not be dirty
    expect(result.current.hasUnsavedChanges).toBe(false);

    // Change items
    rerender({ items: [{ id: 1 }, { id: 2 }] as never[] });
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it("blocks share and convert when unsaved changes exist", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [{ id: 1 }] as never[] } }
    );
    rerender({ items: [{ id: 1 }, { id: 2 }] as never[] });
    expect(result.current.canShare).toBe(false);
    expect(result.current.canConvert).toBe(false);
  });
});
