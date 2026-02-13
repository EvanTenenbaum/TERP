/**
 * WorkflowStatusTracker Component
 * TER-212: Canonical state machine visualization for Quote and Sale workflows
 *
 * Quote lifecycle:  Draft → Sent → Accepted → Converted (to Sale)
 * Sale lifecycle:   Pending → Partial/Paid (payment) + Pending → Packed → Shipped (fulfillment)
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Package,
  Truck,
  Ban,
  DollarSign,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";
type SaleStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
type FulfillmentStatus = "PENDING" | "PACKED" | "SHIPPED" | "CANCELLED";

/** TER-212: Canonical state transition map — mirrors server/ordersDb.ts */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
  SENT: ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
  VIEWED: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

export const SALE_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  PENDING: ["PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
  PARTIAL: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PARTIAL", "PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export const FULFILLMENT_TRANSITIONS: Record<
  FulfillmentStatus,
  FulfillmentStatus[]
> = {
  PENDING: ["PACKED", "SHIPPED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: [],
  CANCELLED: [],
};

// ============================================================================
// STEP CONFIGS
// ============================================================================

interface StepConfig {
  key: string;
  label: string;
  icon: ReactNode;
}

const QUOTE_STEPS: StepConfig[] = [
  { key: "DRAFT", label: "Draft", icon: <FileText className="h-4 w-4" /> },
  { key: "SENT", label: "Sent", icon: <Send className="h-4 w-4" /> },
  {
    key: "VIEWED",
    label: "Viewed",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    key: "ACCEPTED",
    label: "Accepted",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  { key: "CONVERTED", label: "Sale", icon: <ArrowRight className="h-4 w-4" /> },
];

const QUOTE_TERMINAL_STEPS: Record<string, StepConfig> = {
  REJECTED: {
    key: "REJECTED",
    label: "Rejected",
    icon: <XCircle className="h-4 w-4" />,
  },
  EXPIRED: {
    key: "EXPIRED",
    label: "Expired",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

const FULFILLMENT_STEPS: StepConfig[] = [
  { key: "PENDING", label: "Pending", icon: <Clock className="h-4 w-4" /> },
  { key: "PACKED", label: "Packed", icon: <Package className="h-4 w-4" /> },
  { key: "SHIPPED", label: "Shipped", icon: <Truck className="h-4 w-4" /> },
];

const SALE_PAYMENT_STEPS: StepConfig[] = [
  { key: "PENDING", label: "Unpaid", icon: <Clock className="h-4 w-4" /> },
  {
    key: "PARTIAL",
    label: "Partial",
    icon: <DollarSign className="h-4 w-4" />,
  },
  { key: "PAID", label: "Paid", icon: <CheckCircle2 className="h-4 w-4" /> },
];

// ============================================================================
// STEP COMPONENT
// ============================================================================

function WorkflowStep({
  step,
  state,
  isLast,
}: {
  step: StepConfig;
  state: "completed" | "current" | "upcoming" | "terminal";
  isLast: boolean;
}) {
  return (
    <div className="flex items-center">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
          state === "completed" && "bg-green-100 text-green-700",
          state === "current" &&
            "bg-primary/15 text-primary ring-1 ring-primary/30",
          state === "upcoming" && "bg-muted text-muted-foreground",
          state === "terminal" && "bg-red-100 text-red-700"
        )}
      >
        {step.icon}
        {step.label}
      </div>
      {!isLast && (
        <div
          className={cn(
            "w-4 h-px mx-0.5",
            state === "completed" ? "bg-green-400" : "bg-border"
          )}
        />
      )}
    </div>
  );
}

// ============================================================================
// QUOTE TRACKER
// ============================================================================

interface QuoteTrackerProps {
  status: string;
  className?: string;
}

export function QuoteWorkflowTracker({ status, className }: QuoteTrackerProps) {
  const isTerminal = status === "REJECTED" || status === "EXPIRED";

  if (isTerminal) {
    const terminalStep = QUOTE_TERMINAL_STEPS[status];
    // Show the happy path steps up to where it diverged, then the terminal step
    const completedUpTo =
      status === "REJECTED" || status === "EXPIRED" ? "SENT" : "DRAFT";
    const happyIndex = QUOTE_STEPS.findIndex(s => s.key === completedUpTo);

    return (
      <div className={cn("flex items-center flex-wrap gap-y-1", className)}>
        {QUOTE_STEPS.slice(0, happyIndex + 1).map(step => (
          <WorkflowStep
            key={step.key}
            step={step}
            state="completed"
            isLast={false}
          />
        ))}
        {terminalStep && (
          <WorkflowStep
            key={terminalStep.key}
            step={terminalStep}
            state="terminal"
            isLast
          />
        )}
      </div>
    );
  }

  const currentIndex = QUOTE_STEPS.findIndex(s => s.key === status);

  // Fallback for unrecognized statuses — show raw status text instead of silent misrender
  if (currentIndex === -1) {
    return (
      <div className={cn("flex items-center flex-wrap gap-y-1", className)}>
        <WorkflowStep
          step={{
            key: status,
            label: status,
            icon: <AlertTriangle className="h-4 w-4" />,
          }}
          state="current"
          isLast
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center flex-wrap gap-y-1", className)}>
      {QUOTE_STEPS.map((step, i) => (
        <WorkflowStep
          key={step.key}
          step={step}
          state={
            i < currentIndex
              ? "completed"
              : i === currentIndex
                ? "current"
                : "upcoming"
          }
          isLast={i === QUOTE_STEPS.length - 1}
        />
      ))}
    </div>
  );
}

// ============================================================================
// SALE TRACKER (DUAL-LANE: FULFILLMENT + PAYMENT)
// ============================================================================

interface SaleTrackerProps {
  saleStatus: string;
  fulfillmentStatus: string;
  className?: string;
}

export function SaleWorkflowTracker({
  saleStatus,
  fulfillmentStatus,
  className,
}: SaleTrackerProps) {
  const isCancelled =
    saleStatus === "CANCELLED" || fulfillmentStatus === "CANCELLED";

  if (isCancelled) {
    return (
      <div className={cn("space-y-2", className)}>
        <WorkflowStep
          step={{
            key: "CANCELLED",
            label: "Cancelled",
            icon: <Ban className="h-4 w-4" />,
          }}
          state="terminal"
          isLast
        />
      </div>
    );
  }

  const fulfillmentIndex = FULFILLMENT_STEPS.findIndex(
    s => s.key === fulfillmentStatus
  );
  const paymentIndex = SALE_PAYMENT_STEPS.findIndex(
    s =>
      s.key === saleStatus || (saleStatus === "OVERDUE" && s.key === "PENDING")
  );

  // Fallback for unrecognized statuses — show raw text instead of silent misrender
  if (fulfillmentIndex === -1 && paymentIndex === -1) {
    return (
      <div className={cn("space-y-2", className)}>
        <WorkflowStep
          step={{
            key: fulfillmentStatus,
            label: `${fulfillmentStatus} / ${saleStatus}`,
            icon: <AlertTriangle className="h-4 w-4" />,
          }}
          state="current"
          isLast
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Fulfillment lane */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Fulfillment
        </span>
        <div className="flex items-center">
          {FULFILLMENT_STEPS.map((step, i) => (
            <WorkflowStep
              key={step.key}
              step={step}
              state={
                i < fulfillmentIndex
                  ? "completed"
                  : i === fulfillmentIndex
                    ? "current"
                    : "upcoming"
              }
              isLast={i === FULFILLMENT_STEPS.length - 1}
            />
          ))}
        </div>
      </div>
      {/* Payment lane */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Payment
        </span>
        <div className="flex items-center">
          {SALE_PAYMENT_STEPS.map((step, i) => {
            let state: "completed" | "current" | "upcoming" | "terminal" =
              "upcoming";
            if (saleStatus === "OVERDUE" && step.key === "PENDING") {
              state = "terminal";
            } else if (i < paymentIndex) {
              state = "completed";
            } else if (i === paymentIndex) {
              state = "current";
            }
            return (
              <WorkflowStep
                key={step.key}
                step={step}
                state={state}
                isLast={i === SALE_PAYMENT_STEPS.length - 1}
              />
            );
          })}
          {saleStatus === "OVERDUE" && (
            <WorkflowStep
              step={{
                key: "OVERDUE",
                label: "Overdue",
                icon: <AlertTriangle className="h-4 w-4" />,
              }}
              state="terminal"
              isLast
            />
          )}
        </div>
      </div>
    </div>
  );
}
