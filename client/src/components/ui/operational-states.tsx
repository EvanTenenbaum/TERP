import * as React from "react";
import { AlertCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  type EmptyStateAction,
  type EmptyStateProps,
} from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type EmptyVariant = NonNullable<EmptyStateProps["variant"]>;

/**
 * Shared outer card chrome for every non-ok state rendered by
 * {@link OperationalStateSurface}. Keeping the border-radius, min-height, and
 * padding identical across loading / empty / error variants guarantees that
 * swapping states does not cause any layout reflow in the parent layout.
 *
 * Consumers that only need a single variant can use {@link OperationalSkeletonState},
 * {@link OperationalErrorState}, or {@link OperationalEmptyState} directly.
 */
const OPERATIONAL_SURFACE_CHROME =
  "flex min-h-[18rem] w-full flex-col rounded-xl border border-border/70 bg-muted/20 px-6 py-6";

interface OperationalEmptyStateProps {
  title: string;
  description: string;
  variant?: EmptyVariant;
  searchActive?: boolean;
  filterActive?: boolean;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  "data-testid"?: string;
}

export function OperationalEmptyState({
  title,
  description,
  variant = "generic",
  searchActive = false,
  filterActive = false,
  action,
  secondaryAction,
  className,
  "data-testid": dataTestId,
}: OperationalEmptyStateProps) {
  const shouldShowContextBadge = searchActive || filterActive;

  return (
    <div
      className={cn(
        "flex min-h-[18rem] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4",
        className
      )}
      data-testid={dataTestId}
    >
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        {shouldShowContextBadge ? (
          <Badge variant="outline" className="bg-background">
            {searchActive && filterActive
              ? "Filtered results"
              : searchActive
                ? "Search results"
                : "Filtered queue"}
          </Badge>
        ) : null}
        <EmptyState
          variant={variant}
          title={title}
          description={description}
          action={action}
          secondaryAction={secondaryAction}
          size="md"
          className="py-0"
        />
      </div>
    </div>
  );
}

interface OperationalSkeletonStateProps {
  /** Number of skeleton rows to render (default: 5) */
  rows?: number;
  /**
   * Accessible label announced to assistive tech while the skeleton is
   * visible. Defaults to "Loading".
   */
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Loading variant used by {@link OperationalStateSurface}. Exported so callers
 * that manage their own state machine can render just the skeleton while
 * preserving the shared surface chrome.
 */
export function OperationalSkeletonState({
  rows = 5,
  ariaLabel = "Loading",
  className,
  "data-testid": dataTestId,
}: OperationalSkeletonStateProps) {
  const rowCount = Math.max(1, Math.floor(rows));
  return (
    <div
      className={cn(OPERATIONAL_SURFACE_CHROME, className)}
      data-testid={dataTestId}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <Skeleton className="mb-4 h-6 w-1/3 rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: rowCount }).map((_, index) => (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key
            key={`operational-skeleton-row-${index}`}
            className="h-8 w-full rounded-md"
            data-testid="operational-skeleton-row"
          />
        ))}
      </div>
    </div>
  );
}

