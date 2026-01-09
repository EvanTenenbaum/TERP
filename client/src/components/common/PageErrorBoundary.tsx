import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

// SECURITY: Map of safe, user-friendly error messages
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  'NetworkError': 'Unable to connect. Please check your internet connection.',
  'ChunkLoadError': 'Failed to load page resources. Please refresh.',
  'TypeError': 'An unexpected error occurred. Please try again.',
  'ReferenceError': 'An unexpected error occurred. Please try again.',
  'SyntaxError': 'An unexpected error occurred. Please try again.',
};

// SECURITY: Get a safe, sanitized error message for display
function getSafeErrorMessage(error: Error | null): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Check for known safe error types
  for (const [errorType, message] of Object.entries(SAFE_ERROR_MESSAGES)) {
    if (error.name === errorType || error.message.includes(errorType)) {
      return message;
    }
  }

  // SECURITY: Never expose raw error messages to users
  // They may contain sensitive information like file paths, SQL queries, etc.
  return 'An unexpected error occurred. Please try again.';
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // SECURITY: Only log to console in development mode
    if (import.meta.env.DEV) {
      console.error('Page error:', error, errorInfo);
    }

    // Report to Sentry and capture event ID for support reference
    const eventId = Sentry.captureException(error, {
      tags: { page: this.props.pageName || 'unknown' },
      extra: { componentStack: errorInfo.componentStack },
    });

    this.setState({ eventId });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          {/* SECURITY: Display sanitized error message, never raw error.message */}
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {getSafeErrorMessage(this.state.error)}
          </p>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          {/* SECURITY: Show error ID for support without exposing details */}
          {this.state.eventId && (
            <p className="text-xs text-muted-foreground mt-4">
              If the problem persists, contact support with reference: {this.state.eventId.slice(0, 8)}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
