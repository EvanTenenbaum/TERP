/**
 * OrderCreationFlow - UXS-601: Order Creation Golden Flow
 *
 * Guided workflow for creating a sales order from inventory.
 * This flow helps users:
 * 1. Select products from available inventory batches
 * 2. Set quantities and pricing
 * 3. Choose the client
 * 4. Create and optionally confirm the order
 *
 * @see ATOMIC_UX_STRATEGY.md - Golden Flow specification
 */

import {
  useState,
  useMemo,
  useCallback,
  type ReactElement,
  type ReactNode,
} from "react";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";

// Icons
import {
  Package,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  DollarSign,
  Users,
  Loader2,
  Sparkles,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;
type ClientsListResponse = RouterOutputs["clients"]["list"];
type ClientListItem = ClientsListResponse extends { items: Array<infer Item> }
  ? Item
  : never;
type CreateOrderOutput = RouterOutputs["orders"]["create"];

type ProductUpdateHandler = <K extends keyof SelectedProduct>(
  batchId: number,
  field: K,
  value: SelectedProduct[K]
) => void;

interface IntakeBatch {
  id: number;
  productId?: number;
  productName: string;
  quantity: number;
  unitCost: string;
  vendorName: string;
  receivedAt: string;
}

interface SelectedProduct {
  batchId: number;
  productId?: number;
  productName: string;
  availableQuantity: number;
  selectedQuantity: number;
  unitPrice: string;
  costBasis: string;
}

interface FlowStep {
  id: number;
  title: string;
  description: string;
  icon: ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FLOW_STEPS: FlowStep[] = [
  {
    id: 1,
    title: "Select Products",
    description: "Choose products from the intake",
    icon: <Package className="h-5 w-5" />,
  },
  {
    id: 2,
    title: "Set Quantities & Pricing",
    description: "Configure quantities and sale prices",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    id: 3,
    title: "Choose Client",
    description: "Select the client for this order",
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: 4,
    title: "Review & Create",
    description: "Review and create the order",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
];

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch {
    return "-";
  }
};

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: FlowStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const isClickable = step.id < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isCompleted &&
                  "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer",
                !isActive && !isCompleted && "bg-muted text-muted-foreground",
                !isClickable && !isActive && "cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isActive && "bg-primary-foreground/20",
                  isCompleted && "bg-green-600 text-white",
                  !isActive && !isCompleted && "bg-muted-foreground/20"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.icon}
              </div>
              <div className="text-left hidden md:block">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs opacity-80">{step.description}</p>
              </div>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="h-5 w-5 mx-2 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// STEP 1: SELECT PRODUCTS
// ============================================================================

function SelectProductsStep({
  batches,
  selectedBatches,
  onToggleBatch,
  isLoading,
}: {
  batches: IntakeBatch[];
  selectedBatches: Set<number>;
  onToggleBatch: (batchId: number) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p className="font-medium">No available batches</p>
        <p className="text-sm">
          Create an intake first to have products to sell
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Available Batches</h3>
        <Badge variant="outline">
          {selectedBatches.size} of {batches.length} selected
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {batches.map(batch => (
            <div
              key={batch.id}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                selectedBatches.has(batch.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onToggleBatch(batch.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedBatches.has(batch.id)}
                    onCheckedChange={() => onToggleBatch(batch.id)}
                  />
                  <div>
                    <p className="font-medium">{batch.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      From: {batch.vendorName} • Received:{" "}
                      {formatDate(batch.receivedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{batch.quantity} units</p>
                  <p className="text-sm text-muted-foreground">
                    Cost: {formatCurrency(batch.unitCost)}/unit
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// STEP 2: SET QUANTITIES & PRICING
// ============================================================================

function QuantityPricingStep({
  products,
  onUpdateProduct,
}: {
  products: SelectedProduct[];
  onUpdateProduct: ProductUpdateHandler;
}) {
  const calculateMargin = (product: SelectedProduct): number => {
    const price = parseFloat(product.unitPrice) || 0;
    const cost = parseFloat(product.costBasis) || 0;
    if (cost === 0) return 0;
    return Math.round(((price - cost) / cost) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Configure Products</h3>
        <Badge variant="outline">{products.length} products</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {products.map(product => {
            const margin = calculateMargin(product);
            const lineTotal =
              product.selectedQuantity * parseFloat(product.unitPrice || "0");

            return (
              <Card key={product.batchId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {product.productName}
                  </CardTitle>
                  <CardDescription>
                    Available: {product.availableQuantity} units • Cost basis:{" "}
                    {formatCurrency(product.costBasis)}/unit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        max={product.availableQuantity}
                        value={product.selectedQuantity}
                        onChange={e =>
                          onUpdateProduct(
                            product.batchId,
                            "selectedQuantity",
                            Math.min(
                              parseInt(e.target.value) || 0,
                              product.availableQuantity
                            )
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit Price</label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={product.unitPrice}
                        onChange={e =>
                          onUpdateProduct(
                            product.batchId,
                            "unitPrice",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex gap-4">
                      <span className="text-sm">
                        Margin:{" "}
                        <span
                          className={cn(
                            "font-semibold",
                            margin > 0
                              ? "text-green-600"
                              : margin < 0
                                ? "text-red-600"
                                : ""
                          )}
                        >
                          {margin}%
                        </span>
                      </span>
                    </div>
                    <span className="font-semibold">
                      Line Total: {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// STEP 3: CHOOSE CLIENT
// ============================================================================

function ChooseClientStep({
  clients,
  selectedClientId,
  onSelectClient,
  isLoading,
}: {
  clients: ClientListItem[];
  selectedClientId: number | null;
  onSelectClient: (clientId: number) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredClients = useMemo(() => {
    if (!search) return clients;
    const searchLower = search.toLowerCase();
    return clients.filter(
      c =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
    );
  }, [clients, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-2">
          {filteredClients.map(client => (
            <div
              key={client.id}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-colors",
                selectedClientId === client.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelectClient(client.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.email || "No email"}
                  </p>
                </div>
                {selectedClientId === client.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// STEP 4: REVIEW & CREATE
// ============================================================================

function ReviewStep({
  products,
  clientName,
  onCreateOrder,
  isCreating,
}: {
  products: SelectedProduct[];
  clientName: string;
  onCreateOrder: (asDraft: boolean) => void;
  isCreating: boolean;
}) {
  const orderTotal = products.reduce(
    (sum, p) => sum + p.selectedQuantity * parseFloat(p.unitPrice || "0"),
    0
  );
  const totalCost = products.reduce(
    (sum, p) => sum + p.selectedQuantity * parseFloat(p.costBasis || "0"),
    0
  );
  const margin =
    totalCost > 0
      ? Math.round(((orderTotal - totalCost) / totalCost) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Products</span>
            <span className="font-medium">{products.length} items</span>
          </div>
          <Separator />
          {products.map(p => (
            <div key={p.batchId} className="flex justify-between text-sm">
              <span>
                {p.productName} × {p.selectedQuantity}
              </span>
              <span>
                {formatCurrency(
                  p.selectedQuantity * parseFloat(p.unitPrice || "0")
                )}
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatCurrency(orderTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin</span>
            <span
              className={cn(
                "font-medium",
                margin > 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {margin}%
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onCreateOrder(true)}
          disabled={isCreating}
        >
          Save as Draft
        </Button>
        <Button
          className="flex-1"
          onClick={() => onCreateOrder(false)}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Create & Confirm
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface OrderCreationFlowProps {
  /** Optional: filter batches by a specific intake */
  intakeId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: (orderId: number) => void;
}

export function OrderCreationFlow({
  intakeId: _intakeId,
  open,
  onOpenChange,
  onOrderCreated,
}: OrderCreationFlowProps): ReactElement {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(
    new Set()
  );
  const [products, setProducts] = useState<SelectedProduct[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Work Surface hooks
  const { setSaving, setSaved, setError } = useSaveState();

  // Data queries
  const inventoryQueryInput: RouterInputs["inventory"]["getEnhanced"] = {};
  const { data: batchesData, isLoading: loadingBatches } =
    trpc.inventory.getEnhanced.useQuery(inventoryQueryInput, { enabled: open });
  const batches: IntakeBatch[] = useMemo(() => {
    const items = batchesData?.items ?? [];
    return items.map(
      (item): IntakeBatch => ({
        id: item.id,
        productId: undefined,
        productName: item.productName,
        quantity: item.availableQty,
        unitCost: (item.unitCogs ?? 0).toFixed(2),
        vendorName: item.vendorName ?? "Unknown",
        receivedAt:
          item.receivedDate instanceof Date
            ? item.receivedDate.toISOString()
            : String(item.receivedDate),
      })
    );
  }, [batchesData]);

  const { data: clientsData, isLoading: loadingClients } =
    trpc.clients.list.useQuery(
      { limit: 500 },
      { enabled: open && currentStep === 3 }
    );
  const clients: ClientListItem[] = clientsData?.items ?? [];

  // Get client name
  const selectedClient = clients.find(client => client.id === selectedClientId);
  const selectedClientName = selectedClient?.name || "";

  // Handlers
  const handleToggleBatch = useCallback((batchId: number) => {
    setSelectedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  }, []);

  const handleUpdateProduct: ProductUpdateHandler = useCallback(
    (batchId, field, value) => {
      setProducts(prev =>
        prev.map(p => (p.batchId === batchId ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      // Convert selected batches to products
      const selectedProducts: SelectedProduct[] = batches
        .filter(b => selectedBatches.has(b.id))
        .map(b => ({
          batchId: b.id,
          productId: b.productId,
          productName: b.productName,
          availableQuantity: b.quantity,
          selectedQuantity: b.quantity,
          unitPrice: (parseFloat(b.unitCost) * 1.3).toFixed(2), // Default 30% markup
          costBasis: b.unitCost,
        }));
      setProducts(selectedProducts);
    }
    setCurrentStep(prev => Math.min(prev + 1, FLOW_STEPS.length));
  }, [currentStep, batches, selectedBatches]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  // Create order mutation
  const createOrderMutation = trpc.orders.create.useMutation({
    onMutate: () => setSaving("Creating order..."),
    onSuccess: (data: CreateOrderOutput) => {
      setSaved();
      toast.success("Order created successfully!");
      onOrderCreated?.(data.id);
      onOpenChange(false);
      // Reset state
      setCurrentStep(1);
      setSelectedBatches(new Set());
      setProducts([]);
      setSelectedClientId(null);
    },
    onError: err => {
      setError(err.message);
      toast.error(err.message || "Failed to create order");
    },
  });

  const handleCreateOrder = useCallback(
    (asDraft: boolean) => {
      if (!selectedClientId) {
        toast.error("Please select a client");
        return;
      }

      const createOrderInput: RouterInputs["orders"]["create"] = {
        orderType: "SALE",
        clientId: selectedClientId,
        items: products.map(p => ({
          batchId: p.batchId,
          quantity: p.selectedQuantity,
          unitPrice: parseFloat(p.unitPrice),
          isSample: false,
        })),
        isDraft: asDraft,
      };
      createOrderMutation.mutate(createOrderInput);
    },
    [selectedClientId, products, createOrderMutation]
  );

  // Keyboard shortcuts
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    customHandlers: {
      arrowright: e => {
        e.preventDefault();
        if (canProceed) handleNextStep();
      },
      arrowleft: e => {
        e.preventDefault();
        handlePrevStep();
      },
    },
    onRowCommit: () => {
      if (currentStep === FLOW_STEPS.length && canProceed) {
        handleCreateOrder(false);
      } else if (canProceed) {
        handleNextStep();
      }
    },
    onCancel: () => {
      if (currentStep === 1) {
        onOpenChange(false);
      } else {
        handlePrevStep();
      }
    },
  });

  // Can proceed to next step?
  const canProceed =
    (currentStep === 1 && selectedBatches.size > 0) ||
    (currentStep === 2 &&
      products.every(
        p => p.selectedQuantity > 0 && parseFloat(p.unitPrice) > 0
      )) ||
    (currentStep === 3 && selectedClientId !== null) ||
    currentStep === 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-hidden"
        {...keyboardProps}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Order from Intake
          </DialogTitle>
          <DialogDescription>
            Convert received inventory into a sales order
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <StepIndicator
            steps={FLOW_STEPS}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <SelectProductsStep
                batches={batches}
                selectedBatches={selectedBatches}
                onToggleBatch={handleToggleBatch}
                isLoading={loadingBatches}
              />
            )}
            {currentStep === 2 && (
              <QuantityPricingStep
                products={products}
                onUpdateProduct={handleUpdateProduct}
              />
            )}
            {currentStep === 3 && (
              <ChooseClientStep
                clients={clients}
                selectedClientId={selectedClientId}
                onSelectClient={setSelectedClientId}
                isLoading={loadingClients}
              />
            )}
            {currentStep === 4 && (
              <ReviewStep
                products={products}
                clientName={selectedClientName}
                onCreateOrder={handleCreateOrder}
                isCreating={createOrderMutation.isPending}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {currentStep < FLOW_STEPS.length && (
            <Button onClick={handleNextStep} disabled={!canProceed}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OrderCreationFlow;
