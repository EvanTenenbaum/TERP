import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type PluginOption } from "vite";

// Dev-only plugins are imported dynamically to avoid bundling them in production
// This enables `pnpm install --prod` in Docker runner stage

export default defineConfig(async ({ mode }) => {
  /**
   * IMPORTANT:
   * - `vite-plugin-manus-runtime` is intended for Manus-hosted environments.
   *   When enabled in a normal production build (e.g., DigitalOcean), it injects a runtime
   *   that can leave the bundle referencing a bare `jsx` symbol, causing:
   *     "Uncaught ReferenceError: jsx is not defined"
   * - `jsxLocPlugin()` is a dev-quality-of-life plugin; keep it out of production bundles.
   */
  const isProd = mode === "production";

  // Build plugins array - dev plugins loaded dynamically
  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (!isProd) {
    try {
      const { jsxLocPlugin } = await import("@builder.io/vite-plugin-jsx-loc");
      const { vitePluginManusRuntime } =
        await import("vite-plugin-manus-runtime");
      plugins.push(jsxLocPlugin(), vitePluginManusRuntime());
    } catch {
      // Dev plugins not available (e.g., --prod install), skip them
      console.log(
        "Dev plugins not available, skipping jsxLocPlugin and vitePluginManusRuntime"
      );
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Split vendor chunks aggressively to keep chunks under 500KB
            if (id.includes("node_modules")) {
              // React core libraries
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("scheduler")
              ) {
                return "react-vendor";
              }
              // tRPC libraries
              if (
                id.includes("@trpc") ||
                id.includes("@tanstack/react-query")
              ) {
                return "trpc-vendor";
              }
              // Radix UI components - split into smaller chunks
              if (id.includes("@radix-ui")) {
                return "ui-vendor";
              }
              // Date/time libraries
              if (id.includes("luxon") || id.includes("date-fns")) {
                return "calendar";
              }
              // Form libraries
              if (
                id.includes("react-hook-form") ||
                id.includes("@hookform") ||
                id.includes("zod")
              ) {
                return "forms-vendor";
              }
              // Icons - these can be large
              if (id.includes("lucide-react") || id.includes("heroicons")) {
                return "icons-vendor";
              }
              // Charting libraries
              if (id.includes("recharts") || id.includes("d3")) {
                return "charts-vendor";
              }
              // Remaining node_modules go to a general vendor chunk
              return "vendor";
            }
          },
        },
      },
      chunkSizeWarningLimit: 800, // Increase limit to 800KB (warning only, not fatal)
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1",
      ],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
