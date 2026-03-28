import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FC,
} from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  buildSalesWorkspacePath,
  buildSheetNativeOrdersDocumentPath,
  buildSheetNativeOrdersPath,
} from "@/lib/workspaceRoutes";
import { normalizePositiveIntegerWithin } from "@/lib/quantity";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useSaveState, type SaveState } from "@/hooks/work-surface";
import { calculateLineItemFromRetailPrice } from "@/hooks/orders/useOrderCalculations";
import type {
  OrderAdjustment,
  LineItemMarginSource,
  LineItem,
  PaymentTerms,
} from "@/components/orders/types";
import { PAYMENT_TERMS_OPTIONS } from "@/components/orders/types";

export interface CreditCheckResult {
  allowed: boolean;
  warning?: string;
  requiresOverride: boolean;
  creditLimit: number;
  currentExposure: number;
  newExposure: number;
  availableCredit: number;
  utilizationPercent: number;
  enforcementMode: "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";
}

export interface InventoryItemForOrder {
  id: number;
  productId?: number;
  name: string;
  basePrice: number;
  cogsMode?: "FIXED" | "RANGE";
  unitCogs?: number;
  unitCogsMin?: number | null;
  unitCogsMax?: number | null;
  effectiveCogs?: number;
  effectiveCogsBasis?: "LOW" | "MID" | "HIGH" | "MANUAL";
  retailPrice?: number;
  priceMarkup?: number;
  appliedRules?: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
  orderQuantity?: number;
  quantity?: number;
}

export interface DraftLineItemPayload {
  id?: number;
  batchId: number;
  productId?: number | null;
  batchSku?: string | null;
  productDisplayName?: string | null;
  quantity: number | string;
  cogsPerUnit: number | string;
  originalCogsPerUnit: number | string;
  cogsMode?: "FIXED" | "RANGE" | null;
  unitCogsMin?: number | string | null;
  unitCogsMax?: number | string | null;
  effectiveCogsBasis?: "LOW" | "MID" | "HIGH" | "MANUAL" | null;
  originalRangeMin?: number | string | null;
  originalRangeMax?: number | string | null;
  isBelowVendorRange?: boolean | null;
  belowRangeReason?: string | null;
  isCogsOverridden: boolean;
  cogsOverrideReason?: string | null;
  marginPercent: number | string;
  marginDollar: number | string;
  isMarginOverridden: boolean;
  marginSource: LineItemMarginSource;
  profilePriceAdjustmentPercent?: number | string | null;
  appliedRules?: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }> | null;
  unitPrice: number | string;
  lineTotal: number | string;
  isSample: boolean;
}

export interface OrderDraftSnapshot {
  clientId: number | null;
  linkedNeedId: number | null;
  orderType: "QUOTE" | "SALE";
  referredByClientId: number | null;
  adjustment: OrderAdjustment | null;
  showAdjustmentOnDocument: boolean;
  freight: number;
  notes: string;
  paymentTerms: PaymentTerms;
  items: LineItem[];
}

function normalizePaymentTerms(
  value: string | null | undefined
): PaymentTerms {
  const normalized = (value ?? "").trim().toUpperCase();
  return PAYMENT_TERMS_OPTIONS.includes(normalized as PaymentTerms)
    ? (normalized as PaymentTerms)
    : "NET_30";
}

export const resolveInventoryPricingContext = (
  item: Pick<InventoryItemForOrder, "appliedRules" | "priceMarkup">
): {
  marginSource: LineItemMarginSource;
  profilePriceAdjustmentPercent: number | null;
} => {
  const hasProfileRuleMatch = (item.appliedRules?.length ?? 0) > 0;

  return {
    marginSource: hasProfileRuleMatch ? "CUSTOMER_PROFILE" : "DEFAULT",
    profilePriceAdjustmentPercent: hasProfileRuleMatch
      ? (item.priceMarkup ?? null)
      : null,
  };
};

export function resolveRouteSeedOrderType(
  routeMode: string | null | undefined
): "QUOTE" | "SALE" {
  return routeMode === "quote" ? "QUOTE" : "SALE";
}

export function shouldSeedComposerFromRoute(params: {
  routeOrderId: number | null;
  routeOrderLoading: boolean;
  isSalesSheetImport: boolean;
  routeMode: string | null | undefined;
  clientIdFromRoute: number | null;
  needIdFromRoute: number | null;
}): boolean {
  const {
    routeOrderId,
    routeOrderLoading,
    isSalesSheetImport,
    routeMode,
    clientIdFromRoute,
    needIdFromRoute,
  } = params;

  if (routeOrderId !== null || routeOrderLoading || isSalesSheetImport) {
    return false;
  }

  return (
    routeMode === "quote" ||
    clientIdFromRoute !== null ||
    needIdFromRoute !== null
  );
}

