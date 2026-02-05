/**
 * InvoiceToPaymentFlow - UXS-603: Invoice-to-Payment Golden Flow
 *
 * Guided workflow for recording payments against invoices.
 * This flow helps users:
 * 1. Review invoice details and payment history
 * 2. Select payment method and amount
 * 3. Add payment reference information
 * 4. Record and optionally send receipt
 *
 * @see ATOMIC_UX_STRATEGY.md - Golden Flow specification
 */

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type ReactElement,
  type ReactNode,
} from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../../server/routers";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";

// Icons
import {
  FileText,
  CreditCard,
  Banknote,
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  DollarSign,
  Receipt,
  Loader2,
  Send,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PaymentsListResponse = RouterOutputs["accounting"]["payments"]["list"];
type PaymentListItem = PaymentsListResponse extends { items: Array<infer Item> }
  ? Item
  : never;

type PaymentConfigUpdate = <K extends keyof PaymentConfig>(
  field: K,
  value: PaymentConfig[K]
) => void;

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName?: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: string;
}

interface PaymentConfig {
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  reference: string;
  notes: string;
  sendReceipt: boolean;
}

interface PaymentHistoryItem {
  id: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
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
    title: "Review Invoice",
    description: "Check invoice and payment status",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: 2,
    title: "Payment Details",
    description: "Enter payment information",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: 3,
    title: "Confirm",
    description: "Review and record payment",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "CHECK", label: "Check", icon: Receipt },
  { value: "CREDIT_CARD", label: "Credit Card", icon: CreditCard },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
  { value: "ACH", label: "ACH", icon: Building2 },
  { value: "WIRE", label: "Wire Transfer", icon: Building2 },
  { value: "OTHER", label: "Other", icon: DollarSign },
];

const QUICK_AMOUNTS = ["full", "50%", "25%", "custom"] as const;

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

