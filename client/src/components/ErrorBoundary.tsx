import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";
import * as Sentry from "@sentry/react";

// Helper to check if Sentry is available and initialized
function isSentryAvailable(): boolean {
  try {
    return typeof Sentry?.captureException === 'function';
  } catch {
    return false;
  }
}

interface Props {
  children: ReactNode;
  /** Variant: 'full' for page-level, 'compact' for component-level */
  variant?: "full" | "compact";
  /** Custom fallback UI (overrides default) */
  fallback?: ReactNode;
  /** Component name for better error context */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry with component context
    // CRITICAL: Check Sentry availability first to prevent crashes
    if (isSentryAvailable()) {
      try {
        Sentry.withScope((scope) => {
          scope.setContext("errorInfo", {
            componentStack: errorInfo.componentStack,
            componentName: this.props.name,
          });
          if (this.props.name) {
            scope.setTag("component", this.props.name);
          }
          const eventId = Sentry.captureException(error);
          this.setState({ eventId });
        });
      } catch (sentryError) {
        // Sentry failed - log but don't block
        console.warn("Failed to report error to Sentry:", sentryError);
      }
    }

    // Also log to console in development
    if (import.meta.env.MODE === "development") {
      console.error(
        `Error caught by ErrorBoundary${this.props.name ? ` (${this.props.name})` : ""}:`,
        error,
        errorInfo
      );
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Compact variant for component-level error boundaries
      if (this.props.variant === "compact") {
        return (
          <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-destructive/20 bg-destructive/5 text-center min-h-[100px]">
            <AlertTriangle size={24} className="text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              {this.props.name
                ? `Failed to load ${this.props.name}`
                : "Something went wrong"}
            </p>
            <button
              onClick={this.handleReset}
              className={cn(
                "flex items-center gap-1 px-3 py-1 text-sm rounded",
                "bg-secondary text-secondary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={12} />
              Retry
            </button>
          </div>
        );
      }

      // Full-page variant (default)
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            {import.meta.env.MODE === "development" && this.state.error && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
                <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}

            {import.meta.env.MODE === "production" && (
              <p className="text-muted-foreground mb-6 text-center">
                This error has been automatically reported to our team.
                {this.state.eventId && (
                  <span className="block mt-2 text-xs">
                    Error ID: {this.state.eventId}
                  </span>
                )}
              </p>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Convenience component for wrapping individual widgets/components
 * with a compact error boundary that shows a small error message
 * instead of taking over the entire page.
 *
 * @example
 * <ComponentErrorBoundary name="Sales Chart">
 *   <SalesChart />
 * </ComponentErrorBoundary>
 */
export function ComponentErrorBoundary({
  children,
  name,
  fallback,
}: {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary variant="compact" name={name} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
