/**
 * Empty State Component
 * UX-010: Add Empty States to All Widgets/Lists
 * 
 * A reusable component for displaying empty states with optional icon, 
 * title, description, and call-to-action button.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<PackageIcon className="h-12 w-12" />}
 *   title="No orders yet"
 *   description="Create your first order to get started"
 *   action={{
 *     label: "Create Order",
 *     onClick: () => navigate("/orders/create")
 *   }}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  PackageIcon, 
  UsersIcon, 
  ShoppingCartIcon, 
  CalendarIcon,
  FileTextIcon,
  BarChart3Icon,
  InboxIcon,
  SearchIcon,
  FolderIcon,
  AlertCircleIcon
} from "lucide-react";

export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Button variant */
  variant?: "default" | "outline" | "secondary";
}

export interface EmptyStateProps {
  /** Icon to display (optional - will use default based on variant) */
  icon?: React.ReactNode;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Call-to-action button */
  action?: EmptyStateAction;
  /** Secondary action */
  secondaryAction?: EmptyStateAction;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Preset variant for common empty states */
  variant?: "orders" | "clients" | "inventory" | "calendar" | "invoices" | "analytics" | "inbox" | "search" | "generic";
}

// Default icons for each variant
const variantIcons: Record<string, React.ReactNode> = {
  orders: <ShoppingCartIcon className="h-12 w-12 text-muted-foreground/50" />,
  clients: <UsersIcon className="h-12 w-12 text-muted-foreground/50" />,
  inventory: <PackageIcon className="h-12 w-12 text-muted-foreground/50" />,
  calendar: <CalendarIcon className="h-12 w-12 text-muted-foreground/50" />,
  invoices: <FileTextIcon className="h-12 w-12 text-muted-foreground/50" />,
  analytics: <BarChart3Icon className="h-12 w-12 text-muted-foreground/50" />,
  inbox: <InboxIcon className="h-12 w-12 text-muted-foreground/50" />,
  search: <SearchIcon className="h-12 w-12 text-muted-foreground/50" />,
  generic: <FolderIcon className="h-12 w-12 text-muted-foreground/50" />,
};

// Size classes
const sizeClasses = {
  sm: {
    container: "py-6 px-4",
    icon: "h-8 w-8",
    title: "text-sm font-medium",
    description: "text-xs",
    button: "h-8 text-xs",
  },
  md: {
    container: "py-8 px-6",
    icon: "h-12 w-12",
    title: "text-base font-medium",
    description: "text-sm",
    button: "h-9 text-sm",
  },
  lg: {
    container: "py-12 px-8",
    icon: "h-16 w-16",
    title: "text-lg font-semibold",
    description: "text-base",
    button: "h-10 text-base",
  },
};

export const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
  variant = "generic",
}: EmptyStateProps) {
  const sizes = sizeClasses[size];
  const displayIcon = icon || variantIcons[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes.container,
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      {displayIcon && (
        <div className="mb-4" aria-hidden="true">
          {displayIcon}
        </div>
      )}

      {/* Title */}
      <h3 className={cn(sizes.title, "text-muted-foreground mb-1")}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn(sizes.description, "text-muted-foreground/70 max-w-sm mb-4")}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          {action && (
            <Button
              variant={action.variant || "default"}
              className={sizes.button}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || "outline"}
              className={sizes.button}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Preset empty states for common use cases
 */
export const EmptyStatePresets = {
  NoOrders: (props: { onCreateOrder?: () => void }) => (
    <EmptyState
      variant="orders"
      title="No orders yet"
      description="Create your first order to start tracking sales"
      action={props.onCreateOrder ? {
        label: "Create Order",
        onClick: props.onCreateOrder,
      } : undefined}
    />
  ),

  NoClients: (props: { onAddClient?: () => void }) => (
    <EmptyState
      variant="clients"
      title="No clients found"
      description="Add your first client to start building relationships"
      action={props.onAddClient ? {
        label: "Add Client",
        onClick: props.onAddClient,
      } : undefined}
    />
  ),

  NoInventory: (props: { onAddBatch?: () => void }) => (
    <EmptyState
      variant="inventory"
      title="No inventory"
      description="Add your first batch to start tracking inventory"
      action={props.onAddBatch ? {
        label: "Add Batch",
        onClick: props.onAddBatch,
      } : undefined}
    />
  ),

  NoEvents: (props: { onCreateEvent?: () => void }) => (
    <EmptyState
      variant="calendar"
      title="No events scheduled"
      description="Create an event to start organizing your calendar"
      action={props.onCreateEvent ? {
        label: "Create Event",
        onClick: props.onCreateEvent,
      } : undefined}
    />
  ),

  NoInvoices: (props: { onCreateInvoice?: () => void }) => (
    <EmptyState
      variant="invoices"
      title="No invoices"
      description="Invoices will appear here when orders are finalized"
      action={props.onCreateInvoice ? {
        label: "Create Invoice",
        onClick: props.onCreateInvoice,
      } : undefined}
    />
  ),

  NoData: () => (
    <EmptyState
      variant="analytics"
      title="No data available"
      description="Data will appear here once you start using the system"
    />
  ),

  NoResults: (props: { onClearFilters?: () => void }) => (
    <EmptyState
      variant="search"
      title="No results found"
      description="Try adjusting your search or filters"
      action={props.onClearFilters ? {
        label: "Clear Filters",
        onClick: props.onClearFilters,
      } : undefined}
    />
  ),

  NoInboxItems: () => (
    <EmptyState
      variant="inbox"
      title="Inbox is empty"
      description="You're all caught up! New notifications will appear here."
      size="sm"
    />
  ),

  Error: (props: { onRetry?: () => void; message?: string }) => (
    <EmptyState
      icon={<AlertCircleIcon className="h-12 w-12 text-destructive/50" />}
      title="Something went wrong"
      description={props.message || "An error occurred while loading data"}
      action={props.onRetry ? {
        label: "Try Again",
        onClick: props.onRetry,
      } : undefined}
    />
  ),
};

export default EmptyState;
