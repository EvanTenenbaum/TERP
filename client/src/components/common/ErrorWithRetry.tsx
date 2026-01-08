import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorWithRetry({ error, onRetry, isRetrying }: Props) {
  return (
    <div className="p-8 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
      <h3 className="mt-4 font-semibold">Failed to load data</h3>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <Button onClick={onRetry} disabled={isRetrying} className="mt-4">
        {isRetrying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </>
        )}
      </Button>
    </div>
  );
}
