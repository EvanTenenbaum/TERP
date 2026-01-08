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
  AlertCircleIcon,
  BellIcon,
  CameraIcon,
  CheckSquareIcon,
  FileSpreadsheetIcon,
  FlaskConicalIcon,
} from "lucide-react";

export interface EmptyStateAction {
  /** Button label */
  label: string | React.ReactNode;
  /** Click handler - can return anything (common for window.open, refetch, etc.) */
  onClick: () => unknown;
  /** Button variant */
  variant?: "default" | "outline" | "secondary";
  /** Disabled state */
  disabled?: boolean;
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
  variant?:
    | "orders"
    | "clients"
    | "inventory"
    | "calendar"
    | "invoices"
    | "analytics"
    | "inbox"
    | "search"
    | "generic"
    | "notifications"
    | "photography"
    | "todos"
    | "spreadsheet"
    | "samples"
    | "reports";
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
  notifications: <BellIcon className="h-12 w-12 text-muted-foreground/50" />,
  photography: <CameraIcon className="h-12 w-12 text-muted-foreground/50" />,
  todos: <CheckSquareIcon className="h-12 w-12 text-muted-foreground/50" />,
  spreadsheet: (
    <FileSpreadsheetIcon className="h-12 w-12 text-muted-foreground/50" />
  ),
  samples: <FlaskConicalIcon className="h-12 w-12 text-muted-foreground/50" />,
  reports: <FileTextIcon className="h-12 w-12 text-muted-foreground/50" />,
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
      <h3 className={cn(sizes.title, "text-muted-foreground mb-1")}>{title}</h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            sizes.description,
            "text-muted-foreground/70 max-w-sm mb-4"
          )}
        >
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
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || "outline"}
              className={sizes.button}
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
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
      action={
        props.onCreateOrder
          ? {
              label: "Create Order",
              onClick: props.onCreateOrder,
            }
          : undefined
      }
    />
  ),

  NoClients: (props: { onAddClient?: () => void }) => (
    <EmptyState
      variant="clients"
      title="No clients found"
      description="Add your first client to start building relationships"
      action={
        props.onAddClient
          ? {
              label: "Add Client",
              onClick: props.onAddClient,
            }
          : undefined
      }
    />
  ),

  NoInventory: (props: { onAddBatch?: () => void }) => (
    <EmptyState
      variant="inventory"
      title="No inventory"
      description="Add your first batch to start tracking inventory"
      action={
        props.onAddBatch
          ? {
              label: "Add Batch",
              onClick: props.onAddBatch,
            }
          : undefined
      }
    />
  ),

  NoEvents: (props: { onCreateEvent?: () => void }) => (
    <EmptyState
      variant="calendar"
      title="No events scheduled"
      description="Create an event to start organizing your calendar"
      action={
        props.onCreateEvent
          ? {
              label: "Create Event",
              onClick: props.onCreateEvent,
            }
          : undefined
      }
    />
  ),

  NoInvoices: (props: { onCreateInvoice?: () => void }) => (
    <EmptyState
      variant="invoices"
      title="No invoices"
      description="Invoices will appear here when orders are finalized"
      action={
        props.onCreateInvoice
          ? {
              label: "Create Invoice",
              onClick: props.onCreateInvoice,
            }
          : undefined
      }
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
      action={
        props.onClearFilters
          ? {
              label: "Clear Filters",
              onClick: props.onClearFilters,
            }
          : undefined
      }
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
      action={
        props.onRetry
          ? {
              label: "Try Again",
              onClick: props.onRetry,
            }
          : undefined
      }
    />
  ),

  NoNotifications: () => (
    <EmptyState
      variant="notifications"
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    />
  ),

  NoPhotos: () => (
    <EmptyState
      variant="photography"
      title="No photos to review"
      description="There are no batches awaiting photography. Photos will appear here when batches need imaging."
    />
  ),

  NoTodos: (props: { onCreateTodo?: () => void }) => (
    <EmptyState
      variant="todos"
      title="No tasks"
      description="You have no tasks assigned. Tasks will appear here when created or assigned to you."
      action={
        props.onCreateTodo
          ? {
              label: "Create Task",
              onClick: props.onCreateTodo,
            }
          : undefined
      }
    />
  ),

  NoSpreadsheetData: () => (
    <EmptyState
      variant="spreadsheet"
      title="No inventory data"
      description="The spreadsheet view will populate once you have inventory batches in the system."
    />
  ),

  NoSamples: (props: { onCreateSample?: () => void }) => (
    <EmptyState
      variant="samples"
      title="No samples yet"
      description="Sample requests will appear here when clients request product samples."
      action={
        props.onCreateSample
          ? {
              label: "Create Sample Request",
              onClick: props.onCreateSample,
            }
          : undefined
      }
    />
  ),

  NoReports: () => (
    <EmptyState
      variant="reports"
      title="No reports available"
      description="Reports will be generated as you accumulate data in the system."
    />
  ),
};

