import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCatalogueDraft } from "./useCatalogueDraft";

const {
  toastError,
  toastSuccess,
  saveDraftMutate,
  saveDraftMutateAsync,
  deleteDraftMutate,
  convertMutateAsync,
  shareLinkMutateAsync,
  fetchDraftById,
  invalidateDrafts,
} = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  saveDraftMutate: vi.fn(),
  saveDraftMutateAsync: vi.fn(),
  deleteDraftMutate: vi.fn(),
  convertMutateAsync: vi.fn(),
  shareLinkMutateAsync: vi.fn(),
  fetchDraftById: vi.fn(),
  invalidateDrafts: vi.fn(),
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
        useMutation: vi.fn(() => ({ mutateAsync: shareLinkMutateAsync })),
      },
      save: {
        useMutation: vi.fn(() => ({
          mutateAsync: convertMutateAsync,
          isPending: false,
        })),
      },
    },
    useUtils: vi.fn(() => ({
      salesSheets: {
        getDrafts: { invalidate: invalidateDrafts },
        getDraftById: { fetch: fetchDraftById },
      },
    })),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

describe("useCatalogueDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraftMutateAsync.mockResolvedValue({ draftId: 101 });
    convertMutateAsync.mockResolvedValue(202);
    shareLinkMutateAsync.mockResolvedValue({
      shareUrl: "/shared/sales-sheet/test-token",
    });
    sessionStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
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

  it("finalizes the current catalogue into a shareable sheet", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
    );

    let sheetId: number | null = null;
    await act(async () => {
      sheetId = await result.current.saveSheet();
    });

    expect(sheetId).toBe(202);
    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
      expect(result.current.canShare).toBe(true);
    });
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

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
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

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
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
    expect(sessionStorage.getItem("salesSheetToQuote")).toContain(
      '"clientId":7'
    );
    expect(sessionStorage.getItem("salesSheetToQuote")).toContain("Blue Dream");
    expect(result.current.lastSavedSheetId).toBe(202);
  });

  it("copies an absolute share link after a finalized save", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
    );

    await act(async () => {
      await result.current.saveSheet();
    });

    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
      expect(result.current.canShare).toBe(true);
    });

    let shareUrl: string | null = null;
    await act(async () => {
      shareUrl = await result.current.generateShareLink();
    });

    expect(shareUrl).toBe(
      "http://localhost:3000/shared/sales-sheet/test-token"
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/shared/sales-sheet/test-token"
    );
    expect(result.current.lastShareUrl).toBe(
      "http://localhost:3000/shared/sales-sheet/test-token"
    );
    expect(toastSuccess).toHaveBeenCalledWith("Share link copied to clipboard");
  });

  it("surfaces a loud error when share is requested without a finalized sheet", async () => {
    const { result } = renderHook(() =>
      useCatalogueDraft({
        clientId: 1,
        items: [{ id: 1 }] as never[],
      })
    );

    let shareUrl: string | null = "initial" as string | null;
    await act(async () => {
      shareUrl = await result.current.generateShareLink();
    });

    expect(shareUrl).toBeNull();
    expect(toastError).toHaveBeenCalledWith(
      "Save the catalogue before generating a share link"
    );
    expect(shareLinkMutateAsync).not.toHaveBeenCalled();
  });

  it("surfaces a loud error when share is requested with unsaved changes", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result, rerender } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
    );

    await act(async () => {
      await result.current.saveSheet();
    });

    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
    });

    // Dirty the catalogue with new items
    rerender({
      items: [item, { ...item, id: 2 }] as never[],
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    shareLinkMutateAsync.mockClear();
    toastError.mockClear();

    let shareUrl: string | null = "initial" as string | null;
    await act(async () => {
      shareUrl = await result.current.generateShareLink();
    });

    expect(shareUrl).toBeNull();
    expect(toastError).toHaveBeenCalledWith(
      "Save your latest changes before generating a share link"
    );
    expect(shareLinkMutateAsync).not.toHaveBeenCalled();
  });

  it("surfaces a loud error when the share-link server call fails", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
    );

    await act(async () => {
      await result.current.saveSheet();
    });

    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
    });

    shareLinkMutateAsync.mockRejectedValueOnce(
      new Error("network unavailable")
    );
    toastError.mockClear();

    let shareUrl: string | null = "initial" as string | null;
    await act(async () => {
      shareUrl = await result.current.generateShareLink();
    });

    expect(shareUrl).toBeNull();
    expect(toastError).toHaveBeenCalledWith(
      "Failed to generate share link: network unavailable"
    );
  });

  it("surfaces a loud error when the share-link response has no URL", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [item] as never[] } }
    );

    await act(async () => {
      await result.current.saveSheet();
    });

    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
    });

    shareLinkMutateAsync.mockResolvedValueOnce({});
    toastError.mockClear();

    let shareUrl: string | null = "initial" as string | null;
    await act(async () => {
      shareUrl = await result.current.generateShareLink();
    });

    expect(shareUrl).toBeNull();
    expect(toastError).toHaveBeenCalledWith(
      "Share link could not be generated — the server returned no URL"
    );
  });
});
