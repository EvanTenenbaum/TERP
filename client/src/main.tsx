import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
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
      onError: (error: any) => {
        // Log all query errors for debugging
        console.error('[tRPC Query Error]', {
          message: error?.message || 'Unknown error',
          code: error?.data?.code,
          httpStatus: error?.data?.httpStatus,
          path: error?.data?.path,
          stack: error?.stack,
        });
      },
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

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

