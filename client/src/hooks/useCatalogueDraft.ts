import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { PricedInventoryItem, DraftInfo } from "@/components/sales/types";

const AUTO_SAVE_INTERVAL_MS = 30_000;

function toAbsoluteShareUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function buildSheetItemSnapshot(item: PricedInventoryItem) {
  return {
    id: item.id,
    name: item.name,
    basePrice: item.basePrice,
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    category: item.category,
    vendor: item.vendor,
    imageUrl: item.imageUrl,
    cogsMode: item.cogsMode,
    unitCogs: item.unitCogs,
    unitCogsMin: item.unitCogsMin,
    unitCogsMax: item.unitCogsMax,
    effectiveCogs: item.effectiveCogs,
    effectiveCogsBasis: item.effectiveCogsBasis,
    priceMarkup: item.priceMarkup,
    appliedRules: item.appliedRules,
  };
}

function buildSheetItems(sourceItems: PricedInventoryItem[]) {
  return sourceItems.map(buildSheetItemSnapshot);
}

function buildItemsFingerprint(sourceItems: PricedInventoryItem[]) {
  return JSON.stringify(buildSheetItems(sourceItems));
}

function buildAutoDraftName(now = new Date()) {
  return `Sales Catalogue ${now.toISOString().slice(0, 16).replace("T", " ")}`;
}

interface UseCatalogueDraftOptions {
  clientId: number | null;
  items: PricedInventoryItem[];
}

interface UseCatalogueDraftReturn {
  // Draft identity
  currentDraftId: number | null;
  draftName: string;
  setDraftName: (name: string) => void;

  // State
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  isSaving: boolean;
  isDeleting: boolean;
  isFinalizing: boolean;
  lastShareUrl: string | null;

  // Gating
  canShare: boolean;
  canConvert: boolean;
  canGoLive: boolean;
  lastSavedSheetId: number | null;
  isConverting: boolean;

  // Actions
  saveDraft: () => void;
  saveSheet: () => Promise<number | null>;
  loadDraft: (draftId: number) => Promise<PricedInventoryItem[]>;
  deleteDraft: () => void;
  deleteDraftById: (draftId: number) => void;
  handleConvertToOrder: (onReady: () => void | Promise<void>) => Promise<boolean>;
  markSheetAsLoaded: (
    sheetId: number | null,
    sheetItems?: PricedInventoryItem[]
  ) => void;

  // Share
  generateShareLink: () => Promise<string | null>;

  // Drafts list
  drafts: DraftInfo[];
  draftsLoading: boolean;

  // Reset
  resetDraft: () => void;
}

