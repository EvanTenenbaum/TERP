import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { act } from "@testing-library/react";
import { useCatalogueDraft } from "./useCatalogueDraft";

const {
  toastError,
  saveDraftMutate,
  saveDraftMutateAsync,
  deleteDraftMutate,
  convertMutateAsync,
} = vi.hoisted(() => ({
  toastError: vi.fn(),
  saveDraftMutate: vi.fn(),
  saveDraftMutateAsync: vi.fn(),
  deleteDraftMutate: vi.fn(),
  convertMutateAsync: vi.fn(),
}));

// Mock tRPC
vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      saveDraft: {
        useMutation: vi.fn(() => ({
          mutate: saveDraftMutate,
          mutateAsync: saveDraftMutateAsync,
          isPending: false,
        })),
      },
      deleteDraft: {
        useMutation: vi.fn(() => ({
          mutate: deleteDraftMutate,
          isPending: false,
        })),
      },
      getDrafts: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDraftById: { useQuery: vi.fn(() => ({ data: null })) },
      generateShareLink: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
      },
      save: {
        useMutation: vi.fn(() => ({
          mutateAsync: convertMutateAsync,
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      salesSheets: { getDrafts: { invalidate: vi.fn() } },
    })),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

describe("useCatalogueDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraftMutateAsync.mockResolvedValue({ draftId: 101 });
    convertMutateAsync.mockResolvedValue(202);
    sessionStorage.clear();
  });

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

  it("marks dirty when the draft name changes", () => {
    const { result } = renderHook(() =>
      useCatalogueDraft({ clientId: 1, items: [{ id: 1 }] as never[] })
    );

    act(() => {
      result.current.setDraftName("Fresh name");
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it("marks dirty when items are cleared back to empty", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [{ id: 1 }] as never[] } }
    );

    rerender({ items: [] as never[] });
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

  it("surfaces a draft-name-specific save error when client and items exist", () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(() =>
      useCatalogueDraft({ clientId: 1, items: [item] })
    );

    result.current.saveDraft();

    expect(toastError).toHaveBeenCalledWith("Draft name is required to save");
    expect(saveDraftMutate).not.toHaveBeenCalled();
  });

  it("serializes concurrent saves so only one draft request is fired", async () => {
    let resolveSave: ((value: { draftId: number }) => void) | undefined;
    saveDraftMutateAsync.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSave = resolve;
        })
    );

    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(() =>
      useCatalogueDraft({ clientId: 1, items: [item] })
    );

    act(() => {
      result.current.setDraftName("March Mix");
    });

    act(() => {
      result.current.saveDraft();
      result.current.saveDraft();
    });

    expect(saveDraftMutateAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.({ draftId: 333 });
    });
  });

  it("writes session storage from the conversion snapshot", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      category: 'Flower "Top Shelf"',
      vendor: "ACME",
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(() =>
      useCatalogueDraft({ clientId: 7, items: [item] })
    );

    await act(async () => {
      await result.current.handleConvertToOrder();
    });

    expect(convertMutateAsync).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("salesSheetToQuote")).toContain('"clientId":7');
    expect(sessionStorage.getItem("salesSheetToQuote")).toContain("Blue Dream");
    expect(result.current.lastSavedSheetId).toBe(202);
  });
});
