import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import "./index.css";

// Initialize Sentry AFTER all other imports to prevent blocking
// Sentry is already wrapped in try-catch in sentry.client.config.ts
// Only load if DSN is configured (non-blocking)
if (import.meta.env.VITE_SENTRY_DSN) {
  import("../../sentry.client.config").catch((error) => {
    console.warn("Failed to load Sentry, continuing without error tracking:", error);
  });
}

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
        // SECURITY: Only log detailed errors in development mode
        if (import.meta.env.DEV) {
          console.error('[tRPC Mutation Error]', {
            message: error?.message || 'Unknown error',
            code: error?.data?.code,
            httpStatus: error?.data?.httpStatus,
            path: error?.data?.path,
            stack: error?.stack,
          });
        } else {
          // In production, log minimal info without exposing sensitive details
          console.error('[Error]', error?.data?.code || 'UNKNOWN');
        }
      },
    },
  },
});

/**
 * Helper to get VIP session token from storage
 * Checks sessionStorage first (for impersonation), then localStorage (for regular sessions)
 */
function getVipSessionToken(): string | null {
  // Check sessionStorage first (impersonation sessions)
  const sessionToken = sessionStorage.getItem("vip_session_token");
  const isImpersonation = sessionStorage.getItem("vip_impersonation") === "true";

  if (sessionToken && isImpersonation) {
    return sessionToken;
  }

  // Check localStorage (regular sessions)
  const regularToken = localStorage.getItem("vip_session_token");
  const isRegularImpersonation = localStorage.getItem("vip_impersonation") === "true";

  if (regularToken && !isRegularImpersonation) {
    return regularToken;
  }

  return null;
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // FE-QA-003: Send VIP session token in header for VIP portal procedures
        const vipToken = getVipSessionToken();
        if (vipToken) {
          return {
            "x-vip-session-token": vipToken,
          };
        }
        return {};
      },
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

