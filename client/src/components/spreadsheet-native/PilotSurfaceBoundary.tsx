import React, { Component, Suspense } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface PilotSurfaceBoundaryProps {
  /** The lazy-loaded pilot surface */
  children: ReactNode;
  /** Fallback to render while loading or on error */
  fallback: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error) => void;
}

interface PilotSurfaceBoundaryState {
  hasError: boolean;
}

/**
 * Combined Suspense + ErrorBoundary for sheet-native pilot surfaces.
 *
 * - While loading: shows a minimal loading state
 * - On error: falls back to the classic surface (passed as `fallback`)
 * - Logs errors to console for monitoring
 *
 * Usage:
 * ```tsx
 * <PilotSurfaceBoundary fallback={<ClassicSurface />}>
 *   <LazyPilotSurface />
 * </PilotSurfaceBoundary>
 * ```
 */
export class PilotSurfaceBoundary extends Component<
  PilotSurfaceBoundaryProps,
  PilotSurfaceBoundaryState
> {
  constructor(props: PilotSurfaceBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PilotSurfaceBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      "[PilotSurfaceBoundary] Sheet-native surface crashed, falling back to classic:",
      error,
      errorInfo.componentStack
    );
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            Loading sheet-native surface...
          </div>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}

export default PilotSurfaceBoundary;