/**
 * NoSearchResults - for empty search results
 */
export function NoSearchResults({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<SearchIcon className="h-12 w-12 text-muted-foreground/50" />}
      title="No results found"
      description={
        searchTerm
          ? `No items match "${searchTerm}". Try adjusting your search or filters.`
          : "Try adjusting your search or filters to find what you're looking for."
      }
      action={
        onClear ? { label: "Clear filters", onClick: onClear } : undefined
      }
    />
  );
}

/**
 * ErrorState - general error state with retry
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  showSupport = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showSupport?: boolean;
}) {
  return (
    <EmptyState
      icon={<AlertCircleIcon className="h-12 w-12 text-destructive/50" />}
      title={title}
      description={
        description ??
        "An error occurred while loading this content. Please try again."
      }
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
      secondaryAction={
        showSupport
          ? {
              label: "Contact Support",
              onClick: () => window.open("mailto:support@terp.com", "_blank"),
              variant: "outline",
            }
          : undefined
      }
    />
  );
}

/**
 * DatabaseErrorState - for known API/database failures (Wave 3 finding)
 * Use this when the error is likely a database connectivity or query issue
 */
export function DatabaseErrorState({
  entity,
  onRetry,
  errorMessage,
}: {
  entity: string;
  onRetry?: () => void;
  errorMessage?: string;
}) {
  return (
    <EmptyState
      icon={<AlertCircleIcon className="h-12 w-12 text-amber-500" />}
      title={`Unable to load ${entity}`}
      description={
        errorMessage ||
        "There was a problem connecting to the database. This may be a temporary issue. Please try again or contact support if the problem persists."
      }
      action={
        onRetry
          ? {
              label: "Try again",
              onClick: onRetry,
            }
          : undefined
      }
      secondaryAction={{
        label: "Contact Support",
        onClick: () => window.open("mailto:support@terp.com", "_blank"),
        variant: "outline",
      }}
    />
  );
}

/**
 * Helper to detect if an error is database-related
 */
export function isDatabaseError(
  error:
    | { message?: string; data?: { code?: string } | null }
    | null
    | undefined
): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || "";
  const isDbError =
    message.includes("database") ||
    message.includes("query") ||
    message.includes("relation") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    error.data?.code === "INTERNAL_SERVER_ERROR";

  return isDbError;
}

/**
 * Page-specific empty state configurations
 * Can be spread into EmptyState component: <EmptyState {...emptyStateConfigs.samples} />
 */
export const emptyStateConfigs = {
  analytics: {
    variant: "analytics" as const,
    title: "No analytics data yet",
    description:
      "Analytics will appear once you have orders and transactions in the system.",
  },
  calendar: {
    variant: "calendar" as const,
    title: "No events scheduled",
    description:
      "Your calendar is empty. Create an appointment or task to get started.",
  },
  notifications: {
    variant: "notifications" as const,
    title: "No notifications",
    description: "You're all caught up! New notifications will appear here.",
  },
  photography: {
    variant: "photography" as const,
    title: "No photos to review",
    description:
      "There are no batches awaiting photography. Photos will appear here when batches need imaging.",
  },
  reports: {
    variant: "reports" as const,
    title: "No reports available",
    description:
      "Reports will be generated as you accumulate data in the system.",
  },
  todos: {
    variant: "todos" as const,
    title: "No tasks",
    description:
      "You have no tasks assigned. Tasks will appear here when created or assigned to you.",
  },
  spreadsheet: {
    variant: "spreadsheet" as const,
    title: "No inventory data",
    description:
      "The spreadsheet view will populate once you have inventory batches in the system.",
  },
  orders: {
    variant: "orders" as const,
    title: "No orders yet",
    description: "Orders will appear here once customers start placing them.",
  },
  clients: {
    variant: "clients" as const,
    title: "No clients yet",
    description:
      "Add your first client to start managing your customer relationships.",
  },
  inventory: {
    variant: "inventory" as const,
    title: "No inventory",
    description:
      "Your inventory is empty. Create a purchase order to receive new stock.",
  },
  samples: {
    variant: "samples" as const,
    title: "No samples yet",
    description:
      "Sample requests will appear here when clients request product samples.",
  },
};

export default EmptyState;
