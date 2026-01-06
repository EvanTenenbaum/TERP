import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { initDatadog } from "./lib/datadog";
import "./index.css";

// Initialize Sentry AFTER all other imports to prevent blocking
// Sentry is already wrapped in try-catch in sentry.client.config.ts
// Only load if DSN is configured (non-blocking)
if (import.meta.env.VITE_SENTRY_DSN) {
  import("../../sentry.client.config").catch((error) => {
    console.warn("Failed to load Sentry, continuing without error tracking:", error);
  });
}

// Initialize Datadog RUM for real user monitoring
// Non-blocking - will skip if credentials not configured
initDatadog();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (auth), 403 (forbidden), 404 (not found), or 429 (rate limit)
        const status = error?.data?.httpStatus || error?.status;
        if ([401, 403, 404, 429].includes(status)) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      // onError removed - use onError in individual queries if needed
    },
    mutations: {
      onError: (error: any) => {
        // Log all mutation errors for debugging
        console.error('[tRPC Mutation Error]', {
          message: error?.message || 'Unknown error',
          code: error?.data?.code,
          httpStatus: error?.data?.httpStatus,
          path: error?.data?.path,
          stack: error?.stack,
        });
      },
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Safely get root element with error handling
// [FIX APPLIED] Verified fix for spinning wheel issue (Safe mount)
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Failed to find root element. DOM may not be ready.");
  throw new Error("Root element not found. Cannot mount React application.");
}

// Clear any existing content (like loading spinner) before mounting
rootElement.innerHTML = "";

createRoot(rootElement).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProvider>
        <App />
      </FeatureFlagProvider>
    </QueryClientProvider>
  </trpc.Provider>
);