export function useCatalogueDraft({
  clientId,
  items,
}: UseCatalogueDraftOptions): UseCatalogueDraftReturn {
  const utils = trpc.useUtils();

  // ── draft state ─────────────────────────────────────────────────────────
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaveLocked, setIsSaveLocked] = useState(false);
  const [isFinalizingLocked, setIsFinalizingLocked] = useState(false);
  const [isConvertingToOrder, setIsConvertingToOrder] = useState(false);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);

  // ── refs for stale-closure-safe auto-save ───────────────────────────────
  const isItemsInitialLoadRef = useRef(true);
  const isDraftNameInitialLoadRef = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeletingDraftRef = useRef(false);
  const saveLockRef = useRef(false);
  const sheetSaveLockRef = useRef(false);
  const convertToOrderLockRef = useRef(false);
  const lastDeletedDraftIdRef = useRef<number | null>(null);
  const selectedItemsRef = useRef<PricedInventoryItem[]>([]);
  const draftNameRef = useRef("");
  const previousDraftNameRef = useRef(draftName);
  const selectedClientIdRef = useRef<number | null>(null);
  const currentDraftIdRef = useRef<number | null>(null);
  const contextTokenRef = useRef(0);
  const finalizedItemsFingerprintRef = useRef<string | null>(null);

  // ── keep refs in sync ───────────────────────────────────────────────────
  useEffect(() => {
    selectedItemsRef.current = items;
  }, [items]);
  useEffect(() => {
    draftNameRef.current = draftName;
  }, [draftName]);
  useEffect(() => {
    selectedClientIdRef.current = clientId;
  }, [clientId]);
  useEffect(() => {
    currentDraftIdRef.current = currentDraftId;
  }, [currentDraftId]);

  const itemsFingerprint = useMemo(() => buildItemsFingerprint(items), [items]);

  // ── mutations ───────────────────────────────────────────────────────────
  const saveDraftMutation = trpc.salesSheets.saveDraft.useMutation();
  const saveSheetMutation = trpc.salesSheets.save.useMutation();
  const saveDraftMutateAsyncRef = useRef(saveDraftMutation.mutateAsync);
  const saveSheetMutateAsyncRef = useRef(saveSheetMutation.mutateAsync);
  const invalidateDraftsRef = useRef(utils.salesSheets.getDrafts.invalidate);

  useEffect(() => {
    saveDraftMutateAsyncRef.current = saveDraftMutation.mutateAsync;
  }, [saveDraftMutation.mutateAsync]);
  useEffect(() => {
    saveSheetMutateAsyncRef.current = saveSheetMutation.mutateAsync;
  }, [saveSheetMutation.mutateAsync]);
  useEffect(() => {
    invalidateDraftsRef.current = utils.salesSheets.getDrafts.invalidate;
  }, [utils.salesSheets.getDrafts.invalidate]);

  const deleteDraftMutation = trpc.salesSheets.deleteDraft.useMutation({
    onSuccess: (_data, variables) => {
      isDeletingDraftRef.current = false;
      lastDeletedDraftIdRef.current = variables.draftId;
      const deletedCurrentDraft =
        variables.draftId === currentDraftIdRef.current;

      if (deletedCurrentDraft && autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      if (deletedCurrentDraft) {
        setCurrentDraftId(null);
        currentDraftIdRef.current = null;
        setDraftName("");
        setLastSavedSheetId(null);
        finalizedItemsFingerprintRef.current = null;
        setLastShareUrl(null);
        setLastSaveTime(null);
        setHasUnsavedChanges(false);
      }

      void invalidateDraftsRef.current();
      toast.success("Draft deleted");
    },
    onError: error => {
      isDeletingDraftRef.current = false;
      toast.error("Failed to delete draft: " + error.message);
    },
  });

  const shareLinkMutation = trpc.salesSheets.generateShareLink.useMutation();

  // Track the last finalized sheet ID — needed for share link generation.
  // salesSheets.save returns a number (the sheetId), not an object.
  const [lastSavedSheetId, setLastSavedSheetId] = useState<number | null>(null);

  // ── queries ─────────────────────────────────────────────────────────────
  const draftsQuery = trpc.salesSheets.getDrafts.useQuery(
    { clientId: clientId ?? undefined },
    { enabled: clientId !== null }
  );

  const drafts: DraftInfo[] = (draftsQuery.data ?? []).map(
    (d: Record<string, unknown>) => ({
      id: d.id as number,
      name: d.name as string,
      clientId: d.clientId as number,
      itemCount: d.itemCount as number,
      totalValue: d.totalValue as string,
      updatedAt: d.updatedAt as Date | null,
      createdAt: d.createdAt as Date | null,
    })
  );

  // ── mark dirty on item changes ──────────────────────────────────────────
  useEffect(() => {
    if (isItemsInitialLoadRef.current) {
      isItemsInitialLoadRef.current = false;
      return;
    }
    setLastShareUrl(null);
    setHasUnsavedChanges(true);
  }, [itemsFingerprint]);

  useEffect(() => {
    if (isDraftNameInitialLoadRef.current) {
      isDraftNameInitialLoadRef.current = false;
      previousDraftNameRef.current = draftName;
      return;
    }

    if (draftName === previousDraftNameRef.current) return;

    previousDraftNameRef.current = draftName;
    setLastShareUrl(null);
    setHasUnsavedChanges(true);
  }, [draftName]);

  const persistDraft = useCallback(
    async ({
      draftId,
      clientId,
      name,
      items,
      invalidateFinalizedSheetState = false,
    }: {
      draftId?: number;
      clientId: number;
      name: string;
      items: PricedInventoryItem[];
      invalidateFinalizedSheetState?: boolean;
    }) => {
      if (saveLockRef.current) return false;

      const contextToken = contextTokenRef.current;
      saveLockRef.current = true;
      setIsSaveLocked(true);

      try {
        const totalValue = items.reduce(
          (sum, item) => sum + item.retailPrice * item.quantity,
          0
        );

        const data = await saveDraftMutateAsyncRef.current({
          draftId,
          clientId,
          name,
          items,
          totalValue,
        });

        if (
          contextToken !== contextTokenRef.current ||
          clientId !== selectedClientIdRef.current
        ) {
          return false;
        }

        if (data?.draftId && !currentDraftIdRef.current) {
          setCurrentDraftId(data.draftId);
          currentDraftIdRef.current = data.draftId;
        }

        if (
          invalidateFinalizedSheetState &&
          finalizedItemsFingerprintRef.current !== null &&
          buildItemsFingerprint(items) !== finalizedItemsFingerprintRef.current
        ) {
          setLastSavedSheetId(null);
          finalizedItemsFingerprintRef.current = null;
          setLastShareUrl(null);
        }

        setHasUnsavedChanges(false);
        setLastSaveTime(new Date());
        void invalidateDraftsRef.current();
        return true;
      } catch (error) {
        if (
          draftId !== undefined &&
          draftId === lastDeletedDraftIdRef.current
        ) {
          return false;
        }

        if (contextToken === contextTokenRef.current) {
          toast.error(
            "Failed to save draft: " +
              (error instanceof Error ? error.message : "Unknown error")
          );
        }
        return false;
      } finally {
        saveLockRef.current = false;
        setIsSaveLocked(false);
      }
    },
    []
  );

  // ── auto-save ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      isDeletingDraftRef.current ||
      saveLockRef.current ||
      !hasUnsavedChanges ||
      !clientId ||
      !draftName.trim()
    ) {
      return;
    }

    if (itemsFingerprint === "[]" && currentDraftIdRef.current === null) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const currentItems = selectedItemsRef.current;
      const name = draftNameRef.current;
      const cid = selectedClientIdRef.current;
      const did = currentDraftIdRef.current;

      if (!cid || !name.trim()) return;
      if (currentItems.length === 0 && did === null) return;

      void persistDraft({
        draftId: did ?? undefined,
        clientId: cid,
        name,
        items: currentItems,
        invalidateFinalizedSheetState: true,
      });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, clientId, itemsFingerprint, draftName, persistDraft]);

  // ── actions ─────────────────────────────────────────────────────────────
  const saveDraft = useCallback(() => {
    if (saveLockRef.current) {
      toast.info("Save already in progress");
      return;
    }

    if (!clientId) {
      toast.error("Select a client before saving");
      return;
    }

    if (items.length === 0 && currentDraftId === null) {
      toast.error("Add at least one item before saving");
      return;
    }

    if (!draftName.trim()) {
      toast.error("Draft name is required to save");
      return;
    }

    void persistDraft({
      draftId: currentDraftId ?? undefined,
      clientId,
      name: draftName,
      items,
      invalidateFinalizedSheetState: true,
    });
  }, [clientId, currentDraftId, draftName, items, persistDraft]);

  const loadDraft = useCallback(
    async (draftId: number): Promise<PricedInventoryItem[]> => {
      contextTokenRef.current += 1;
      const result = await utils.salesSheets.getDraftById.fetch({ draftId });
      if (result) {
        setCurrentDraftId(result.id);
        currentDraftIdRef.current = result.id;
        setDraftName(result.name ?? "");
        previousDraftNameRef.current = result.name ?? "";
        setLastSavedSheetId(null);
        finalizedItemsFingerprintRef.current = null;
        setLastShareUrl(null);
        setLastSaveTime(
          result.updatedAt
            ? new Date(result.updatedAt as unknown as string)
            : null
        );
        setHasUnsavedChanges(false);
        isItemsInitialLoadRef.current = true;
        isDraftNameInitialLoadRef.current = true;
        return result.items as PricedInventoryItem[];
      }
      return [];
    },
    [utils.salesSheets.getDraftById]
  );

  const deleteDraft = useCallback(() => {
    if (!currentDraftId) return;
    isDeletingDraftRef.current = true;
    deleteDraftMutation.mutate({ draftId: currentDraftId });
  }, [currentDraftId, deleteDraftMutation]);

  const deleteDraftById = useCallback(
    (draftId: number) => {
      isDeletingDraftRef.current = true;
      deleteDraftMutation.mutate({ draftId });
    },
    [deleteDraftMutation]
  );

  const saveSheet = useCallback(async () => {
    if (!clientId || items.length === 0 || sheetSaveLockRef.current) {
      return null;
    }

    if (saveLockRef.current) {
      toast.error("Draft save is already in progress");
      return null;
    }

    const contextToken = contextTokenRef.current;
    const normalizedDraftName = draftName.trim();
    const finalDraftName = normalizedDraftName || buildAutoDraftName();

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    sheetSaveLockRef.current = true;
    setIsFinalizingLocked(true);
    try {
      const draftPersisted = await persistDraft({
        draftId: currentDraftId ?? undefined,
        clientId,
        name: finalDraftName,
        items,
        invalidateFinalizedSheetState: false,
      });

      if (!draftPersisted) {
        return null;
      }

      if (!normalizedDraftName) {
        previousDraftNameRef.current = finalDraftName;
        setDraftName(finalDraftName);
      }

      if (
        contextToken !== contextTokenRef.current ||
        clientId !== selectedClientIdRef.current
      ) {
        return null;
      }

      const sheetItems = buildSheetItems(items);
      const totalValue = sheetItems.reduce(
        (sum, item) => sum + item.retailPrice * item.quantity,
        0
      );

      const sheetId = await saveSheetMutateAsyncRef.current({
        clientId,
        items: sheetItems,
        totalValue,
      });

      if (
        contextToken !== contextTokenRef.current ||
        clientId !== selectedClientIdRef.current
      ) {
        return null;
      }

      setLastSavedSheetId(sheetId);
      finalizedItemsFingerprintRef.current = itemsFingerprint;
      setLastShareUrl(null);
      setLastSaveTime(new Date());
      setHasUnsavedChanges(false);
      toast.success("Catalogue saved for sharing");
      return sheetId;
    } catch (error) {
      if (
        contextToken !== contextTokenRef.current ||
        clientId !== selectedClientIdRef.current
      ) {
        return null;
      }

      toast.error(
        "Failed to save sheet: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      return null;
    } finally {
      sheetSaveLockRef.current = false;
      setIsFinalizingLocked(false);
    }
  }, [
    clientId,
    currentDraftId,
    draftName,
    items,
    itemsFingerprint,
    persistDraft,
  ]);

  const generateShareLink = useCallback(async () => {
    // Share link requires a finalized sheet ID, not a draft ID.
    // salesSheets.generateShareLink operates on the salesSheetHistory table.
    if (!lastSavedSheetId || hasUnsavedChanges) return null;
    try {
      const result = await shareLinkMutation.mutateAsync({
        sheetId: lastSavedSheetId,
        expiresInDays: 7,
      });
      if (result?.shareUrl) {
        const absoluteShareUrl = toAbsoluteShareUrl(result.shareUrl);
        setLastShareUrl(absoluteShareUrl);
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(absoluteShareUrl);
            toast.success("Share link copied to clipboard");
          } catch {
            toast.success("Share link ready");
          }
        } else {
          toast.success("Share link ready");
        }
        return absoluteShareUrl;
      }
      return null;
    } catch {
      toast.error("Failed to generate share link");
      return null;
    }
  }, [lastSavedSheetId, hasUnsavedChanges, shareLinkMutation]);

  const handleConvertToOrder = useCallback(
    async (onReady: () => void | Promise<void>) => {
      if (
        !clientId ||
        items.length === 0 ||
        hasUnsavedChanges ||
        saveLockRef.current ||
        sheetSaveLockRef.current ||
        convertToOrderLockRef.current ||
        !lastSavedSheetId
      ) {
        return false;
      }

      convertToOrderLockRef.current = true;
      setIsConvertingToOrder(true);

      const contextToken = contextTokenRef.current;
      const conversionItems = buildSheetItems(items);

      const handoffPayload = JSON.stringify({
        clientId,
        items: conversionItems,
      });
      let handoffPrepared = false;

      try {
        sessionStorage.setItem("salesSheetToQuote", handoffPayload);

        if (sessionStorage.getItem("salesSheetToQuote") !== handoffPayload) {
          throw new Error("conversion handoff could not be verified");
        }

        handoffPrepared = true;
        await onReady();

        if (
          contextToken !== contextTokenRef.current ||
          clientId !== selectedClientIdRef.current
        ) {
          sessionStorage.removeItem("salesSheetToQuote");
          toast.error(
            "Failed to complete order handoff: catalogue context changed"
          );
          return false;
        }

        return true;
      } catch (error) {
        if (handoffPrepared) {
          sessionStorage.removeItem("salesSheetToQuote");
        }
        toast.error(
          `${handoffPrepared ? "Failed to complete" : "Failed to prepare"} order handoff: ` +
            (error instanceof Error ? error.message : "Unknown error")
        );
        return false;
      } finally {
        convertToOrderLockRef.current = false;
        setIsConvertingToOrder(false);
      }
    },
    [clientId, lastSavedSheetId, items, hasUnsavedChanges]
  );

  const markSheetAsLoaded = useCallback(
    (sheetId: number | null, sheetItems?: PricedInventoryItem[]) => {
      setLastSavedSheetId(sheetId);
      finalizedItemsFingerprintRef.current =
        sheetId === null
          ? null
          : buildItemsFingerprint(sheetItems ?? selectedItemsRef.current);
      setLastShareUrl(null);
    },
    []
  );

  const resetDraft = useCallback(() => {
    contextTokenRef.current += 1;
    setCurrentDraftId(null);
    currentDraftIdRef.current = null;
    setDraftName("");
    previousDraftNameRef.current = "";
    setLastSavedSheetId(null);
    finalizedItemsFingerprintRef.current = null;
    setLastShareUrl(null);
    setLastSaveTime(null);
    setHasUnsavedChanges(false);
    isItemsInitialLoadRef.current = true;
    isDraftNameInitialLoadRef.current = true;
  }, []);

  return {
    currentDraftId,
    draftName,
    setDraftName,
    hasUnsavedChanges,
    lastSaveTime,
    isSaving: saveDraftMutation.isPending || isSaveLocked,
    isDeleting: deleteDraftMutation.isPending,
    isFinalizing: saveSheetMutation.isPending || isFinalizingLocked,
    lastShareUrl,
    // Share requires a FINALIZED sheet ID (not a draft).
    // The generateShareLink API operates on salesSheetHistory, not drafts.
    // canShare is true only after salesSheets.save has been called and returned a sheetId.
    canShare:
      !hasUnsavedChanges && lastSavedSheetId !== null && items.length > 0,
    canConvert:
      !hasUnsavedChanges &&
      clientId !== null &&
      lastSavedSheetId !== null &&
      items.length > 0,
    canGoLive:
      !hasUnsavedChanges && lastSavedSheetId !== null && items.length > 0,
    lastSavedSheetId,
    isConverting: isConvertingToOrder,
    saveDraft,
    saveSheet,
    loadDraft,
    deleteDraft,
    deleteDraftById,
    handleConvertToOrder,
    markSheetAsLoaded,
    generateShareLink,
    drafts,
    draftsLoading: draftsQuery.isLoading,
    resetDraft,
  };
}