export function resolveOrderCostVisibility(settings?: {
  display?: {
    canViewCogsData?: boolean;
    showCogsInOrders?: boolean;
    showMarginInOrders?: boolean;
  };
}) {
  const canViewCogsData = Boolean(settings?.display?.canViewCogsData);

  return {
    showCogs: canViewCogsData && Boolean(settings?.display?.showCogsInOrders),
    showMargin:
      canViewCogsData && Boolean(settings?.display?.showMarginInOrders),
  };
}

export const normalizeFingerprintNumber = (
  value: number | null | undefined,
  precision = 4
): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(precision));
};

export const buildOrderFingerprint = (snapshot: OrderDraftSnapshot): string =>
  JSON.stringify({
    clientId: snapshot.clientId,
    linkedNeedId: snapshot.linkedNeedId,
    orderType: snapshot.orderType,
    referredByClientId: snapshot.referredByClientId,
    adjustment: snapshot.adjustment
      ? {
          amount: normalizeFingerprintNumber(snapshot.adjustment.amount, 2),
          mode: snapshot.adjustment.mode,
          type: snapshot.adjustment.type,
        }
      : null,
    showAdjustmentOnDocument: snapshot.showAdjustmentOnDocument,
    freight: normalizeFingerprintNumber(snapshot.freight, 2),
    notes: snapshot.notes.trim(),
    paymentTerms: snapshot.paymentTerms.trim(),
    items: snapshot.items.map(item => ({
      batchId: item.batchId,
      productId: item.productId ?? null,
      productDisplayName: item.productDisplayName ?? null,
      quantity: normalizeFingerprintNumber(item.quantity, 4),
      cogsPerUnit: normalizeFingerprintNumber(item.cogsPerUnit, 4),
      originalCogsPerUnit: normalizeFingerprintNumber(
        item.originalCogsPerUnit,
        4
      ),
      cogsMode: item.cogsMode ?? null,
      unitCogsMin: normalizeFingerprintNumber(item.unitCogsMin ?? null, 4),
      unitCogsMax: normalizeFingerprintNumber(item.unitCogsMax ?? null, 4),
      effectiveCogsBasis: item.effectiveCogsBasis ?? null,
      originalRangeMin: normalizeFingerprintNumber(
        item.originalRangeMin ?? null,
        4
      ),
      originalRangeMax: normalizeFingerprintNumber(
        item.originalRangeMax ?? null,
        4
      ),
      isBelowVendorRange: item.isBelowVendorRange ?? false,
      belowRangeReason: item.belowRangeReason ?? null,
      isCogsOverridden: item.isCogsOverridden,
      cogsOverrideReason: item.cogsOverrideReason ?? null,
      marginPercent: normalizeFingerprintNumber(item.marginPercent, 4),
      marginDollar: normalizeFingerprintNumber(item.marginDollar, 4),
      isMarginOverridden: item.isMarginOverridden,
      marginSource: item.marginSource,
      profilePriceAdjustmentPercent: normalizeFingerprintNumber(
        item.profilePriceAdjustmentPercent ?? null,
        4
      ),
      unitPrice: normalizeFingerprintNumber(item.unitPrice, 4),
      lineTotal: normalizeFingerprintNumber(item.lineTotal, 4),
      isSample: item.isSample,
    })),
  });

export const EMPTY_ORDER_FINGERPRINT = buildOrderFingerprint({
  clientId: null,
  linkedNeedId: null,
  orderType: "SALE",
  referredByClientId: null,
  adjustment: null,
  showAdjustmentOnDocument: true,
  freight: 0,
  notes: "",
  paymentTerms: "NET_30",
  items: [],
});

export const parseRouteEntityId = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const mapDraftLineItemsToEditorState = (
  lineItems: DraftLineItemPayload[]
): LineItem[] =>
  lineItems.map(item => ({
    id: item.id,
    batchId: item.batchId,
    batchSku: item.batchSku ?? undefined,
    productId: item.productId ?? undefined,
    productDisplayName: item.productDisplayName ?? "Unknown Product",
    quantity: Number(item.quantity),
    cogsPerUnit: Number(item.cogsPerUnit),
    originalCogsPerUnit: Number(item.originalCogsPerUnit),
    cogsMode: item.cogsMode ?? undefined,
    unitCogsMin:
      item.unitCogsMin !== null && item.unitCogsMin !== undefined
        ? Number(item.unitCogsMin)
        : null,
    unitCogsMax:
      item.unitCogsMax !== null && item.unitCogsMax !== undefined
        ? Number(item.unitCogsMax)
        : null,
    effectiveCogsBasis: item.effectiveCogsBasis ?? undefined,
    originalRangeMin:
      item.originalRangeMin !== null && item.originalRangeMin !== undefined
        ? Number(item.originalRangeMin)
        : null,
    originalRangeMax:
      item.originalRangeMax !== null && item.originalRangeMax !== undefined
        ? Number(item.originalRangeMax)
        : null,
    isBelowVendorRange: Boolean(item.isBelowVendorRange),
    belowRangeReason: item.belowRangeReason ?? undefined,
    isCogsOverridden: item.isCogsOverridden,
    cogsOverrideReason: item.cogsOverrideReason ?? undefined,
    marginPercent: Number(item.marginPercent),
    marginDollar: Number(item.marginDollar),
    isMarginOverridden: item.isMarginOverridden,
    marginSource: item.marginSource,
    profilePriceAdjustmentPercent:
      item.profilePriceAdjustmentPercent !== null &&
      item.profilePriceAdjustmentPercent !== undefined
        ? Number(item.profilePriceAdjustmentPercent)
        : null,
    appliedRules: item.appliedRules ?? [],
    unitPrice: Number(item.unitPrice),
    lineTotal: Number(item.lineTotal),
    isSample: item.isSample,
  }));

