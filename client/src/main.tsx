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
      retry: 1, // Retry failed queries once
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

