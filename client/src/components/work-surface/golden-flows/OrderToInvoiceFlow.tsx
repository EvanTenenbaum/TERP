/**
 * OrderToInvoiceFlow - UXS-602: Order-to-Invoice Golden Flow
 *
 * Guided workflow for generating an invoice from a confirmed order.
 * This flow helps users:
 * 1. Review confirmed order details
 * 2. Adjust invoice terms and due date
 * 3. Add any additional charges or discounts
 * 4. Generate and optionally send the invoice
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
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";

// Icons
import {
  FileText,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  DollarSign,
  Calendar,
  Loader2,
  Send,
  Download,
  Sparkles,
  Percent,
  Plus,
  Minus,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type RouterOutputs = inferRouterOutputs<AppRouter>;
type OrderByIdOutput = RouterOutputs["orders"]["getById"];
type OrderDataItems = OrderByIdOutput extends { items: infer Items }
  ? Items
  : unknown;

type InvoiceConfigUpdate = <K extends keyof InvoiceConfig>(
  field: K,
  value: InvoiceConfig[K]
) => void;

interface Order {
  id: number;
  orderNumber: string;
  clientId: number;
  clientName?: string;
  total: string;
  confirmedAt?: string;
  lineItems: Array<{
    id: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
}

interface InvoiceConfig {
  dueDate: string;
  paymentTerms: string;
  discount: number;
  discountType: "percent" | "fixed";
  additionalCharges: Array<{
    description: string;
    amount: number;
  }>;
  notes: string;
  autoSend: boolean;
}

interface RawOrderItem {
  displayName?: string;
  originalName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

const isRawOrderItem = (value: unknown): value is RawOrderItem => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as RawOrderItem;
  return (
    typeof candidate.quantity === "number" &&
    typeof candidate.unitPrice === "number"
  );
};

const toLineItems = (items: OrderDataItems): Order["lineItems"] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter(isRawOrderItem)
    .map((item, index): Order["lineItems"][number] => {
      const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
      const unitPrice = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
      const lineTotal =
        typeof item.lineTotal === "number"
          ? item.lineTotal
          : quantity * unitPrice;
      return {
        id: index + 1,
        productName: item.displayName || item.originalName || "Item",
        quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: lineTotal.toFixed(2),
      };
    });
};

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
    title: "Review Order",
    description: "Verify order details",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    id: 2,
    title: "Invoice Terms",
    description: "Set payment terms and due date",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    id: 3,
    title: "Adjustments",
    description: "Add discounts or charges",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    id: 4,
    title: "Generate",
    description: "Review and create invoice",
    icon: <FileText className="h-5 w-5" />,
  },
];

const PAYMENT_TERMS = [
  { value: "NET_7", label: "Net 7", days: 7 },
  { value: "NET_15", label: "Net 15", days: 15 },
  { value: "NET_30", label: "Net 30", days: 30 },
  { value: "NET_45", label: "Net 45", days: 45 },
  { value: "NET_60", label: "Net 60", days: 60 },
  { value: "DUE_ON_RECEIPT", label: "Due on Receipt", days: 0 },
  { value: "CUSTOM", label: "Custom", days: null },
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
    <div className="flex items-center justify-between mb-6">
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
                "flex items-center gap-2 p-2 rounded-lg transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isCompleted &&
                  "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer",
                !isActive && !isCompleted && "bg-muted text-muted-foreground",
                !isClickable && !isActive && "cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  isActive && "bg-primary-foreground/20",
                  isCompleted && "bg-green-600 text-white"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : step.id}
              </div>
              <span className="font-medium text-sm hidden sm:inline">
                {step.title}
              </span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// STEP 1: REVIEW ORDER
// ============================================================================

function ReviewOrderStep({
  order,
  isLoading,
}: {
  order: Order | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
        <p>Order not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Order #{order.orderNumber}
              </CardTitle>
              <CardDescription>
                Confirmed:{" "}
                {order.confirmedAt ? formatDate(order.confirmedAt) : "N/A"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Confirmed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{order.clientName || "Unknown"}</span>
          </div>
          <Separator />
          <div className="space-y-2">
            {order.lineItems.map((item, index) => (
              <div
                key={item.id || index}
                className="flex justify-between text-sm"
              >
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-mono">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Order Total</span>
            <span className="font-mono text-lg">
              {formatCurrency(order.total)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// STEP 2: INVOICE TERMS
// ============================================================================

function InvoiceTermsStep({
  config,
  onUpdate,
}: {
  config: InvoiceConfig;
  onUpdate: InvoiceConfigUpdate;
}) {
  const handleTermsChange = (value: string) => {
    onUpdate("paymentTerms", value);
    const term = PAYMENT_TERMS.find(t => t.value === value);
    if (term && term.days !== null) {
      const dueDate = addDays(new Date(), term.days);
      onUpdate("dueDate", format(dueDate, "yyyy-MM-dd"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Select value={config.paymentTerms} onValueChange={handleTermsChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select terms" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map(term => (
                <SelectItem key={term.value} value={term.value}>
                  {term.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={config.dueDate}
            onChange={e => onUpdate("dueDate", e.target.value)}
            min={format(new Date(), "yyyy-MM-dd")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Invoice Notes (optional)</Label>
        <Textarea
          placeholder="Add any notes to appear on the invoice..."
          value={config.notes}
          onChange={e => onUpdate("notes", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3: ADJUSTMENTS
// ============================================================================

function AdjustmentsStep({
  config,
  orderTotal,
  onUpdate,
}: {
  config: InvoiceConfig;
  orderTotal: number;
  onUpdate: InvoiceConfigUpdate;
}) {
  const addCharge = () => {
    onUpdate("additionalCharges", [
      ...config.additionalCharges,
      { description: "", amount: 0 },
    ]);
  };

  const updateCharge = (
    index: number,
    field: "description" | "amount",
    value: string | number
  ): void => {
    const newCharges = [...config.additionalCharges];
    newCharges[index] = { ...newCharges[index], [field]: value };
    onUpdate("additionalCharges", newCharges);
  };

  const removeCharge = (index: number) => {
    onUpdate(
      "additionalCharges",
      config.additionalCharges.filter((_, i) => i !== index)
    );
  };

  const discountAmount =
    config.discountType === "percent"
      ? (orderTotal * config.discount) / 100
      : config.discount;

  const chargesTotal = config.additionalCharges.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );
  const adjustedTotal = orderTotal - discountAmount + chargesTotal;
  const handleDiscountTypeChange = (value: string): void => {
    if (value === "percent" || value === "fixed") {
      onUpdate("discountType", value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Discount */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Discount
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                value={config.discount}
                onChange={e =>
                  onUpdate("discount", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Type</Label>
              <Select
                value={config.discountType}
                onValueChange={handleDiscountTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                  <SelectItem value="fixed">Fixed ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {config.discount > 0 && (
            <p className="text-sm text-green-600">
              Discount: -{formatCurrency(discountAmount)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Additional Charges */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Additional Charges
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addCharge}>
              <Plus className="h-4 w-4 mr-1" />
              Add Charge
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.additionalCharges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No additional charges
            </p>
          ) : (
            config.additionalCharges.map((charge, index) => (
              <div
                key={`${charge.description}-${charge.amount}`}
                className="flex gap-2 items-center"
              >
                <Input
                  placeholder="Description"
                  value={charge.description}
                  onChange={e =>
                    updateCharge(index, "description", e.target.value)
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={charge.amount}
                  onChange={e =>
                    updateCharge(
                      index,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-28"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCharge(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Order Subtotal</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
          {config.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {chargesTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span>Additional Charges</span>
              <span>+{formatCurrency(chargesTotal)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Invoice Total</span>
            <span className="text-lg">{formatCurrency(adjustedTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// STEP 4: GENERATE
// ============================================================================

function GenerateStep({
  order,
  config,
  orderTotal,
  onGenerate,
  isGenerating,
}: {
  order: Order;
  config: InvoiceConfig;
  orderTotal: number;
  onGenerate: (sendEmail: boolean) => void;
  isGenerating: boolean;
}) {
  const discountAmount =
    config.discountType === "percent"
      ? (orderTotal * config.discount) / 100
      : config.discount;
  const chargesTotal = config.additionalCharges.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );
  const invoiceTotal = orderTotal - discountAmount + chargesTotal;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Order</span>
              <p className="font-medium">#{order.orderNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Client</span>
              <p className="font-medium">{order.clientName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Terms</span>
              <p className="font-medium">
                {
                  PAYMENT_TERMS.find(t => t.value === config.paymentTerms)
                    ?.label
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date</span>
              <p className="font-medium">{formatDate(config.dueDate)}</p>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Invoice Total</span>
            <span>{formatCurrency(invoiceTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="font-medium">Send invoice via email</p>
          <p className="text-sm text-muted-foreground">
            Automatically email the invoice to the client
          </p>
        </div>
        <Switch checked={config.autoSend} onCheckedChange={() => {}} />
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onGenerate(false)}
          disabled={isGenerating}
        >
          <Download className="h-4 w-4 mr-2" />
          Generate Only
        </Button>
        <Button
          className="flex-1"
          onClick={() => onGenerate(true)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Generate & Send
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

interface OrderToInvoiceFlowProps {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated?: (invoiceId: number) => void;
}

export function OrderToInvoiceFlow({
  orderId,
  open,
  onOpenChange,
  onInvoiceCreated,
}: OrderToInvoiceFlowProps): ReactElement {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<InvoiceConfig>({
    dueDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    paymentTerms: "NET_30",
    discount: 0,
    discountType: "percent",
    additionalCharges: [],
    notes: "",
    autoSend: false,
  });

  // Work Surface hooks
  const { setSaving, setSaved, setError } = useSaveState();

  // Data queries
  const { data: orderData, isLoading } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: open && !!orderId }
  );
  const { data: clientData } = trpc.clients.getById.useQuery(
    { clientId: orderData?.clientId ?? 0 },
    { enabled: open && !!orderData?.clientId }
  );

  const order = useMemo<Order | null>(() => {
    if (!orderData) return null;
    return {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      clientId: orderData.clientId,
      clientName: clientData?.name || "Unknown",
      total: orderData.total,
      confirmedAt: orderData.confirmedAt
        ? orderData.confirmedAt instanceof Date
          ? orderData.confirmedAt.toISOString()
          : String(orderData.confirmedAt)
        : undefined,
      lineItems: toLineItems(orderData.items),
    };
  }, [orderData, clientData]);

  const orderTotal = useMemo(() => parseFloat(order?.total || "0"), [order]);

  // Update config helper
  const updateConfig: InvoiceConfigUpdate = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Create invoice mutation
  const createInvoiceMutation = trpc.accounting.invoices.create.useMutation({
    onMutate: () => setSaving("Creating invoice..."),
    onSuccess: data => {
      setSaved();
      toast.success("Invoice created successfully!");
      onInvoiceCreated?.(data);
      onOpenChange(false);
      setCurrentStep(1);
    },
    onError: err => {
      setError(err.message);
      toast.error(err.message || "Failed to create invoice");
    },
  });

  const handleGenerate = useCallback(
    (sendEmail: boolean) => {
      if (!order) return;

      const discountAmount =
        config.discountType === "percent"
          ? (orderTotal * config.discount) / 100
          : config.discount;
      const chargesTotal = config.additionalCharges.reduce(
        (sum, c) => sum + (c.amount || 0),
        0
      );
      const invoiceTotal = orderTotal - discountAmount + chargesTotal;

      createInvoiceMutation.mutate({
        customerId: order.clientId,
        dueDate: new Date(config.dueDate),
        totalAmount: invoiceTotal.toString(),
        notes: config.notes,
        sendEmail,
        discount: discountAmount,
        additionalCharges: config.additionalCharges,
      } as unknown as Parameters<typeof createInvoiceMutation.mutate>[0]);
    },
    [order, config, orderTotal, createInvoiceMutation]
  );

  // Keyboard shortcuts
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    customHandlers: {
      arrowright: e => {
        e.preventDefault();
        if (currentStep < FLOW_STEPS.length) {
          setCurrentStep(prev => prev + 1);
        }
      },
      arrowleft: e => {
        e.preventDefault();
        if (currentStep > 1) {
          setCurrentStep(prev => prev - 1);
        }
      },
    },
    onCancel: () => {
      if (currentStep === 1) {
        onOpenChange(false);
      } else {
        setCurrentStep(prev => prev - 1);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-hidden"
        {...keyboardProps}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription>
            Create an invoice from this confirmed order
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <StepIndicator
            steps={FLOW_STEPS}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          <div className="min-h-[350px] max-h-[400px] overflow-y-auto pr-2">
            {currentStep === 1 && (
              <ReviewOrderStep order={order} isLoading={isLoading} />
            )}
            {currentStep === 2 && (
              <InvoiceTermsStep config={config} onUpdate={updateConfig} />
            )}
            {currentStep === 3 && (
              <AdjustmentsStep
                config={config}
                orderTotal={orderTotal}
                onUpdate={updateConfig}
              />
            )}
            {currentStep === 4 && order && (
              <GenerateStep
                order={order}
                config={config}
                orderTotal={orderTotal}
                onGenerate={handleGenerate}
                isGenerating={createInvoiceMutation.isPending}
              />
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {currentStep < FLOW_STEPS.length && (
            <Button onClick={() => setCurrentStep(prev => prev + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OrderToInvoiceFlow;