export function shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget(
  target: unknown
) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        '[data-powersheet-surface-id="orders-document-grid"]',
        ".ag-root-wrapper",
        ".ag-root-wrapper-body",
        ".ag-cell",
        ".ag-cell-inline-editing",
        ".ag-text-field-input",
      ].join(", ")
    )
  );
}

type OrderSurfaceVariant = "classic-create-order" | "sheet-native-orders";

export interface UseOrderDraftOptions {
  surfaceVariant?: OrderSurfaceVariant;
}

export interface UseOrderDraftReturn {
  clientId: number | null;
  setClientId: (value: number | null) => void;
  linkedNeedId: number | null;
  setLinkedNeedId: (value: number | null) => void;
  items: LineItem[];
  setItems: (value: LineItem[] | ((current: LineItem[]) => LineItem[])) => void;
  adjustment: OrderAdjustment | null;
  setAdjustment: (value: OrderAdjustment | null) => void;
  showAdjustmentOnDocument: boolean;
  setShowAdjustmentOnDocument: (value: boolean) => void;
  orderType: "QUOTE" | "SALE";
  setOrderType: (value: "QUOTE" | "SALE") => void;
  referredByClientId: number | null;
  setReferredByClientId: (value: number | null) => void;
  notes: string;
  setNotes: (value: string) => void;
  freight: number;
  setFreight: (value: number) => void;
  paymentTerms: PaymentTerms;
  setPaymentTerms: (value: PaymentTerms) => void;
  activeDraftId: number | null;
  activeDraftVersion: number | null;
  isSalesSheetImport: boolean;
  hasUnsavedChanges: boolean;
  isPersistingDraft: boolean;
  isFinalizingDraft: boolean;
  saveState: SaveState;
  SaveStateIndicator: ReactNode;
  ConfirmNavigationDialog: FC;
  buildDocumentRoute: (
    params?: Record<string, string | number | boolean | null | undefined>
  ) => string;
  buildQueueRoute: (
    params?: Record<string, string | number | boolean | null | undefined>
  ) => string;
  resetComposerState: () => void;
  handleSaveDraft: (overrideOrderType?: "SALE" | "QUOTE") => void;
  confirmFinalize: (options?: { overrideReason?: string }) => void;
  handleAddInventoryItems: (inventoryItems: InventoryItemForOrder[]) => void;
}

