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
