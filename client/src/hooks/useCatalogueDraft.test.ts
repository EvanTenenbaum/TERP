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
} = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  saveDraftMutate: vi.fn(),
  saveDraftMutateAsync: vi.fn(),
  deleteDraftMutate: vi.fn(),
  convertMutateAsync: vi.fn(),
  shareLinkMutateAsync: vi.fn(),
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
      salesSheets: { getDrafts: { invalidate: vi.fn() } },
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
      expect(result.current.canConvert).toBe(true);
    });
  });

  it("keeps conversion gated off until the catalogue has been finalized", async () => {
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

    expect(result.current.canConvert).toBe(false);

    await act(async () => {
      await result.current.saveSheet();
    });

    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
      expect(result.current.canConvert).toBe(true);
    });
  });

  it("keeps share and conversion enabled across no-op rerenders with cloned item arrays", async () => {
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
      expect(result.current.canShare).toBe(true);
      expect(result.current.canConvert).toBe(true);
    });

    rerender({
      items: [{ ...item }] as never[],
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.canShare).toBe(true);
    expect(result.current.canConvert).toBe(true);
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

  it("keeps the auto-save timer stable across no-op rerenders", async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    try {
      const items = [
        {
          id: 1,
          name: "Blue Dream",
          basePrice: 10,
          retailPrice: 20,
          quantity: 2,
          priceMarkup: 0,
          appliedRules: [],
        } as never,
      ] as never[];

      const { result, rerender } = renderHook(
        ({ currentItems }) =>
          useCatalogueDraft({ clientId: 1, items: currentItems }),
        { initialProps: { currentItems: items } }
      );

      act(() => {
        result.current.setDraftName("March Mix");
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      rerender({
        currentItems: items.map(item => ({ ...item })) as never[],
      });
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      expect(saveDraftMutateAsync).toHaveBeenCalledTimes(1);
    } finally {
      setTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("serializes concurrent sheet finalization so only one save request is fired", async () => {
    let resolveSheet: ((value: number) => void) | undefined;
    convertMutateAsync.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSheet = resolve;
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

    let firstSave!: Promise<number | null>;
    let secondSave!: Promise<number | null>;
    act(() => {
      firstSave = result.current.saveSheet();
      secondSave = result.current.saveSheet();
    });

    expect(convertMutateAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSheet?.(202);
      await Promise.all([firstSave, secondSave]);
    });
  });

  it("drops stale finalized-sheet results after the draft context resets", async () => {
    let resolveSheet: ((value: number) => void) | undefined;
    convertMutateAsync.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSheet = resolve;
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

    let savePromise!: Promise<number | null>;
    act(() => {
      savePromise = result.current.saveSheet();
    });

    act(() => {
      result.current.resetDraft();
    });

    let finalizedSheetId: number | null = 999;
    await act(async () => {
      resolveSheet?.(202);
      finalizedSheetId = await savePromise;
    });

    expect(finalizedSheetId).toBeNull();
    expect(result.current.lastSavedSheetId).toBeNull();
    expect(result.current.canShare).toBe(false);
    expect(toastSuccess).not.toHaveBeenCalledWith("Catalogue saved for sharing");
  });

  it("flags finalization immediately while a sheet save is in flight", async () => {
    let resolveSheet: ((value: number) => void) | undefined;
    convertMutateAsync.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveSheet = resolve;
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

    let savePromise!: Promise<number | null>;
    act(() => {
      savePromise = result.current.saveSheet();
    });

    expect(result.current.isFinalizing).toBe(true);
    expect(result.current.isConverting).toBe(true);

    await act(async () => {
      resolveSheet?.(202);
      await savePromise;
    });
  });

  it("writes session storage from the finalized conversion snapshot", async () => {
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

    const { result } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 7, items }),
      { initialProps: { items: [item] as never[] } }
    );

    await act(async () => {
      await result.current.saveSheet();
    });

    await waitFor(() => {
      expect(result.current.lastSavedSheetId).toBe(202);
      expect(result.current.canConvert).toBe(true);
    });

    const onReady = vi.fn();
    await act(async () => {
      await result.current.handleConvertToOrder(onReady);
    });

    expect(convertMutateAsync).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("salesSheetToQuote")).toContain(
      '"clientId":7'
    );
    expect(sessionStorage.getItem("salesSheetToQuote")).toContain("Blue Dream");
    expect(result.current.lastSavedSheetId).toBe(202);
  });

  it("keeps conversion locked until the caller finishes the order handoff", async () => {
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

    let resolveHandoff: (() => void) | undefined;
    const onReady = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveHandoff = resolve;
        })
    );

    let firstConversion!: Promise<boolean>;
    act(() => {
      firstConversion = result.current.handleConvertToOrder(onReady);
    });

    await waitFor(() => {
      expect(result.current.isConverting).toBe(true);
    });

    let secondConversion = true;
    await act(async () => {
      secondConversion = await result.current.handleConvertToOrder(vi.fn());
    });

    expect(secondConversion).toBe(false);

    await act(async () => {
      resolveHandoff?.();
      await firstConversion;
    });

    expect(result.current.isConverting).toBe(false);
  });

  it("fails conversion preparation loudly when session storage cannot be written", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    const originalSessionStorage = window.sessionStorage;
    const corruptedStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(() => "corrupted"),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as typeof window.sessionStorage;

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: corruptedStorage,
    });

    try {
      const { result } = renderHook(
        ({ items }) => useCatalogueDraft({ clientId: 1, items }),
        { initialProps: { items: [item] as never[] } }
      );

      await act(async () => {
        await result.current.saveSheet();
      });

      let converted = true;
      await act(async () => {
        converted = await result.current.handleConvertToOrder(vi.fn());
      });

      expect(converted).toBe(false);
      expect(toastError).toHaveBeenCalledWith(
        "Failed to prepare order handoff: conversion handoff could not be verified"
      );
    } finally {
      Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        value: originalSessionStorage,
      });
    }
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

  it("returns the share link even when clipboard copy is unavailable", async () => {
    const item = {
      id: 1,
      name: "Blue Dream",
      basePrice: 10,
      retailPrice: 20,
      quantity: 2,
      priceMarkup: 0,
      appliedRules: [],
    } as never;

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi
          .fn()
          .mockRejectedValue(new Error("clipboard access denied")),
      },
      configurable: true,
    });

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
    expect(toastSuccess).toHaveBeenCalledWith("Share link ready");
    expect(toastError).not.toHaveBeenCalledWith("Failed to generate share link");
  });
});