export function useOrderDraft({
  surfaceVariant = "classic-create-order",
}: UseOrderDraftOptions = {}): UseOrderDraftReturn {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const inSheetNativeOrdersSurface = surfaceVariant === "sheet-native-orders";
  const searchString = useSearch();
  const searchParams = useMemo(
    () => new URLSearchParams(searchString),
    [searchString]
  );
  const draftIdFromRoute = parseRouteEntityId(searchParams.get("draftId"));
  const quoteIdFromRoute = parseRouteEntityId(searchParams.get("quoteId"));
  const clientIdFromRoute = parseRouteEntityId(searchParams.get("clientId"));
  const needIdFromRoute = parseRouteEntityId(searchParams.get("needId"));
  const routeMode = searchParams.get("mode");
  const isDuplicateRoute =
    routeMode === "duplicate" && quoteIdFromRoute !== null;
  const routeOrderId = draftIdFromRoute ?? quoteIdFromRoute;
  const isSalesSheetImport = searchParams.get("fromSalesSheet") === "true";
  const hasRouteSeedContext =
    routeOrderId !== null ||
    clientIdFromRoute !== null ||
    needIdFromRoute !== null ||
    isSalesSheetImport ||
    routeMode === "quote";

  const [clientId, setClientId] = useState<number | null>(null);
  const [linkedNeedId, setLinkedNeedId] = useState<number | null>(null);
  const [items, setItemsState] = useState<LineItem[]>([]);
  const [adjustment, setAdjustment] = useState<OrderAdjustment | null>(null);
  const [showAdjustmentOnDocument, setShowAdjustmentOnDocument] =
    useState(true);
  const [orderType, setOrderType] = useState<"QUOTE" | "SALE">("SALE");
  const [referredByClientId, setReferredByClientId] = useState<number | null>(
    null
  );
  const [notes, setNotes] = useState("");
  const [freight, setFreight] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("NET_30");
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [activeDraftVersion, setActiveDraftVersion] = useState<number | null>(
    null
  );

  const { hasUnsavedChanges, setHasUnsavedChanges, ConfirmNavigationDialog } =
    useUnsavedChangesWarning({
      message: "You have unsaved order changes. Are you sure you want to leave?",
    });
  const { saveState, setSaving, setSaved, setError, SaveStateIndicator } =
    useSaveState();

  const buildDocumentRoute = useCallback(
    (params?: Record<string, string | number | boolean | null | undefined>) =>
      inSheetNativeOrdersSurface
        ? buildSheetNativeOrdersDocumentPath(params)
        : buildSalesWorkspacePath("create-order", params),
    [inSheetNativeOrdersSurface]
  );

  const buildQueueRoute = useCallback(
    (params?: Record<string, string | number | boolean | null | undefined>) =>
      inSheetNativeOrdersSurface
        ? buildSheetNativeOrdersPath(params)
        : buildSalesWorkspacePath("orders", params),
    [inSheetNativeOrdersSurface]
  );

  const isFinalizingRef = useRef(false);
  const hydratedRouteKeyRef = useRef<string | null>(null);
  const seededRouteKeyRef = useRef<string | null>(null);
  const previousSearchRef = useRef(searchString);
  const finalizeOptionsRef = useRef<{ overrideReason?: string } | null>(null);
  const pendingPersistFingerprintRef = useRef<string | null>(null);
  const persistedFingerprintRef = useRef(EMPTY_ORDER_FINGERPRINT);

  const setItems = useCallback(
    (value: LineItem[] | ((current: LineItem[]) => LineItem[])) => {
      setItemsState(current =>
        typeof value === "function"
          ? (value as (current: LineItem[]) => LineItem[])(current)
          : value
      );
    },
    []
  );

  const currentOrderSnapshot = useMemo<OrderDraftSnapshot>(
    () => ({
      clientId,
      linkedNeedId,
      orderType,
      referredByClientId,
      adjustment,
      showAdjustmentOnDocument,
      freight,
      notes,
      paymentTerms,
      items,
    }),
    [
      adjustment,
      clientId,
      items,
      linkedNeedId,
      notes,
      orderType,
      paymentTerms,
      freight,
      referredByClientId,
      showAdjustmentOnDocument,
    ]
  );
  const currentOrderFingerprint = useMemo(
    () => buildOrderFingerprint(currentOrderSnapshot),
    [currentOrderSnapshot]
  );
  const currentOrderFingerprintRef = useRef(currentOrderFingerprint);
  useEffect(() => {
    currentOrderFingerprintRef.current = currentOrderFingerprint;
  }, [currentOrderFingerprint]);

  const applyPersistedFingerprint = useCallback(
    (fingerprint?: string) => {
      persistedFingerprintRef.current =
        fingerprint ??
        pendingPersistFingerprintRef.current ??
        currentOrderFingerprintRef.current;
      pendingPersistFingerprintRef.current = null;
      setSaved();
    },
    [setSaved]
  );

  const resetComposerState = useCallback(() => {
    setClientId(null);
    setLinkedNeedId(null);
    setItems([]);
    setAdjustment(null);
    setShowAdjustmentOnDocument(true);
    setOrderType("SALE");
    setReferredByClientId(null);
    setNotes("");
    setFreight(0);
    setPaymentTerms("NET_30");
    setActiveDraftId(null);
    setActiveDraftVersion(null);
    hydratedRouteKeyRef.current = null;
    seededRouteKeyRef.current = null;
    pendingPersistFingerprintRef.current = null;
    persistedFingerprintRef.current = EMPTY_ORDER_FINGERPRINT;
    setSaved();
  }, [setItems, setSaved]);

  useEffect(() => {
    const autoSavePending =
      saveState.status === "saving" ||
      saveState.status === "error" ||
      saveState.status === "queued";
    const hasSnapshotChanges =
      currentOrderFingerprint !== persistedFingerprintRef.current;
    const hasOrderContent =
      currentOrderFingerprint !== EMPTY_ORDER_FINGERPRINT ||
      activeDraftId !== null;

    setHasUnsavedChanges(
      (hasOrderContent && hasSnapshotChanges) || autoSavePending
    );
  }, [
    activeDraftId,
    currentOrderFingerprint,
    saveState.status,
    setHasUnsavedChanges,
  ]);

  const {
    data: routeOrderData,
    error: routeOrderError,
    isLoading: routeOrderLoading,
  } = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: routeOrderId ?? 0 },
    {
      enabled: routeOrderId !== null,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!routeOrderError || routeOrderId === null) {
      return;
    }

    const entityLabel = draftIdFromRoute ? "draft" : "quote";
    toast.error(`Failed to load ${entityLabel}: ${routeOrderError.message}`);
  }, [draftIdFromRoute, routeOrderError, routeOrderId]);

  useEffect(() => {
    if (!routeOrderData || routeOrderId === null) {
      return;
    }

    const hydrationKey = `${routeOrderId}:${isDuplicateRoute ? "duplicate" : "edit"}`;
    if (hydratedRouteKeyRef.current === hydrationKey) {
      return;
    }

    const draftItems = mapDraftLineItemsToEditorState(
      routeOrderData.lineItems as DraftLineItemPayload[]
    );
    const snapshot: OrderDraftSnapshot = {
      clientId: routeOrderData.order.clientId,
      linkedNeedId: routeOrderData.order.clientNeedId ?? null,
      orderType: routeOrderData.order.orderType,
      referredByClientId: routeOrderData.order.referredByClientId ?? null,
      adjustment: null,
      showAdjustmentOnDocument: (
        routeOrderData.order as {
          showAdjustmentOnDocument?: boolean | null;
        }
      ).showAdjustmentOnDocument ?? true,
      freight: Number(
        (routeOrderData.order as { shipping?: string | number | null }).shipping
      ) || 0,
      notes: routeOrderData.order.notes ?? "",
      paymentTerms: normalizePaymentTerms(routeOrderData.order.paymentTerms),
      items: draftItems,
    };

    setClientId(snapshot.clientId);
    setLinkedNeedId(snapshot.linkedNeedId);
    setOrderType(snapshot.orderType);
    setItems(snapshot.items);
    setAdjustment(snapshot.adjustment);
    setShowAdjustmentOnDocument(snapshot.showAdjustmentOnDocument);
    setReferredByClientId(snapshot.referredByClientId);
    setFreight(snapshot.freight);
    setNotes(snapshot.notes);
    setPaymentTerms(snapshot.paymentTerms);
    setActiveDraftId(isDuplicateRoute ? null : routeOrderData.order.id);
    setActiveDraftVersion(
      isDuplicateRoute ? null : (routeOrderData.order.version ?? 1)
    );
    hydratedRouteKeyRef.current = hydrationKey;
    seededRouteKeyRef.current = null;
    pendingPersistFingerprintRef.current = null;
    applyPersistedFingerprint(buildOrderFingerprint(snapshot));

    if (isDuplicateRoute) {
      toast.success(
        `Quote #${routeOrderData.order.orderNumber} loaded for duplication`
      );
    }
  }, [
    applyPersistedFingerprint,
    isDuplicateRoute,
    routeOrderData,
    routeOrderId,
    setItems,
  ]);

  useEffect(() => {
    if (
      !shouldSeedComposerFromRoute({
        routeOrderId,
        routeOrderLoading,
        isSalesSheetImport,
        routeMode,
        clientIdFromRoute,
        needIdFromRoute,
      })
    ) {
      return;
    }

    const seedKey = `${resolveRouteSeedOrderType(routeMode)}:${clientIdFromRoute ?? "none"}:${needIdFromRoute ?? "none"}`;
    if (seededRouteKeyRef.current === seedKey) {
      return;
    }

    setClientId(clientIdFromRoute);
    setLinkedNeedId(needIdFromRoute);
    setItems([]);
    setAdjustment(null);
    setShowAdjustmentOnDocument(true);
    setReferredByClientId(null);
    setNotes("");
    setFreight(0);
    setPaymentTerms("NET_30");
    setActiveDraftId(null);
    setActiveDraftVersion(null);
    hydratedRouteKeyRef.current = null;
    pendingPersistFingerprintRef.current = null;
    persistedFingerprintRef.current = EMPTY_ORDER_FINGERPRINT;
    setSaved();
    setOrderType(resolveRouteSeedOrderType(routeMode));
    seededRouteKeyRef.current = seedKey;
  }, [
    clientIdFromRoute,
    isSalesSheetImport,
    needIdFromRoute,
    routeMode,
    routeOrderId,
    routeOrderLoading,
    setItems,
    setSaved,
  ]);

  const convertInventoryToLineItems = useCallback(
    (inventoryItems: InventoryItemForOrder[]): LineItem[] => {
      const validItems = inventoryItems.filter(item => {
        if (!item || item.id === undefined || item.id === null) {
          console.warn("Skipping item with missing id:", item);
          return false;
        }
        return true;
      });

      return validItems.map(item => {
        const cogsPerUnit =
          item.effectiveCogs ?? item.basePrice ?? item.unitCogs ?? 0;
        const retailPrice = item.retailPrice || item.basePrice || 0;
        const availableUnits = Math.max(1, Math.floor(item.quantity ?? 1));
        const quantity =
          normalizePositiveIntegerWithin(
            item.orderQuantity ?? item.quantity ?? 1,
            availableUnits
          ) ?? 1;
        const calculated = calculateLineItemFromRetailPrice(
          item.id,
          quantity,
          cogsPerUnit,
          retailPrice
        );
        const pricingContext = resolveInventoryPricingContext(item);

        return {
          ...calculated,
          productId: item.productId,
          cogsMode: item.cogsMode,
          unitCogsMin: item.unitCogsMin ?? null,
          unitCogsMax: item.unitCogsMax ?? null,
          effectiveCogsBasis:
            item.effectiveCogsBasis ??
            (item.cogsMode === "RANGE" ? "MID" : "MANUAL"),
          originalRangeMin: item.unitCogsMin ?? null,
          originalRangeMax: item.unitCogsMax ?? null,
          isBelowVendorRange:
            typeof item.unitCogsMin === "number"
              ? cogsPerUnit < item.unitCogsMin
              : false,
          marginPercent: calculated.marginPercent || 0,
          marginDollar: calculated.marginDollar || 0,
          unitPrice: calculated.unitPrice || 0,
          lineTotal: calculated.lineTotal || 0,
          productDisplayName: item.name || "Unknown Product",
          originalCogsPerUnit: cogsPerUnit,
          belowRangeReason: undefined,
          isCogsOverridden: false,
          isMarginOverridden: false,
          marginSource: pricingContext.marginSource,
          profilePriceAdjustmentPercent:
            pricingContext.profilePriceAdjustmentPercent,
          appliedRules: item.appliedRules ?? [],
          isSample: false,
        };
      });
    },
    []
  );

  useEffect(() => {
    if (!isSalesSheetImport || routeOrderId !== null) {
      return;
    }

    try {
      const raw = sessionStorage.getItem("salesSheetToQuote");
      if (!raw) {
        return;
      }

      sessionStorage.removeItem("salesSheetToQuote");

      const data = JSON.parse(raw) as {
        clientId: number;
        items: InventoryItemForOrder[];
      };
      const lineItems = convertInventoryToLineItems(data.items);

      setClientId(data.clientId);
      setLinkedNeedId(null);
      setOrderType("QUOTE");
      setItems(lineItems);
      setAdjustment(null);
      setShowAdjustmentOnDocument(true);
      setReferredByClientId(null);
      setNotes("");
      setPaymentTerms("NET_30");
      setActiveDraftId(null);
      setActiveDraftVersion(null);
      hydratedRouteKeyRef.current = null;
      pendingPersistFingerprintRef.current = null;
      persistedFingerprintRef.current = EMPTY_ORDER_FINGERPRINT;
      setSaved();
    } catch {
      toast.error("Failed to import items from sales catalogue");
    }
  }, [
    convertInventoryToLineItems,
    isSalesSheetImport,
    routeOrderId,
    setItems,
    setSaved,
  ]);

  useEffect(() => {
    if (
      hasRouteSeedContext ||
      previousSearchRef.current === searchString ||
      currentOrderFingerprint === EMPTY_ORDER_FINGERPRINT
    ) {
      previousSearchRef.current = searchString;
      return;
    }

    resetComposerState();
    previousSearchRef.current = searchString;
  }, [
    currentOrderFingerprint,
    hasRouteSeedContext,
    resetComposerState,
    searchString,
  ]);

  const buildDraftMutationPayload = useCallback(
    (effectiveOrderType: "QUOTE" | "SALE" = orderType) => ({
      orderType: effectiveOrderType,
      clientId: clientId as number,
      clientNeedId: linkedNeedId ?? undefined,
      referredByClientId: referredByClientId ?? undefined,
      lineItems: items.map(item => ({
        batchId: item.batchId,
        batchSku: item.batchSku,
        productId: item.productId,
        productDisplayName: item.productDisplayName,
        quantity: item.quantity,
        cogsPerUnit: item.cogsPerUnit,
        originalCogsPerUnit: item.originalCogsPerUnit,
        cogsMode: item.cogsMode,
        unitCogsMin: item.unitCogsMin,
        unitCogsMax: item.unitCogsMax,
        effectiveCogsBasis: item.effectiveCogsBasis,
        originalRangeMin: item.originalRangeMin,
        originalRangeMax: item.originalRangeMax,
        isBelowVendorRange: item.isBelowVendorRange ?? false,
        belowRangeReason: item.belowRangeReason,
        isCogsOverridden: item.isCogsOverridden,
        cogsOverrideReason: item.cogsOverrideReason,
        marginPercent: item.marginPercent,
        unitPrice: item.unitPrice,
        isMarginOverridden: item.isMarginOverridden,
        marginSource: item.marginSource,
        profilePriceAdjustmentPercent: item.profilePriceAdjustmentPercent,
        appliedRules: item.appliedRules,
        isSample: item.isSample,
      })),
      orderLevelAdjustment: adjustment || undefined,
      showAdjustmentOnDocument,
      shipping: freight,
      notes: notes.trim() || undefined,
      paymentTerms: normalizePaymentTerms(paymentTerms),
    }),
    [
      adjustment,
      clientId,
      items,
      linkedNeedId,
      notes,
      orderType,
      paymentTerms,
      freight,
      referredByClientId,
      showAdjustmentOnDocument,
    ]
  );

  const invalidateOrdersSheetQueries = useCallback(
    async (orderId: number | null | undefined) => {
      const invalidations: Promise<unknown>[] = [
        utils.orders.getAll.invalidate({ isDraft: true }),
        utils.orders.getAll.invalidate({ isDraft: false }),
      ];

      if (orderId) {
        invalidations.push(
          utils.orders.getOrderWithLineItems.invalidate({ orderId }),
          utils.orders.getOrderStatusHistory.invalidate({ orderId }),
          utils.orders.getAuditLog.invalidate({ orderId })
        );
      }

      await Promise.allSettled(invalidations);
    },
    [utils]
  );

  const finalizeMutation = trpc.orders.finalizeDraft.useMutation({
    onSuccess: async data => {
      isFinalizingRef.current = false;
      finalizeOptionsRef.current = null;
      toast.success(`Order #${data.orderNumber} finalized successfully!`);
      await invalidateOrdersSheetQueries(data.orderId);
      resetComposerState();
      setLocation(buildQueueRoute({ orderId: data.orderId }));
    },
    onError: error => {
      pendingPersistFingerprintRef.current = null;
      isFinalizingRef.current = false;
      finalizeOptionsRef.current = null;
      toast.error(`Failed to finalize order: ${error.message}`);
    },
  });

  const createDraftMutation = trpc.orders.createDraftEnhanced.useMutation({
    onSuccess: async data => {
      const nextVersion = data.version ?? 1;

      setActiveDraftId(data.orderId);
      setActiveDraftVersion(nextVersion);
      applyPersistedFingerprint();
      await invalidateOrdersSheetQueries(data.orderId);

      if (isFinalizingRef.current) {
        toast.info(`Draft #${data.orderId} created, finalizing...`);
        finalizeMutation.mutate({
          orderId: data.orderId,
          version: nextVersion,
          overrideReason:
            finalizeOptionsRef.current?.overrideReason?.trim() || undefined,
        });
        return;
      }

      toast.success(`Draft order #${data.orderId} saved successfully`);
      setLocation(buildDocumentRoute({ draftId: data.orderId }));
    },
    onError: error => {
      pendingPersistFingerprintRef.current = null;
      isFinalizingRef.current = false;
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const updateDraftMutation = trpc.orders.updateDraftEnhanced.useMutation({
    onSuccess: async data => {
      setActiveDraftId(data.orderId);
      setActiveDraftVersion(data.version);
      applyPersistedFingerprint();
      await invalidateOrdersSheetQueries(data.orderId);

      if (isFinalizingRef.current) {
        finalizeMutation.mutate({
          orderId: data.orderId,
          version: data.version,
          overrideReason:
            finalizeOptionsRef.current?.overrideReason?.trim() || undefined,
        });
        return;
      }

      toast.success(`Draft order #${data.orderId} saved successfully`);
    },
    onError: error => {
      pendingPersistFingerprintRef.current = null;
      isFinalizingRef.current = false;
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const autoSaveMutation = trpc.orders.updateDraftEnhanced.useMutation({
    onSuccess: async data => {
      setActiveDraftVersion(data.version);
      applyPersistedFingerprint();
      await invalidateOrdersSheetQueries(data.orderId);
    },
    onError: error => {
      pendingPersistFingerprintRef.current = null;
      setError("Auto-save failed", error);
    },
  });

  const performAutoSave = useCallback(() => {
    if (
      !clientId ||
      items.length === 0 ||
      activeDraftId === null ||
      activeDraftVersion === null ||
      currentOrderFingerprintRef.current === persistedFingerprintRef.current ||
      createDraftMutation.isPending ||
      updateDraftMutation.isPending ||
      autoSaveMutation.isPending ||
      finalizeMutation.isPending ||
      isFinalizingRef.current
    ) {
      return;
    }

    pendingPersistFingerprintRef.current = currentOrderFingerprintRef.current;
    setSaving();
    autoSaveMutation.mutate({
      orderId: activeDraftId,
      version: activeDraftVersion,
      ...buildDraftMutationPayload(),
    });
  }, [
    activeDraftId,
    activeDraftVersion,
    autoSaveMutation,
    buildDraftMutationPayload,
    clientId,
    createDraftMutation.isPending,
    finalizeMutation.isPending,
    items.length,
    setSaving,
    updateDraftMutation.isPending,
  ]);

  const debouncedAutoSave = useDebounceCallback(performAutoSave, 2000);

  useEffect(() => {
    if (
      clientId &&
      items.length > 0 &&
      activeDraftId !== null &&
      activeDraftVersion !== null &&
      currentOrderFingerprint !== persistedFingerprintRef.current
    ) {
      debouncedAutoSave();
    }
  }, [
    activeDraftId,
    activeDraftVersion,
    clientId,
    currentOrderFingerprint,
    items.length,
    debouncedAutoSave,
  ]);

  const handleSaveDraft = useCallback(
    (overrideOrderType?: "SALE" | "QUOTE") => {
      const effectiveOrderType = overrideOrderType ?? orderType;

      if (!clientId) {
        toast.error("Please select a client before continuing");
        return;
      }

      if (items.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      if (
        createDraftMutation.isPending ||
        updateDraftMutation.isPending ||
        autoSaveMutation.isPending ||
        finalizeMutation.isPending ||
        isFinalizingRef.current
      ) {
        toast.error("A save is already in progress. Please wait a moment.");
        return;
      }

      pendingPersistFingerprintRef.current = currentOrderFingerprintRef.current;
      setSaving();

      if (activeDraftId !== null && activeDraftVersion !== null) {
        updateDraftMutation.mutate({
          orderId: activeDraftId,
          version: activeDraftVersion,
          ...buildDraftMutationPayload(effectiveOrderType),
        });
        return;
      }

      createDraftMutation.mutate(buildDraftMutationPayload(effectiveOrderType));
    },
    [
      activeDraftId,
      activeDraftVersion,
      buildDraftMutationPayload,
      clientId,
      createDraftMutation,
      autoSaveMutation.isPending,
      finalizeMutation.isPending,
      items.length,
      orderType,
      setSaving,
      updateDraftMutation,
    ]
  );

  const confirmFinalize = useCallback((options?: { overrideReason?: string }) => {
    if (!clientId) {
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    if (
      createDraftMutation.isPending ||
      updateDraftMutation.isPending ||
      autoSaveMutation.isPending ||
      finalizeMutation.isPending ||
      isFinalizingRef.current
    ) {
      toast.error("A save is already in progress. Please wait a moment.");
      return;
    }

    isFinalizingRef.current = true;
    finalizeOptionsRef.current = options ?? null;
    pendingPersistFingerprintRef.current = currentOrderFingerprintRef.current;
    setSaving();

    if (activeDraftId !== null && activeDraftVersion !== null) {
      updateDraftMutation.mutate({
        orderId: activeDraftId,
        version: activeDraftVersion,
        ...buildDraftMutationPayload(),
      });
      return;
    }

    createDraftMutation.mutate(buildDraftMutationPayload());
  }, [
    activeDraftId,
    activeDraftVersion,
    buildDraftMutationPayload,
    clientId,
    createDraftMutation,
    autoSaveMutation.isPending,
    finalizeMutation.isPending,
    items.length,
    setSaving,
    updateDraftMutation,
  ]);

  const handleAddInventoryItems = useCallback(
    (inventoryItems: InventoryItemForOrder[]) => {
      if (!inventoryItems || inventoryItems.length === 0) {
        toast.error("No items selected");
        return;
      }

      const newLineItems = convertInventoryToLineItems(inventoryItems);

      if (newLineItems.length === 0) {
        toast.error("Selected items are not available. Please try again.");
        return;
      }

      if (newLineItems.length < inventoryItems.length) {
        toast.warning(
          `${inventoryItems.length - newLineItems.length} item(s) were skipped due to incomplete data`
        );
      }

      setItems(currentItems => {
        const existingBatchIds = new Set(currentItems.map(item => item.batchId));
        const uniqueItems = newLineItems.filter(
          item => !existingBatchIds.has(item.batchId)
        );

        if (uniqueItems.length === 0) {
          toast.warning("Selected items are already in the order");
          return currentItems;
        }

        toast.success(`Added ${uniqueItems.length} item(s) to order`);
        return [...currentItems, ...uniqueItems];
      });
    },
    [convertInventoryToLineItems, setItems]
  );

  return {
    clientId,
    setClientId,
    linkedNeedId,
    setLinkedNeedId,
    items,
    setItems,
    adjustment,
    setAdjustment,
    showAdjustmentOnDocument,
    setShowAdjustmentOnDocument,
    orderType,
    setOrderType,
    referredByClientId,
    setReferredByClientId,
    notes,
    setNotes,
    freight,
    setFreight,
    paymentTerms,
    setPaymentTerms,
    activeDraftId,
    activeDraftVersion,
    isSalesSheetImport,
    hasUnsavedChanges,
    isPersistingDraft:
      createDraftMutation.isPending || updateDraftMutation.isPending,
    isFinalizingDraft:
      finalizeMutation.isPending ||
      (createDraftMutation.isPending && isFinalizingRef.current) ||
      (updateDraftMutation.isPending && isFinalizingRef.current),
    saveState,
    SaveStateIndicator,
    ConfirmNavigationDialog,
    buildDocumentRoute,
    buildQueueRoute,
    resetComposerState,
    handleSaveDraft,
    confirmFinalize,
    handleAddInventoryItems,
  };
}
