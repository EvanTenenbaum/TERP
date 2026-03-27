import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { PricedInventoryItem, DraftInfo } from "@/components/sales/types";

const AUTO_SAVE_INTERVAL_MS = 30_000;

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

  // Gating
  canShare: boolean;
  canConvert: boolean;
  lastSavedSheetId: number | null;

  // Actions
  saveDraft: () => void;
  loadDraft: (draftId: number) => Promise<PricedInventoryItem[]>;
  deleteDraft: () => void;
  handleConvertToOrder: () => void;

  // Share
  generateShareLink: () => Promise<void>;

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

  // ── refs for stale-closure-safe auto-save ───────────────────────────────
  const isInitialLoad = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeletingDraftRef = useRef(false);
  const lastDeletedDraftIdRef = useRef<number | null>(null);
  const selectedItemsRef = useRef<PricedInventoryItem[]>([]);
  const draftNameRef = useRef("");
  const selectedClientIdRef = useRef<number | null>(null);
  const currentDraftIdRef = useRef<number | null>(null);

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

  // ── mutations ───────────────────────────────────────────────────────────
  const saveDraftMutation = trpc.salesSheets.saveDraft.useMutation({
    onSuccess: data => {
      // Server returns { draftId }, not { id }
      if (data?.draftId && !currentDraftIdRef.current) {
        setCurrentDraftId(data.draftId);
      }
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      void utils.salesSheets.getDrafts.invalidate();
    },
    onError: (error, variables) => {
      if (
        variables.draftId !== undefined &&
        variables.draftId === lastDeletedDraftIdRef.current
      ) {
        return;
      }
      toast.error("Failed to save draft: " + error.message);
    },
  });

  const deleteDraftMutation = trpc.salesSheets.deleteDraft.useMutation({
    onSuccess: () => {
      isDeletingDraftRef.current = false;
      lastDeletedDraftIdRef.current = currentDraftIdRef.current;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setCurrentDraftId(null);
      currentDraftIdRef.current = null;
      setDraftName("");
      setLastSaveTime(null);
      setHasUnsavedChanges(false);
      void utils.salesSheets.getDrafts.invalidate();
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

  const convertMutation = trpc.salesSheets.save.useMutation({
    onSuccess: (sheetId: number) => {
      setLastSavedSheetId(sheetId);
      sessionStorage.setItem(
        "salesSheetToQuote",
        JSON.stringify({
          clientId,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            basePrice: item.basePrice,
            retailPrice: item.retailPrice,
            quantity: item.quantity,
            category: item.category,
            vendor: item.vendor,
            cogsMode: item.cogsMode,
            unitCogs: item.unitCogs,
            unitCogsMin: item.unitCogsMin,
            unitCogsMax: item.unitCogsMax,
            effectiveCogs: item.effectiveCogs,
            effectiveCogsBasis: item.effectiveCogsBasis,
          })),
        })
      );
    },
    onError: error => {
      toast.error("Failed to convert: " + error.message);
    },
  });

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
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (items.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [items]);

  // ── auto-save ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      isDeletingDraftRef.current ||
      !hasUnsavedChanges ||
      !clientId ||
      items.length === 0 ||
      !draftName.trim()
    ) {
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

      if (!cid || currentItems.length === 0 || !name.trim()) return;

      const totalValue = currentItems.reduce(
        (sum, item) => sum + item.retailPrice * item.quantity,
        0
      );

      saveDraftMutation.mutate({
        draftId: did ?? undefined,
        clientId: cid,
        name,
        items: currentItems,
        totalValue,
      });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, clientId, items, draftName, saveDraftMutation]);

  // ── actions ─────────────────────────────────────────────────────────────
  const saveDraft = useCallback(() => {
    if (!clientId || items.length === 0 || !draftName.trim()) {
      toast.error("Client and at least one item required to save");
      return;
    }

    const totalValue = items.reduce(
      (sum, item) => sum + item.retailPrice * item.quantity,
      0
    );

    saveDraftMutation.mutate({
      draftId: currentDraftId ?? undefined,
      clientId,
      name: draftName,
      items,
      totalValue,
    });
  }, [clientId, items, draftName, currentDraftId, saveDraftMutation]);

  const loadDraft = useCallback(
    async (draftId: number): Promise<PricedInventoryItem[]> => {
      const result = await utils.salesSheets.getDraftById.fetch({ draftId });
      if (result) {
        setCurrentDraftId(result.id);
        setDraftName(result.name ?? "");
        setLastSaveTime(
          result.updatedAt
            ? new Date(result.updatedAt as unknown as string)
            : null
        );
        setHasUnsavedChanges(false);
        isInitialLoad.current = true;
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

  const generateShareLink = useCallback(async () => {
    // Share link requires a finalized sheet ID, not a draft ID.
    // salesSheets.generateShareLink operates on the salesSheetHistory table.
    if (!lastSavedSheetId || hasUnsavedChanges) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        sheetId: lastSavedSheetId,
        expiresInDays: 7,
      });
      if (result?.shareUrl) {
        await navigator.clipboard.writeText(result.shareUrl);
        toast.success("Share link copied to clipboard");
      }
    } catch {
      toast.error("Failed to generate share link");
    }
  }, [lastSavedSheetId, hasUnsavedChanges, shareLinkMutation]);

  const handleConvertToOrder = useCallback(() => {
    if (!clientId || items.length === 0 || hasUnsavedChanges) return;

    const totalValue = items.reduce(
      (sum, item) => sum + item.retailPrice * item.quantity,
      0
    );

    convertMutation.mutate({
      clientId,
      items,
      totalValue,
    });
  }, [clientId, items, hasUnsavedChanges, convertMutation]);

  const resetDraft = useCallback(() => {
    setCurrentDraftId(null);
    currentDraftIdRef.current = null;
    setDraftName("");
    setLastSaveTime(null);
    setHasUnsavedChanges(false);
    isInitialLoad.current = true;
  }, []);

  return {
    currentDraftId,
    draftName,
    setDraftName,
    hasUnsavedChanges,
    lastSaveTime,
    isSaving: saveDraftMutation.isPending,
    // Share requires a FINALIZED sheet ID (not a draft).
    // The generateShareLink API operates on salesSheetHistory, not drafts.
    // canShare is true only after salesSheets.save has been called and returned a sheetId.
    canShare:
      !hasUnsavedChanges && lastSavedSheetId !== null && items.length > 0,
    canConvert: !hasUnsavedChanges && clientId !== null && items.length > 0,
    lastSavedSheetId,
    saveDraft,
    loadDraft,
    deleteDraft,
    handleConvertToOrder,
    generateShareLink,
    drafts,
    draftsLoading: draftsQuery.isLoading,
    resetDraft,
  };
}
