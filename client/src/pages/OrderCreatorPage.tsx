/**
 * OrderCreatorPage V2.0
 * Complete sales order creation with COGS visibility, margin management,
 * and draft/finalize workflow
 * v2.0 Sales Order Enhancements
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation, useSearch } from "wouter";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { cn } from "@/lib/utils";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { normalizePositiveIntegerWithin } from "@/lib/quantity";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { toast } from "sonner";
import {
  ShoppingCart,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  FileText,
  Send,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import new v2 components
import {
  LineItemTable,
  type LineItem,
} from "@/components/orders/LineItemTable";
import {
  OrderAdjustmentPanel,
  type OrderAdjustment,
} from "@/components/orders/OrderAdjustmentPanel";
import { OrderTotalsPanel } from "@/components/orders/OrderTotalsPanel";
import { FloatingOrderPreview } from "@/components/orders/FloatingOrderPreview";
import { CreditLimitBanner } from "@/components/orders/CreditLimitBanner";
import { CreditWarningDialog } from "@/components/orders/CreditWarningDialog";
import { ReferredBySelector } from "@/components/orders/ReferredBySelector";
import { ReferralCreditsPanel } from "@/components/orders/ReferralCreditsPanel";
import { CreditLimitWidget } from "@/components/credit/CreditLimitWidget";
import { PricingConfigTab } from "@/components/pricing/PricingConfigTab";
import { PricingContextPanel } from "@/components/pricing/PricingContextPanel";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { ProfileQuickPanel } from "@/components/clients/ProfileQuickPanel";
import { KeyboardHintBar } from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  useOrderCalculations,
  calculateLineItemFromRetailPrice,
} from "@/hooks/orders/useOrderCalculations";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import {
  useSaveState,
  useUndo,
  useValidationTiming,
  useWorkSurfaceKeyboard,
} from "@/hooks/work-surface";

interface CreditCheckResult {
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

interface InventoryItemForOrder {
  id: number;
  productId?: number; // WSQA-002: Product ID for flexible lot selection
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
  orderQuantity?: number; // FEAT-003: Support quick add quantity from InventoryBrowser
  quantity?: number; // Available stock quantity
}

type LineItemMarginSource = "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";

type CustomerDrawerSection = "money" | "sales-pricing";

const orderValidationSchema = z.object({
  clientId: z.number().positive("Select a client"),
  orderType: z.enum(["SALE", "QUOTE"]),
});

interface DraftLineItemPayload {
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
  marginSource: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
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

interface OrderDraftSnapshot {
  clientId: number | null;
  linkedNeedId: number | null;
  orderType: "QUOTE" | "SALE";
  referredByClientId: number | null;
  adjustment: OrderAdjustment | null;
  showAdjustmentOnDocument: boolean;
  items: LineItem[];
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

const normalizeFingerprintNumber = (
  value: number | null | undefined,
  precision = 4
): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(precision));
};

const buildOrderFingerprint = (snapshot: OrderDraftSnapshot): string =>
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

const EMPTY_ORDER_FINGERPRINT = buildOrderFingerprint({
  clientId: null,
  linkedNeedId: null,
  orderType: "SALE",
  referredByClientId: null,
  adjustment: null,
  showAdjustmentOnDocument: true,
  items: [],
});

const parseRouteEntityId = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const mapDraftLineItemsToEditorState = (
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

export default function OrderCreatorPageV2() {
  // TER-216: Navigation after save/finalize
  const [, setLocation] = useLocation();
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
    isSalesSheetImport;

  // State
  const [clientId, setClientId] = useState<number | null>(null);
  const [linkedNeedId, setLinkedNeedId] = useState<number | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [adjustment, setAdjustment] = useState<OrderAdjustment | null>(null);
  const [showAdjustmentOnDocument, setShowAdjustmentOnDocument] =
    useState(true);
  const [orderType, setOrderType] = useState<"QUOTE" | "SALE">("SALE");
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [customerDrawerSection, setCustomerDrawerSection] =
    useState<CustomerDrawerSection>("money");
  const customerDrawerOriginRef = useRef<HTMLElement | null>(null);

  // CHAOS-007: Unsaved changes warning
  const { setHasUnsavedChanges, ConfirmNavigationDialog } =
    useUnsavedChangesWarning({
      message:
        "You have unsaved order changes. Are you sure you want to leave?",
    });

  // Credit check state
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [creditCheckResult, setCreditCheckResult] =
    useState<CreditCheckResult | null>(null);
  const [pendingOverrideReason, setPendingOverrideReason] = useState<
    string | undefined
  >();

  // Referral tracking state (WS-004)
  const [referredByClientId, setReferredByClientId] = useState<number | null>(
    null
  );
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [activeDraftVersion, setActiveDraftVersion] = useState<number | null>(
    null
  );
  const { hasAnyPermission } = usePermissions();
  const canViewPricingContext = hasAnyPermission([
    "orders:view_pricing",
    "pricing:read",
    "pricing:access",
    "pricing:rules:read",
    "pricing:profiles:read",
    "pricing:defaults:view",
  ]);
  const canManagePricing = hasAnyPermission([
    "pricing:manage",
    "pricing:update",
    "pricing:create",
    "pricing:profiles:update",
    "pricing:profiles:create",
    "pricing:rules:update",
    "pricing:rules:create",
    "pricing:defaults:edit",
  ]);

  const { saveState, setSaving, setSaved, setError, SaveStateIndicator } =
    useSaveState();
  const undo = useUndo({ enableKeyboard: false });
  const {
    getFieldState: getOrderFieldState,
    handleChange: handleOrderValidationChange,
    handleBlur: handleOrderValidationBlur,
    setValues: setOrderValidationValues,
  } = useValidationTiming({
    schema: orderValidationSchema,
    initialValues: {
      orderType: "SALE",
    },
  });

  const clientFieldState = getOrderFieldState("clientId");
  const orderTypeFieldState = getOrderFieldState("orderType");

  // BUG-093 FIX: Track whether we're in finalization mode to prevent form reset
  // before finalization completes
  const isFinalizingRef = useRef(false);
  const itemsRef = useRef<LineItem[]>([]);
  const hydratedRouteKeyRef = useRef<string | null>(null);
  const seededRouteKeyRef = useRef<string | null>(null);
  const previousSearchRef = useRef(searchString);
  const pendingPersistFingerprintRef = useRef<string | null>(null);
  const persistedFingerprintRef = useRef(EMPTY_ORDER_FINGERPRINT);

  const currentOrderSnapshot = useMemo<OrderDraftSnapshot>(
    () => ({
      clientId,
      linkedNeedId,
      orderType,
      referredByClientId,
      adjustment,
      showAdjustmentOnDocument,
      items,
    }),
    [
      adjustment,
      clientId,
      items,
      linkedNeedId,
      orderType,
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
    setActiveDraftId(null);
    setActiveDraftVersion(null);
    hydratedRouteKeyRef.current = null;
    seededRouteKeyRef.current = null;
    pendingPersistFingerprintRef.current = null;
    persistedFingerprintRef.current = EMPTY_ORDER_FINGERPRINT;
    setSaved();
  }, [setSaved]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const drawerSection = searchParams.get("customerDrawer");
    if (
      drawerSection === "credit" ||
      drawerSection === "pricing" ||
      drawerSection === "money" ||
      drawerSection === "sales-pricing"
    ) {
      setCustomerDrawerSection(
        drawerSection === "credit" || drawerSection === "money"
          ? "money"
          : "sales-pricing"
      );
      setCustomerDrawerOpen(true);
    }
  }, [clientId, searchParams]);

  // QA-W2-005: Track unsaved changes using persisted draft state plus active save status.
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

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    setOrderValidationValues({
      clientId: clientId ?? undefined,
      orderType,
    });
  }, [clientId, orderType, setOrderValidationValues]);

  // Queries - handle paginated response
  const { data: clientsData, isLoading: clientsLoading } =
    trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData)
    ? clientsData
    : (clientsData?.items ?? []);
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
  const { data: clientDetails, refetch: refetchClientDetails } =
    trpc.clients.getById.useQuery(
      { clientId: clientId || 0 },
      { enabled: !!clientId }
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
      showAdjustmentOnDocument: true,
      items: draftItems,
    };

    setClientId(snapshot.clientId);
    setLinkedNeedId(snapshot.linkedNeedId);
    setOrderType(snapshot.orderType);
    setItems(snapshot.items);
    setAdjustment(snapshot.adjustment);
    setShowAdjustmentOnDocument(snapshot.showAdjustmentOnDocument);
    setReferredByClientId(snapshot.referredByClientId);
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
  ]);

  useEffect(() => {
    if (
      routeOrderId !== null ||
      routeOrderLoading ||
      isSalesSheetImport ||
      clientIdFromRoute === null
    ) {
      return;
    }

    const seedKey = `${clientIdFromRoute}:${needIdFromRoute ?? "none"}`;
    if (seededRouteKeyRef.current === seedKey) {
      return;
    }

    setClientId(clientIdFromRoute);
    setLinkedNeedId(needIdFromRoute);
    setItems([]);
    setAdjustment(null);
    setShowAdjustmentOnDocument(true);
    setReferredByClientId(null);
    setActiveDraftId(null);
    setActiveDraftVersion(null);
    hydratedRouteKeyRef.current = null;
    pendingPersistFingerprintRef.current = null;
    persistedFingerprintRef.current = EMPTY_ORDER_FINGERPRINT;
    setSaved();
    setOrderType("SALE");
    seededRouteKeyRef.current = seedKey;
  }, [
    clientIdFromRoute,
    isSalesSheetImport,
    needIdFromRoute,
    routeOrderId,
    routeOrderLoading,
    setSaved,
  ]);

  // TER-215: Import items from Sales Sheet when navigating with ?fromSalesSheet=true
  useEffect(() => {
    if (!isSalesSheetImport || routeOrderId !== null) {
      return;
    }

    try {
      const raw = sessionStorage.getItem("salesSheetToQuote");
      if (!raw) {
        return;
      }

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
      setActiveDraftId(null);
      setActiveDraftVersion(null);
      hydratedRouteKeyRef.current = null;
      pendingPersistFingerprintRef.current = null;
      persistedFingerprintRef.current = EMPTY_ORDER_FINGERPRINT;
      setSaved();
      sessionStorage.removeItem("salesSheetToQuote");
    } catch {
      toast.error("Failed to import items from sales sheet");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSalesSheetImport, routeOrderId]);

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

  // Fetch inventory with pricing when client is selected
  // BUG-045: Use useRetryableQuery to preserve form state on retry
  const inventoryQueryRaw = trpc.salesSheets.getInventory.useQuery(
    { clientId: clientId ?? 0 },
    {
      enabled: !!clientId && clientId > 0,
      retry: false,
    }
  );

  const inventoryQuery = useRetryableQuery(inventoryQueryRaw, {
    maxRetries: 3,
    onMaxRetriesReached: () => {
      toast.error(
        "Unable to load inventory. Please try selecting a different customer or contact support."
      );
    },
  });

  const {
    data: inventory,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = inventoryQuery;

  // Handle inventory error with useEffect
  React.useEffect(() => {
    if (inventoryError) {
      console.error("Failed to load inventory:", inventoryError);
      toast.error(
        `Failed to load inventory: ${inventoryError.message || "Unknown error"}`
      );
    }
  }, [inventoryError]);

  useEffect(() => {
    if (!inventory || items.length === 0) {
      return;
    }

    const inventoryByBatchId = new Map(
      inventory.map(item => [item.id, item.productId ?? null])
    );

    setItems(currentItems => {
      let changed = false;

      const nextItems = currentItems.map(item => {
        if (item.productId) {
          return item;
        }

        const productId = inventoryByBatchId.get(item.batchId);
        if (!productId) {
          return item;
        }

        changed = true;
        return {
          ...item,
          productId,
        };
      });

      return changed ? nextItems : currentItems;
    });
  }, [inventory, items.length]);

  const openCustomerDrawer = useCallback(
    (
      section: CustomerDrawerSection,
      triggerElement?: HTMLElement | null | undefined
    ) => {
      customerDrawerOriginRef.current =
        triggerElement ||
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
      setCustomerDrawerSection(section);
      setCustomerDrawerOpen(true);
    },
    []
  );

  const closeCustomerDrawer = useCallback(() => {
    setCustomerDrawerOpen(false);
    requestAnimationFrame(() => {
      customerDrawerOriginRef.current?.focus();
    });
  }, []);

  const handleCustomerDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setCustomerDrawerOpen(true);
        return;
      }
      closeCustomerDrawer();
      void refetchClientDetails();
    },
    [closeCustomerDrawer, refetchClientDetails]
  );

  const refreshProfilePricingInOrder = useCallback(async () => {
    const refreshedInventory = await inventoryQuery.refetch();
    const latestInventory =
      (refreshedInventory.data as InventoryItemForOrder[] | undefined) ??
      (inventory as InventoryItemForOrder[] | undefined) ??
      [];

    if (latestInventory.length === 0) {
      return;
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.marginSource === "MANUAL" || item.isMarginOverridden) {
          return item;
        }

        const profilePricing = latestInventory.find(
          inv => inv.id === item.batchId
        );
        if (!profilePricing) {
          return item;
        }

        const shouldRefreshCogsState =
          !item.isCogsOverridden &&
          item.effectiveCogsBasis !== "MANUAL" &&
          (!item.effectiveCogsBasis ||
            item.effectiveCogsBasis === profilePricing.effectiveCogsBasis);
        const cogsPerUnit = shouldRefreshCogsState
          ? (profilePricing.effectiveCogs ?? item.cogsPerUnit)
          : item.cogsPerUnit;
        const retailPrice =
          profilePricing.retailPrice ?? profilePricing.basePrice ?? cogsPerUnit;
        const recalculated = calculateLineItemFromRetailPrice(
          item.batchId,
          item.quantity,
          cogsPerUnit,
          retailPrice
        );
        const pricingContext = resolveInventoryPricingContext(profilePricing);

        return {
          ...item,
          cogsPerUnit,
          originalCogsPerUnit: shouldRefreshCogsState
            ? cogsPerUnit
            : item.originalCogsPerUnit,
          cogsMode: shouldRefreshCogsState
            ? (profilePricing.cogsMode ?? item.cogsMode)
            : item.cogsMode,
          unitCogsMin: shouldRefreshCogsState
            ? (profilePricing.unitCogsMin ?? item.unitCogsMin ?? null)
            : (item.unitCogsMin ?? null),
          unitCogsMax: shouldRefreshCogsState
            ? (profilePricing.unitCogsMax ?? item.unitCogsMax ?? null)
            : (item.unitCogsMax ?? null),
          effectiveCogsBasis: shouldRefreshCogsState
            ? (profilePricing.effectiveCogsBasis ?? item.effectiveCogsBasis)
            : item.effectiveCogsBasis,
          originalRangeMin: shouldRefreshCogsState
            ? (profilePricing.unitCogsMin ?? item.originalRangeMin ?? null)
            : (item.originalRangeMin ?? null),
          originalRangeMax: shouldRefreshCogsState
            ? (profilePricing.unitCogsMax ?? item.originalRangeMax ?? null)
            : (item.originalRangeMax ?? null),
          isBelowVendorRange:
            typeof item.originalRangeMin === "number"
              ? cogsPerUnit < item.originalRangeMin
              : false,
          marginPercent: recalculated.marginPercent ?? 0,
          marginDollar: recalculated.marginDollar ?? 0,
          unitPrice: recalculated.unitPrice ?? 0,
          lineTotal: recalculated.lineTotal ?? 0,
          marginSource: pricingContext.marginSource,
          profilePriceAdjustmentPercent:
            pricingContext.profilePriceAdjustmentPercent,
          appliedRules: profilePricing.appliedRules ?? [],
          isMarginOverridden: false,
        };
      })
    );
  }, [inventory, inventoryQuery]);

  const handlePricingProfileApplied = useCallback(() => {
    void (async () => {
      await refreshProfilePricingInOrder();
      await refetchClientDetails();
      closeCustomerDrawer();
    })();
  }, [closeCustomerDrawer, refreshProfilePricingInOrder, refetchClientDetails]);
  // Calculations
  const { totals, warnings, isValid } = useOrderCalculations(items, adjustment);

  const buildDraftMutationPayload = useCallback(
    (effectiveOrderType: "QUOTE" | "SALE" = orderType) => ({
      orderType: effectiveOrderType,
      clientId: clientId as number,
      clientNeedId: linkedNeedId ?? undefined,
      referredByClientId: referredByClientId ?? undefined,
      lineItems: items.map(item => ({
        batchId: item.batchId,
        productDisplayName: item.productDisplayName,
        quantity: item.quantity,
        cogsPerUnit: item.cogsPerUnit,
        originalCogsPerUnit: item.originalCogsPerUnit,
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
        isSample: item.isSample,
      })),
      orderLevelAdjustment: adjustment || undefined,
      showAdjustmentOnDocument,
    }),
    [
      adjustment,
      clientId,
      items,
      linkedNeedId,
      orderType,
      referredByClientId,
      showAdjustmentOnDocument,
    ]
  );

  // Mutations
  // BUG-093 FIX: Modified to support two-step finalization
  const createDraftMutation = trpc.orders.createDraftEnhanced.useMutation({
    onSuccess: data => {
      const nextVersion = data.version ?? 1;

      setActiveDraftId(data.orderId);
      setActiveDraftVersion(nextVersion);
      applyPersistedFingerprint();

      if (isFinalizingRef.current) {
        toast.info(`Draft #${data.orderId} created, finalizing...`);
        finalizeMutation.mutate({
          orderId: data.orderId,
          version: nextVersion,
        });
        return;
      }

      toast.success(`Draft order #${data.orderId} saved successfully`);
      setLocation(
        buildSalesWorkspacePath("create-order", { draftId: data.orderId })
      );
    },
    onError: error => {
      pendingPersistFingerprintRef.current = null;
      isFinalizingRef.current = false;
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const updateDraftMutation = trpc.orders.updateDraftEnhanced.useMutation({
    onSuccess: data => {
      setActiveDraftId(data.orderId);
      setActiveDraftVersion(data.version);
      applyPersistedFingerprint();

      if (isFinalizingRef.current) {
        finalizeMutation.mutate({
          orderId: data.orderId,
          version: data.version,
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

  const finalizeMutation = trpc.orders.finalizeDraft.useMutation({
    onSuccess: data => {
      // BUG-093 FIX: Reset finalization flag and form after successful finalization
      isFinalizingRef.current = false;
      toast.success(`Order #${data.orderNumber} finalized successfully!`);
      // Keep creators in-place after finalize for quick follow-up edits/orders.
      resetComposerState();
      setLocation(buildSalesWorkspacePath("create-order"));
    },
    onError: error => {
      // BUG-093 FIX: Reset flag on error, but preserve form data so user can retry
      pendingPersistFingerprintRef.current = null;
      isFinalizingRef.current = false;
      toast.error(`Failed to finalize order: ${error.message}`);
    },
  });

  // Credit check mutation
  const creditCheckMutation = trpc.credit.checkOrderCredit.useMutation();

  // Auto-save mutation (silent, no toast notifications)
  const autoSaveMutation = trpc.orders.updateDraftEnhanced.useMutation({
    onSuccess: data => {
      setActiveDraftVersion(data.version);
      applyPersistedFingerprint();
    },
    onError: error => {
      pendingPersistFingerprintRef.current = null;
      setError("Auto-save failed", error);
    },
  });

  // CHAOS-025: Debounced auto-save callback (2 second delay)
  const performAutoSave = useCallback(() => {
    if (
      !clientId ||
      items.length === 0 ||
      activeDraftId === null ||
      activeDraftVersion === null
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
    items.length,
    setSaving,
  ]);

  const debouncedAutoSave = useDebounceCallback(performAutoSave, 2000);

  // CHAOS-025: Trigger auto-save when order state changes
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

  const validateOrderMetadata = (
    effectiveOrderType: "QUOTE" | "SALE" = orderType
  ): boolean => {
    handleOrderValidationChange("clientId", clientId ?? undefined);
    handleOrderValidationBlur("clientId");
    handleOrderValidationChange("orderType", effectiveOrderType);
    handleOrderValidationBlur("orderType");

    const result = orderValidationSchema.safeParse({
      clientId: clientId ?? undefined,
      orderType: effectiveOrderType,
    });

    if (!result.success) {
      toast.error("Please select a client before continuing");
      return false;
    }

    return true;
  };

  // Handlers
  const handleSaveDraft = (overrideOrderType?: "SALE" | "QUOTE") => {
    const effectiveOrderType = overrideOrderType ?? orderType;

    if (!validateOrderMetadata(effectiveOrderType)) {
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
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
  };

  const handlePreviewAndFinalize = async () => {
    if (!validateOrderMetadata(orderType)) {
      return;
    }

    if (!isValid) {
      toast.error("Please fix validation errors before finalizing");
      return;
    }

    // Check credit limit for SALE orders
    if (orderType === "SALE") {
      try {
        const result = await creditCheckMutation.mutateAsync({
          clientId: clientId as number,
          orderTotal: totals.total,
          overrideReason: pendingOverrideReason,
        });

        setCreditCheckResult(result);

        // If there's a warning or requires override, show the dialog
        if (result.warning || result.requiresOverride || !result.allowed) {
          setShowCreditWarning(true);
          return;
        }
      } catch (error) {
        // If credit check fails, log but allow order to proceed
        console.error("Credit check failed:", error);
        // Continue to finalize - don't block on credit check errors
      }
    }

    // Show confirmation dialog for finalize
    setShowFinalizeConfirm(true);
  };

  const handleCreditProceed = (overrideReason?: string) => {
    setShowCreditWarning(false);
    setPendingOverrideReason(overrideReason);
    // Show finalize confirmation
    setShowFinalizeConfirm(true);
  };

  const handleCreditCancel = () => {
    setShowCreditWarning(false);
    setCreditCheckResult(null);
    setPendingOverrideReason(undefined);
  };

  const confirmFinalize = () => {
    setShowFinalizeConfirm(false);

    if (!clientId) return;

    // BUG-093 FIX: Set finalization mode BEFORE calling createDraftMutation
    // This ensures the onSuccess handler knows to call finalizeMutation
    isFinalizingRef.current = true;
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
  };

  // Convert inventory items to LineItem format
  const convertInventoryToLineItems = (
    inventoryItems: InventoryItemForOrder[]
  ): LineItem[] => {
    // Filter out items with invalid or missing IDs to prevent race condition errors
    const validItems = inventoryItems.filter(item => {
      if (!item || item.id === undefined || item.id === null) {
        console.warn("Skipping item with missing id:", item);
        return false;
      }
      return true;
    });

    return validItems.map(item => {
      // Calculate margin percent from basePrice and retailPrice
      const cogsPerUnit =
        item.effectiveCogs ?? item.basePrice ?? item.unitCogs ?? 0;
      const retailPrice = item.retailPrice || item.basePrice || 0;

      const availableUnits = Math.max(1, Math.floor(item.quantity ?? 1));
      const quantity =
        normalizePositiveIntegerWithin(
          item.orderQuantity ?? item.quantity ?? 1,
          availableUnits
        ) ?? 1;

      // Preserve exact retail-price cents when profile pricing drives the row.
      const calculated = calculateLineItemFromRetailPrice(
        item.id, // batchId - guaranteed to be defined after filter
        quantity,
        cogsPerUnit,
        retailPrice
      );
      const pricingContext = resolveInventoryPricingContext(item);

      return {
        ...calculated,
        productId: item.productId, // WSQA-002: Include productId for flexible lot selection
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
        marginPercent: calculated.marginPercent || 0, // Ensure marginPercent is always a number
        marginDollar: calculated.marginDollar || 0, // Ensure marginDollar is always a number
        unitPrice: calculated.unitPrice || 0, // Ensure unitPrice is always a number
        lineTotal: calculated.lineTotal || 0, // Ensure lineTotal is always a number
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
  };

  const handleAddItem = (inventoryItems: InventoryItemForOrder[]) => {
    if (!inventoryItems || inventoryItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    // Convert inventory items to LineItem format (filters out invalid items)
    const newLineItems = convertInventoryToLineItems(inventoryItems);

    // Check if any items were skipped due to missing data
    if (newLineItems.length === 0) {
      toast.error("Selected items are not available. Please try again.");
      return;
    }

    if (newLineItems.length < inventoryItems.length) {
      toast.warning(
        `${inventoryItems.length - newLineItems.length} item(s) were skipped due to incomplete data`
      );
    }

    // Filter out items that are already in the order (by batchId)
    const existingBatchIds = new Set(items.map(item => item.batchId));
    const uniqueItems = newLineItems.filter(
      item => !existingBatchIds.has(item.batchId)
    );

    if (uniqueItems.length === 0) {
      toast.warning("Selected items are already in the order");
      return;
    }

    // Add new items to the order
    setItems([...items, ...uniqueItems]);
    toast.success(`Added ${uniqueItems.length} item(s) to order`);
  };

  const keyboard = useWorkSurfaceKeyboard({
    gridMode: false,
    onUndo: () => {
      void undo.undoLast();
    },
    customHandlers: {
      "cmd+s": (e: React.KeyboardEvent) => {
        e.preventDefault();
        performAutoSave();
      },
      "ctrl+s": (e: React.KeyboardEvent) => {
        e.preventDefault();
        performAutoSave();
      },
      "cmd+enter": (e: React.KeyboardEvent) => {
        e.preventDefault();
        void handlePreviewAndFinalize();
      },
      "ctrl+enter": (e: React.KeyboardEvent) => {
        e.preventDefault();
        void handlePreviewAndFinalize();
      },
    },
  });

  const registerLineItemRemovalUndo = useCallback(
    (previousItems: LineItem[], removedBatchIds: number[]) => {
      const removedBatchIdSet = new Set(removedBatchIds);
      const removedItems = previousItems.filter(item =>
        removedBatchIdSet.has(item.batchId)
      );

      if (removedItems.length === 0) {
        return;
      }

      const previousBatchIds = new Set(previousItems.map(item => item.batchId));

      undo.registerAction({
        description:
          removedItems.length === 1
            ? "Removed 1 item"
            : `Removed ${removedItems.length} items`,
        duration: 10000,
        undo: () => {
          setItems(currentItems => {
            const currentById = new Map(
              currentItems.map(item => [item.batchId, item])
            );
            const removedById = new Map(
              removedItems.map(item => [item.batchId, item])
            );
            const restored: LineItem[] = [];

            for (const previousItem of previousItems) {
              const currentItem = currentById.get(previousItem.batchId);
              if (currentItem) {
                restored.push(currentItem);
                continue;
              }
              const removedItem = removedById.get(previousItem.batchId);
              if (removedItem) {
                restored.push(removedItem);
              }
            }

            for (const currentItem of currentItems) {
              if (!previousBatchIds.has(currentItem.batchId)) {
                restored.push(currentItem);
              }
            }

            return restored;
          });
        },
      });
    },
    [undo]
  );

  const handleLineItemsChange = useCallback(
    (nextItems: LineItem[]) => {
      const previousItems = itemsRef.current;
      const nextBatchIds = new Set(nextItems.map(item => item.batchId));
      const removedBatchIds = previousItems
        .filter(item => !nextBatchIds.has(item.batchId))
        .map(item => item.batchId);

      if (removedBatchIds.length > 0) {
        registerLineItemRemovalUndo(previousItems, removedBatchIds);
      }

      setItems(nextItems);
    },
    [registerLineItemRemovalUndo]
  );

  const handlePreviewRemoveItem = useCallback(
    (batchId: number) => {
      const previousItems = itemsRef.current;
      if (!previousItems.some(item => item.batchId === batchId)) {
        return;
      }

      registerLineItemRemovalUndo(previousItems, [batchId]);
      setItems(previousItems.filter(item => item.batchId !== batchId));
    },
    [registerLineItemRemovalUndo]
  );

  return (
    <PageErrorBoundary pageName="OrderCreator">
      <div
        {...keyboard.keyboardProps}
        className="container mx-auto p-3 md:p-4 space-y-4"
      >
        <section className="rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                <ShoppingCart className="h-5 w-5" />
                Create Sales Order
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build the order, review margin, then save or finalize without
                leaving the sales workspace.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {clientId &&
              items.length > 0 &&
              (activeDraftId !== null || saveState.status !== "saved")
                ? SaveStateIndicator
                : null}
            </div>
          </div>

          <div className="grid gap-4 border-b border-border/70 bg-muted/20 px-4 py-4 md:grid-cols-2">
            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <span className="flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Customer
                {clientFieldState.showSuccess ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                ) : null}
                {clientFieldState.showError ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                ) : null}
              </span>
              <ClientCombobox
                value={clientId}
                onValueChange={id => {
                  handleOrderValidationChange("clientId", id ?? undefined);
                  handleOrderValidationBlur("clientId");
                  setClientId(id);
                  // Clear items when changing client
                  if (id !== clientId) {
                    setItems([]);
                  }
                }}
                className={cn(
                  clientFieldState.showError && "border-red-500",
                  clientFieldState.showSuccess && "border-emerald-500"
                )}
                clients={(clients || [])
                  .filter(c => c.isBuyer)
                  .map(client => ({
                    id: client.id,
                    name: client.name,
                    email: client.email,
                    clientType: "buyer",
                  }))}
                isLoading={clientsLoading}
                placeholder="Search for a customer..."
                emptyText="No customers found"
              />
              {clientFieldState.showError ? (
                <p className="text-xs text-destructive">
                  {clientFieldState.error}
                </p>
              ) : null}
            </div>

            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Referred By
              </span>
              {clientId ? (
                <ReferredBySelector
                  excludeClientId={clientId}
                  selectedReferrerId={referredByClientId}
                  onSelect={referrerId => setReferredByClientId(referrerId)}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Select a customer to set referral details
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            {clientId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column: Inventory Browser & Line Items & Adjustment (2/3) */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Inventory Browser */}
                  <Card id="inventory-browser-section">
                    <CardContent className="pt-4">
                      {inventoryError ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                          <p className="text-destructive mb-2 font-medium">
                            Failed to load inventory
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {inventoryError.message}
                          </p>
                          {inventoryQuery.canRetry ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={inventoryQuery.handleRetry}
                              disabled={inventoryQuery.isLoading}
                            >
                              {inventoryQuery.isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Retrying...
                                </>
                              ) : (
                                <>
                                  Retry ({inventoryQuery.remainingRetries}{" "}
                                  attempts remaining)
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <p className="mb-2">
                                Maximum retries reached. Please try:
                              </p>
                              <ul className="list-disc text-left inline-block">
                                <li>Selecting a different customer</li>
                                <li>Refreshing the page</li>
                                <li>
                                  Contacting support if the issue persists
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <InventoryBrowser
                          inventory={inventory || []}
                          isLoading={inventoryLoading}
                          onAddItems={handleAddItem}
                          selectedItems={items.map(item => ({
                            id: item.batchId,
                          }))}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Line Items */}
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="mb-2 text-sm font-semibold">Line Items</h3>
                      <LineItemTable
                        items={items}
                        clientId={clientId}
                        onChange={handleLineItemsChange}
                        onAddItem={() => {
                          // Scroll to InventoryBrowser section
                          const inventoryBrowser = document.getElementById(
                            "inventory-browser-section"
                          );
                          if (inventoryBrowser) {
                            inventoryBrowser.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                            // Focus on search input for better UX
                            setTimeout(() => {
                              const searchInput =
                                inventoryBrowser.querySelector(
                                  'input[type="text"]'
                                ) as HTMLInputElement;
                              if (searchInput) {
                                searchInput.focus();
                              }
                            }, 300);
                          } else {
                            toast.info(
                              "Please use the inventory browser above to add items"
                            );
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Order Adjustment */}
                  <OrderAdjustmentPanel
                    value={adjustment}
                    subtotal={totals.subtotal}
                    onChange={setAdjustment}
                    showOnDocument={showAdjustmentOnDocument}
                    onShowOnDocumentChange={setShowAdjustmentOnDocument}
                  />
                </div>

                {/* Right Column: Totals & Preview (1/3) */}
                <div className="space-y-4 lg:sticky lg:top-4 self-start">
                  {canViewPricingContext ? (
                    <PricingContextPanel
                      clientId={clientId}
                      orderTotal={totals.total}
                    />
                  ) : (
                    <Card>
                      <CardContent className="py-6">
                        <p className="text-center text-sm text-muted-foreground">
                          Pricing context requires pricing access.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Customer Actions
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold">
                          {clientDetails?.name ?? "Selected customer"}
                        </p>
                        {clientDetails?.email ? (
                          <p className="text-xs text-muted-foreground">
                            {clientDetails.email}
                          </p>
                        ) : null}
                        {referredByClientId ? (
                          <p className="text-xs text-muted-foreground">
                            Referred by{" "}
                            {clients.find(c => c.id === referredByClientId)
                              ?.name ?? `Client #${referredByClientId}`}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={event =>
                            openCustomerDrawer("money", event.currentTarget)
                          }
                        >
                          Credit Limit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={event =>
                            openCustomerDrawer(
                              "sales-pricing",
                              event.currentTarget
                            )
                          }
                          disabled={!canViewPricingContext}
                        >
                          Pricing Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Credit Limit Banner */}
                  {clientDetails && orderType === "SALE" && (
                    <CreditLimitBanner
                      client={clientDetails}
                      orderTotal={totals.total}
                    />
                  )}

                  {/* Referral Credits Panel (WS-004) */}
                  {clientId && (
                    <ReferralCreditsPanel
                      clientId={clientId}
                      orderTotal={totals.total}
                    />
                  )}

                  {/* TER-206: Collapsible order preview */}
                  <details open>
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2 select-none">
                      Order Preview
                    </summary>
                    <FloatingOrderPreview
                      clientName={clientDetails?.name || "Client"}
                      items={items}
                      subtotal={totals.subtotal}
                      adjustmentAmount={totals.adjustmentAmount}
                      adjustmentLabel={
                        adjustment?.mode === "DISCOUNT" ? "Discount" : "Markup"
                      }
                      showAdjustment={showAdjustmentOnDocument}
                      total={totals.total}
                      orderType={orderType}
                      showInternalMetrics={true}
                      onUpdateItem={(batchId, updates) => {
                        setItems(prevItems =>
                          prevItems.map(item =>
                            item.batchId === batchId
                              ? { ...item, ...updates }
                              : item
                          )
                        );
                      }}
                      onRemoveItem={handlePreviewRemoveItem}
                    />
                  </details>

                  {/* Totals */}
                  <OrderTotalsPanel
                    totals={totals}
                    warnings={warnings}
                    isValid={isValid}
                  />

                  {/* FEAT-005: Unified Draft/Quote Workflow with Dropdown Menu */}
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      {/* Order Type Selector */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          Order Type
                          {orderTypeFieldState.showSuccess ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          ) : null}
                          {orderTypeFieldState.showError ? (
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : null}
                        </Label>
                        <Select
                          value={orderType}
                          onValueChange={value => {
                            const nextOrderType = value as "QUOTE" | "SALE";
                            setOrderType(nextOrderType);
                            handleOrderValidationChange(
                              "orderType",
                              nextOrderType
                            );
                            handleOrderValidationBlur("orderType");
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-full",
                              orderTypeFieldState.showError && "border-red-500",
                              orderTypeFieldState.showSuccess &&
                                "border-emerald-500"
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALE">Sale Order</SelectItem>
                            <SelectItem value="QUOTE">Quote</SelectItem>
                          </SelectContent>
                        </Select>
                        {orderTypeFieldState.showError ? (
                          <p className="text-xs text-destructive">
                            {orderTypeFieldState.error}
                          </p>
                        ) : null}
                      </div>

                      {/* TER-645: Direct Save Draft button for reliable E2E access */}
                      <Button
                        data-testid="order-save-draft-button"
                        className="w-full"
                        variant="outline"
                        disabled={
                          items.length === 0 ||
                          createDraftMutation.isPending ||
                          updateDraftMutation.isPending
                        }
                        onClick={() => handleSaveDraft()}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {createDraftMutation.isPending ||
                        updateDraftMutation.isPending
                          ? "Saving..."
                          : "Save Draft"}
                      </Button>

                      {/* Unified Save Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            data-testid="order-save-menu-trigger"
                            className="w-full"
                            variant="outline"
                            disabled={
                              items.length === 0 ||
                              createDraftMutation.isPending
                            }
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Options
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Save Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            data-testid="order-save-draft-action"
                            onClick={() => handleSaveDraft()}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Save as Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid="order-save-quote-action"
                            onClick={() => {
                              setOrderType("QUOTE");
                              handleSaveDraft("QUOTE");
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Save & Send as Quote
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Primary Finalize/Confirm Button */}
                      <Button
                        className="w-full"
                        onClick={handlePreviewAndFinalize}
                        disabled={
                          !isValid ||
                          finalizeMutation.isPending ||
                          (createDraftMutation.isPending &&
                            isFinalizingRef.current)
                        }
                      >
                        {finalizeMutation.isPending ||
                        (createDraftMutation.isPending &&
                          isFinalizingRef.current) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {orderType === "QUOTE"
                              ? "Creating Quote..."
                              : "Confirming Order..."}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {orderType === "QUOTE"
                              ? "Confirm Quote"
                              : "Confirm Order"}
                          </>
                        )}
                      </Button>

                      {!isValid && items.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <p className="text-destructive">
                            Fix validation errors before confirming
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">
                      Select a customer to begin
                    </p>
                    <p className="text-sm">
                      Choose a customer from the dropdown above
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <WorkSurfaceStatusBar
            left={`${items.length} items · ${orderType}`}
            center={clientDetails?.name || "No client selected"}
            right={
              <KeyboardHintBar
                hints={[
                  { key: "Cmd/Ctrl+S", label: "Save" },
                  { key: "Cmd/Ctrl+Enter", label: "Finalize" },
                  { key: "Cmd/Ctrl+Z", label: "Undo" },
                ]}
              />
            }
          />
        </section>

        <Drawer
          open={customerDrawerOpen}
          onOpenChange={handleCustomerDrawerOpenChange}
          direction="right"
        >
          <DrawerContent className="w-[760px] sm:max-w-none">
            <DrawerHeader>
              <DrawerTitle>Relationship Profile</DrawerTitle>
              <DrawerDescription>
                Shared profile drawer for money, pricing, and open relationship
                context. Successful closes return focus to the source control.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              {clientId ? (
                <div className="space-y-4">
                  <ProfileQuickPanel
                    clientId={clientId}
                    initialSection={customerDrawerSection}
                    onClose={closeCustomerDrawer}
                  />
                  {customerDrawerSection === "money" ? (
                    <CreditLimitWidget
                      clientId={clientId}
                      defaultExpanded={true}
                    />
                  ) : null}
                  {customerDrawerSection === "sales-pricing" ? (
                    canManagePricing ? (
                      <PricingConfigTab
                        clientId={clientId}
                        onProfileApplied={handlePricingProfileApplied}
                      />
                    ) : (
                      <Card>
                        <CardContent className="py-4 text-sm text-muted-foreground">
                          Pricing rules can be reviewed here, but changing the
                          relationship pricing profile requires pricing edit
                          permissions.
                        </CardContent>
                      </Card>
                    )
                  ) : null}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-sm text-muted-foreground">
                    Select a customer to open profile controls.
                  </CardContent>
                </Card>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Credit Warning Dialog */}
        <CreditWarningDialog
          open={showCreditWarning}
          onOpenChange={setShowCreditWarning}
          creditCheck={creditCheckResult}
          orderTotal={totals.total}
          clientName={clientDetails?.name || "Client"}
          onProceed={handleCreditProceed}
          onCancel={handleCreditCancel}
        />

        {/* Finalize Confirmation Dialog */}
        <ConfirmDialog
          open={showFinalizeConfirm}
          onOpenChange={setShowFinalizeConfirm}
          title={`Finalize ${orderType === "QUOTE" ? "Quote" : "Sales Order"}?`}
          description={`Are you sure you want to finalize this ${orderType.toLowerCase()}? Total: $${totals.total.toFixed(2)}. This will create the order and cannot be undone.`}
          confirmLabel="Finalize"
          variant="default"
          onConfirm={confirmFinalize}
        />

        {/* CHAOS-007: Unsaved Changes Navigation Dialog */}
        <ConfirmNavigationDialog />
      </div>
    </PageErrorBoundary>
  );
}