interface OperationalErrorStateProps {
  /** Title shown in the error card. */
  title?: string;
  /** Optional supporting copy below the title. */
  description?: string;
  /**
   * Called when the user clicks the retry button. When omitted, the retry
   * button is not rendered.
   */
  onRetry?: () => void;
  /** Customise the retry button label. */
  retryLabel?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Error variant used by {@link OperationalStateSurface}. Exported so callers
 * can render the error chrome independently (for example inside a tab panel
 * that already manages its own loading/empty state).
 */
export function OperationalErrorState({
  title = "Unable to load data",
  description = "An error occurred while loading this view. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
  "data-testid": dataTestId,
}: OperationalErrorStateProps) {
  return (
    <div
      className={cn(
        OPERATIONAL_SURFACE_CHROME,
        "items-center justify-center",
        className
      )}
      data-testid={dataTestId}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <AlertCircleIcon
          className="h-12 w-12 text-destructive/70"
          aria-hidden="true"
        />
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onRetry}
            data-testid="operational-error-retry"
          >
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface OperationalSurfaceEmptyConfig {
  title: string;
  description?: string;
  variant?: EmptyVariant;
  icon?: React.ReactNode;
  searchActive?: boolean;
  filterActive?: boolean;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

interface OperationalSurfaceErrorConfig {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export type OperationalSurfaceState = "loading" | "empty" | "error" | "ok";

interface OperationalStateSurfaceProps {
  /** Current rendering state of the surface. */
  state: OperationalSurfaceState;
  /** Children only render when {@link state} is "ok". */
  children?: React.ReactNode;
  /** Number of rows for the loading skeleton (default: 5). */
  skeletonRows?: number;
  /** Configuration for the empty state. Required when state === "empty". */
  empty?: OperationalSurfaceEmptyConfig;
  /** Configuration for the error state. */
  error?: OperationalSurfaceErrorConfig;
  /** Accessible label for the loading skeleton. */
  loadingLabel?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Unified 3-state wrapper for data-bearing surfaces. All non-ok states share
 * identical outer card chrome (border radius, min height, padding) so swapping
 * between loading, empty, and error variants does not cause layout reflow.
 *
 * @example
 * ```tsx
 * <OperationalStateSurface
 *   state={
 *     query.isLoading
 *       ? "loading"
 *       : query.error
 *         ? "error"
 *         : data?.length
 *           ? "ok"
 *           : "empty"
 *   }
 *   skeletonRows={6}
 *   empty={{
 *     title: "No invoices yet",
 *     description: "Invoices will appear here once orders are finalized.",
 *     variant: "invoices",
 *     action: { label: "Create invoice", onClick: () => {} },
 *   }}
 *   error={{ onRetry: () => query.refetch() }}
 * >
 *   <InvoiceTable rows={data} />
 * </OperationalStateSurface>
 * ```
 */
export function OperationalStateSurface({
  state,
  children,
  skeletonRows = 5,
  empty,
  error,
  loadingLabel,
  className,
  "data-testid": dataTestId,
}: OperationalStateSurfaceProps) {
  if (state === "loading") {
    return (
      <OperationalSkeletonState
        rows={skeletonRows}
        ariaLabel={loadingLabel}
        className={className}
        data-testid={dataTestId}
      />
    );
  }

  if (state === "error") {
    return (
      <OperationalErrorState
        title={error?.title}
        description={error?.description}
        onRetry={error?.onRetry}
        retryLabel={error?.retryLabel}
        className={className}
        data-testid={dataTestId}
      />
    );
  }

  if (state === "empty") {
    const shouldShowContextBadge =
      Boolean(empty?.searchActive) || Boolean(empty?.filterActive);
    return (
      <div
        className={cn(
          OPERATIONAL_SURFACE_CHROME,
          "items-center justify-center",
          className
        )}
        data-testid={dataTestId}
        role="status"
        aria-live="polite"
      >
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          {shouldShowContextBadge ? (
            <Badge variant="outline" className="bg-background">
              {empty?.searchActive && empty?.filterActive
                ? "Filtered results"
                : empty?.searchActive
                  ? "Search results"
                  : "Filtered queue"}
            </Badge>
          ) : null}
          <EmptyState
            variant={empty?.variant ?? "generic"}
            icon={empty?.icon}
            title={empty?.title ?? "Nothing to show yet"}
            description={empty?.description}
            action={empty?.action}
            secondaryAction={empty?.secondaryAction}
            size="md"
            className="py-0"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface WorkspacePanelSkeletonProps {
  eyebrow?: string;
  title?: string;
  metaCount?: number;
  rows?: number;
  className?: string;
  "data-testid"?: string;
}

export function WorkspacePanelSkeleton({
  eyebrow = "Loading workspace",
  title = "Preparing operational view",
  metaCount = 3,
  rows = 5,
  className,
  "data-testid": dataTestId,
}: WorkspacePanelSkeletonProps) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border/70 bg-card/80 p-4",
        className
      )}
      data-testid={dataTestId}
      role="status"
      aria-live="polite"
      aria-label={eyebrow}
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-7 w-64 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: metaCount }).map((_, index) => (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key
            key={`workspace-meta-${index}`}
            className="h-8 w-40 rounded-full"
          />
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>

      <div className="rounded-xl border border-border/60">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="space-y-3 p-4" data-testid="workspace-panel-skeleton-table">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`workspace-row-${rowIndex}`}
              className="grid gap-3 md:grid-cols-6"
              data-testid="workspace-panel-skeleton-row"
            >
              <Skeleton className="h-4 rounded md:col-span-2" />
              <Skeleton className="h-4 rounded" />
              <Skeleton className="h-4 rounded" />
              <Skeleton className="h-4 rounded" />
              <Skeleton className="h-4 rounded" />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{title}</p>
    </div>
  );
}

interface WorkspaceCommandStripLinkProps {
  label: string;
  onClick: () => void;
  active?: boolean;
}

export function WorkspaceCommandStripLink({
  label,
  onClick,
  active = false,
}: WorkspaceCommandStripLinkProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className="h-8 px-2.5 text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