const toPaymentHistoryItem = (payment: PaymentListItem): PaymentHistoryItem => {
  const paymentDate =
    payment.paymentDate instanceof Date
      ? payment.paymentDate.toISOString()
      : String(payment.paymentDate);
  return {
    id: payment.id,
    amount: payment.amount,
    paymentDate,
    paymentMethod: payment.paymentMethod,
    reference: payment.referenceNumber ?? undefined,
  };
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
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isCompleted && onStepClick(step.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isCompleted &&
                  "bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer",
                !isActive &&
                  !isCompleted &&
                  "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
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
// STEP 1: REVIEW INVOICE
// ============================================================================

function ReviewInvoiceStep({
  invoice,
  paymentHistory,
  isLoading,
}: {
  invoice: Invoice | null;
  paymentHistory: PaymentHistoryItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p>Invoice not found</p>
      </div>
    );
  }

  const amountDue = parseFloat(invoice.amountDue);
  const totalAmount = parseFloat(invoice.totalAmount);
  const amountPaid = parseFloat(invoice.amountPaid);
  const paymentProgress =
    totalAmount > 0 ? Math.round((amountPaid / totalAmount) * 100) : 0;
  const isOverdue = invoice.status === "OVERDUE";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Invoice #{invoice.invoiceNumber}
              </CardTitle>
              <CardDescription>
                {invoice.customerName || "Unknown Customer"}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                invoice.status === "PAID" && "bg-green-100 text-green-800",
                invoice.status === "PARTIAL" && "bg-yellow-100 text-yellow-800",
                invoice.status === "OVERDUE" && "bg-red-100 text-red-800",
                invoice.status === "SENT" && "bg-blue-100 text-blue-800"
              )}
            >
              {invoice.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Invoice Date</span>
              <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date</span>
              <p className={cn("font-medium", isOverdue && "text-red-600")}>
                {formatDate(invoice.dueDate)}
                {isOverdue && (
                  <AlertTriangle className="h-4 w-4 inline ml-1 text-red-600" />
                )}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-mono">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-mono text-green-600">
                {formatCurrency(amountPaid)}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{paymentProgress}%</span>
              </div>
              <Progress value={paymentProgress} className="h-2" />
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Amount Due</span>
              <span
                className={cn(
                  "font-mono text-lg",
                  amountDue > 0 && "text-red-600"
                )}
              >
                {formatCurrency(amountDue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentHistory.slice(0, 3).map(payment => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded"
                >
                  <div>
                    <span className="font-medium">
                      {formatDate(payment.paymentDate)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      via {payment.paymentMethod.replace("_", " ")}
                    </span>
                  </div>
                  <span className="font-mono text-green-600">
                    +{formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// STEP 2: PAYMENT DETAILS
// ============================================================================

function PaymentDetailsStep({
  config,
  amountDue,
  onUpdate,
}: {
  config: PaymentConfig;
  amountDue: number;
  onUpdate: PaymentConfigUpdate;
}) {
  const [quickAmount, setQuickAmount] = useState<string>("full");

  const handleQuickAmount = (type: string) => {
    setQuickAmount(type);
    if (type === "full") {
      onUpdate("amount", amountDue.toFixed(2));
    } else if (type === "50%") {
      onUpdate("amount", (amountDue * 0.5).toFixed(2));
    } else if (type === "25%") {
      onUpdate("amount", (amountDue * 0.25).toFixed(2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Amount */}
      <div className="space-y-3">
        <Label>Payment Amount</Label>
        <div className="flex gap-2 mb-2">
          {QUICK_AMOUNTS.map(type => (
            <Button
              key={type}
              variant={quickAmount === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickAmount(type)}
            >
              {type === "full" ? "Full Amount" : type}
            </Button>
          ))}
        </div>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            step="0.01"
            min="0"
            max={amountDue}
            value={config.amount}
            onChange={e => {
              onUpdate("amount", e.target.value);
              setQuickAmount("custom");
            }}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Amount due: {formatCurrency(amountDue)}
        </p>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <Label>Payment Method</Label>
        <RadioGroup
          value={config.paymentMethod}
          onValueChange={v => onUpdate("paymentMethod", v)}
          className="grid grid-cols-2 gap-2"
        >
          {PAYMENT_METHODS.slice(0, 6).map(method => {
            const Icon = method.icon;
            return (
              <div key={method.value}>
                <RadioGroupItem
                  value={method.value}
                  id={method.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={method.value}
                  className={cn(
                    "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                    "hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {method.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Date and Reference */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input
            type="date"
            value={config.paymentDate}
            onChange={e => onUpdate("paymentDate", e.target.value)}
            max={format(new Date(), "yyyy-MM-dd")}
          />
        </div>
        <div className="space-y-2">
          <Label>Reference # (optional)</Label>
          <Input
            placeholder="Check #, Transaction ID..."
            value={config.reference}
            onChange={e => onUpdate("reference", e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="Add any payment notes..."
          value={config.notes}
          onChange={e => onUpdate("notes", e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3: CONFIRM
// ============================================================================

function ConfirmStep({
  invoice,
  config,
  onRecord,
  isRecording,
}: {
  invoice: Invoice;
  config: PaymentConfig;
  onRecord: (sendReceipt: boolean) => void;
  isRecording: boolean;
}) {
  const paymentAmount = parseFloat(config.amount) || 0;
  const amountDue = parseFloat(invoice.amountDue);
  const remainingAfter = Math.max(0, amountDue - paymentAmount);
  const willBePaid = remainingAfter === 0;
  const method = PAYMENT_METHODS.find(m => m.value === config.paymentMethod);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Invoice</span>
              <p className="font-medium">#{invoice.invoiceNumber}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Customer</span>
              <p className="font-medium">{invoice.customerName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Payment Date</span>
              <p className="font-medium">{formatDate(config.paymentDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Method</span>
              <p className="font-medium">
                {method?.label || config.paymentMethod}
              </p>
            </div>
            {config.reference && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Reference</span>
                <p className="font-medium font-mono">{config.reference}</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Due</span>
              <span className="font-mono">{formatCurrency(amountDue)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Payment Amount</span>
              <span className="font-mono font-semibold">
                -{formatCurrency(paymentAmount)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Remaining Balance</span>
              <span
                className={cn(
                  "font-mono text-lg",
                  remainingAfter > 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {formatCurrency(remainingAfter)}
              </span>
            </div>
          </div>

          {willBePaid && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                This payment will mark the invoice as PAID
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="font-medium">Send payment receipt</p>
          <p className="text-sm text-muted-foreground">
            Email a receipt to the customer
          </p>
        </div>
        <Switch checked={config.sendReceipt} onCheckedChange={() => {}} />
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onRecord(false)}
          disabled={isRecording}
        >
          Record Only
        </Button>
        <Button
          className="flex-1"
          onClick={() => onRecord(true)}
          disabled={isRecording}
        >
          {isRecording ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Record & Send Receipt
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

interface InvoiceToPaymentFlowProps {
  invoiceId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded?: (paymentId: number) => void;
}

export function InvoiceToPaymentFlow({
  invoiceId,
  open,
  onOpenChange,
  onPaymentRecorded,
}: InvoiceToPaymentFlowProps): ReactElement {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<PaymentConfig>({
    amount: "0",
    paymentMethod: "CHECK",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    reference: "",
    notes: "",
    sendReceipt: false,
  });

  // Work Surface hooks
  const { setSaving, setSaved, setError } = useSaveState();

  // Data queries
  const { data: invoiceData, isLoading } =
    trpc.accounting.invoices.getById.useQuery(
      { id: invoiceId },
      { enabled: open && !!invoiceId }
    );
  const { data: clientData } = trpc.clients.getById.useQuery(
    { clientId: invoiceData?.customerId ?? 0 },
    { enabled: open && !!invoiceData?.customerId }
  );
  const { data: paymentsData } = trpc.accounting.payments.list.useQuery(
    { invoiceId },
    { enabled: open && !!invoiceId }
  );

  const invoice = useMemo<Invoice | null>(() => {
    if (!invoiceData) return null;
    return {
      id: invoiceData.id,
      invoiceNumber: invoiceData.invoiceNumber,
      customerId: invoiceData.customerId,
      customerName: clientData?.name || "Unknown",
      invoiceDate:
        invoiceData.invoiceDate instanceof Date
          ? invoiceData.invoiceDate.toISOString()
          : String(invoiceData.invoiceDate),
      dueDate:
        invoiceData.dueDate instanceof Date
          ? invoiceData.dueDate.toISOString()
          : String(invoiceData.dueDate),
      totalAmount: invoiceData.totalAmount,
      amountPaid: invoiceData.amountPaid,
      amountDue: invoiceData.amountDue,
      status: invoiceData.status,
    };
  }, [invoiceData, clientData]);

  const paymentHistory = useMemo<PaymentHistoryItem[]>(() => {
    const payments = paymentsData?.items ?? [];
    return payments.map(toPaymentHistoryItem);
  }, [paymentsData]);
  const amountDue = useMemo(
    () => parseFloat(invoice?.amountDue || "0"),
    [invoice]
  );

  // Set initial amount when invoice loads
  useEffect(() => {
    if (!invoice || !open) return;
    const nextAmount = amountDue.toFixed(2);
    setConfig(prev =>
      prev.amount === nextAmount ? prev : { ...prev, amount: nextAmount }
    );
  }, [invoice, open, amountDue]);

  // Update config helper
  const updateConfig: PaymentConfigUpdate = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Record payment mutation
  const recordPaymentMutation = trpc.accounting.payments.create.useMutation({
    onMutate: () => setSaving("Recording payment..."),
    onSuccess: data => {
      setSaved();
      toast.success("Payment recorded successfully!");
      onPaymentRecorded?.(data);
      onOpenChange(false);
      setCurrentStep(1);
    },
    onError: err => {
      setError(err.message);
      toast.error(err.message || "Failed to record payment");
    },
  });

  const handleRecord = useCallback(
    (sendReceipt: boolean) => {
      if (!invoice) return;

      const paymentAmount = parseFloat(config.amount) || 0;
      if (paymentAmount <= 0) {
        toast.error("Please enter a valid payment amount");
        return;
      }
      if (paymentAmount > amountDue) {
        toast.error("Payment amount cannot exceed amount due");
        return;
      }

      recordPaymentMutation.mutate({
        invoiceId: invoice.id,
        amount: paymentAmount.toString(),
        paymentMethod: config.paymentMethod as
          | "CASH"
          | "CHECK"
          | "WIRE"
          | "ACH"
          | "CREDIT_CARD"
          | "DEBIT_CARD"
          | "OTHER",
        paymentDate: new Date(config.paymentDate),
        reference: config.reference || undefined,
        notes: config.notes || undefined,
        sendReceipt,
      } as unknown as Parameters<typeof recordPaymentMutation.mutate>[0]);
    },
    [invoice, config, amountDue, recordPaymentMutation]
  );

  // Validation
  const canProceed =
    currentStep === 1 ||
    (currentStep === 2 &&
      parseFloat(config.amount) > 0 &&
      config.paymentMethod);

  // Keyboard shortcuts
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    customHandlers: {
      arrowright: e => {
        e.preventDefault();
        if (canProceed && currentStep < FLOW_STEPS.length) {
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
        className="max-w-lg max-h-[85vh] overflow-hidden"
        {...keyboardProps}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for this invoice
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
              <ReviewInvoiceStep
                invoice={invoice}
                paymentHistory={paymentHistory}
                isLoading={isLoading}
              />
            )}
            {currentStep === 2 && (
              <PaymentDetailsStep
                config={config}
                amountDue={amountDue}
                onUpdate={updateConfig}
              />
            )}
            {currentStep === 3 && invoice && (
              <ConfirmStep
                invoice={invoice}
                config={config}
                onRecord={handleRecord}
                isRecording={recordPaymentMutation.isPending}
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
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InvoiceToPaymentFlow;
