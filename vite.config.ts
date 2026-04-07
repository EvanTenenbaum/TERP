import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "module";
import path from "path";
import {
  defineConfig,
  normalizePath,
  type IndexHtmlTransformResult,
  type Plugin,
  type PluginOption,
} from "vite";

// IMPORTANT: @sentry/vite-plugin is imported DYNAMICALLY below to prevent build crashes
// if the package is missing or corrupted. This is critical for build reliability.

// Dev-only plugins are imported dynamically to avoid bundling them in production
// This enables `pnpm install --prod` in Docker runner stage

async function createTerpDomscribePlugins(): Promise<PluginOption[]> {
  const require = createRequire(import.meta.url);
  const domscribeRequire = createRequire(
    require.resolve("@domscribe/react/package.json")
  );
  const overlayModulePath = "/@terp-domscribe-overlay.js";
  const runtimeModulePath = "/@terp-domscribe-runtime.js";
  const { domscribe } = await import("@domscribe/react/vite");
  const toFsImport = (filePath: string) => {
    const normalized = normalizePath(filePath);
    return normalized.startsWith("/")
      ? `/@fs${normalized}`
      : `/@fs/${normalized}`;
  };
  const runtimeEntry = toFsImport(
    domscribeRequire.resolve("@domscribe/runtime")
  );
  const reactEntry = toFsImport(domscribeRequire.resolve("@domscribe/react"));
  const relayClientEntry = toFsImport(
    domscribeRequire.resolve("@domscribe/relay/client")
  );
  const coreEntry = toFsImport(domscribeRequire.resolve("@domscribe/core"));
  const overlayEntry = toFsImport(
    domscribeRequire.resolve("@domscribe/overlay")
  );

  const domscribePlugin = domscribe({
    include: /\.(jsx|tsx)$/i,
    overlay: true,
    rootDir: path.resolve(import.meta.dirname),
  }) as Plugin;

  const originalTransformIndexHtml = domscribePlugin.transformIndexHtml;

  domscribePlugin.transformIndexHtml = function (
    ...args
  ): IndexHtmlTransformResult | Promise<IndexHtmlTransformResult> {
    const value =
      typeof originalTransformIndexHtml === "function"
        ? originalTransformIndexHtml.apply(this, args)
        : undefined;

    const stripBrokenRuntimeTag = (
      result: IndexHtmlTransformResult | undefined
    ): IndexHtmlTransformResult | undefined => {
      if (
        !result ||
        typeof result === "string" ||
        !("tags" in result) ||
        !result.tags
      ) {
        return result;
      }

      return {
        ...result,
        tags: result.tags.filter(tag => {
          const children = typeof tag.children === "string" ? tag.children : "";
          return (
            !children.includes("/@domscribe/react-init.js") &&
            !children.includes("/node_modules/@domscribe/overlay/index.js")
          );
        }),
      };
    };

    if (value && typeof (value as Promise<unknown>).then === "function") {
      return (value as Promise<IndexHtmlTransformResult>).then(
        stripBrokenRuntimeTag
      );
    }

    return stripBrokenRuntimeTag(value as IndexHtmlTransformResult | undefined);
  };

  const runtimeBridgePlugin: Plugin = {
    name: "terp-domscribe-runtime-bridge",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      if (id === overlayModulePath) {
        return id;
      }
      if (id === runtimeModulePath) {
        return id;
      }
      return null;
    },
    load(id) {
      if (id === overlayModulePath) {
        return `
const overlayImport = "${overlayEntry}";

import(overlayImport)
  .then(module => module.initOverlay())
  .catch(error =>
    console.warn(
      "[domscribe] Failed to load overlay:",
      error instanceof Error ? error.message : String(error)
    )
  );
        `;
      }

      if (id !== runtimeModulePath) {
        return null;
      }

      return `
const globalKey = "__TERP_DOMSCRIBE_RUNTIME_BRIDGE__";
const runtimeImport = "${runtimeEntry}";
const reactImport = "${reactEntry}";
const relayClientImport = "${relayClientEntry}";
const coreImport = "${coreEntry}";

const state =
  window[globalKey] ||
  (window[globalKey] = {
    initialized: false,
    ready: null,
    wsClient: null,
  });

if (!state.ready) {
  state.ready = (async () => {
  const relayPort = window.__DOMSCRIBE_RELAY_PORT__;
  const relayHost = window.__DOMSCRIBE_RELAY_HOST__ || "127.0.0.1";

  if (relayPort) {
    const [
      { RuntimeManager, BridgeDispatch },
      { createReactAdapter },
      { RelayWSClient },
      { WS_EVENTS },
    ] = await Promise.all([
      import(/* @vite-ignore */ runtimeImport),
      import(/* @vite-ignore */ reactImport),
      import(/* @vite-ignore */ relayClientImport),
      import(/* @vite-ignore */ coreImport),
    ]);

    await RuntimeManager.getInstance().initialize({
      phase: 1,
      debug: false,
      redactPII: true,
      blockSelectors: [],
      adapter: createReactAdapter({
        strategy: "best-effort",
        maxTreeDepth: 50,
        includeWrappers: true,
        debug: false,
        hookNameResolvers: new Map(),
      }),
    });

    const wsClient = new RelayWSClient(relayHost, relayPort, { debug: false });
    const bridge = BridgeDispatch.getInstance();

    wsClient.on(WS_EVENTS.CONTEXT_REQUEST, async data => {
      const { requestId, entryId } = data;

      if (!bridge.isReady()) {
        wsClient.send(WS_EVENTS.CONTEXT_RESPONSE, {
          requestId,
          success: false,
          rendered: false,
          error: "Bridge not ready",
        });
        return;
      }

      try {
        const context = await bridge.captureContextForEntry(entryId);
        const elementInfo = bridge.getElementInfo(entryId);

        wsClient.send(WS_EVENTS.CONTEXT_RESPONSE, {
          requestId,
          success: context !== null,
          rendered: context !== null,
          context: context ?? undefined,
          elementInfo: elementInfo
            ? {
                tagName: elementInfo.element?.tagName?.toLowerCase(),
                attributes: Object.fromEntries(
                  Array.from(elementInfo.element?.attributes ?? []).map(attr => [
                    attr.name,
                    attr.value,
                  ])
                ),
                innerText: elementInfo.element?.innerText?.slice(0, 500),
              }
            : undefined,
        });
      } catch (error) {
        wsClient.send(WS_EVENTS.CONTEXT_RESPONSE, {
          requestId,
          success: false,
          rendered: false,
          error: error instanceof Error ? error.message : "Capture failed",
        });
      }
    });

    wsClient.connect();
    state.wsClient = wsClient;
  }
  state.initialized = true;
  })().catch(error => {
    state.ready = null;
    console.warn(
      "[domscribe] Failed to init TERP runtime bridge:",
      error instanceof Error ? error.message : String(error)
    );
  });
}
      `;
    },
    transformIndexHtml() {
      return {
        html: "",
        tags: [
          {
            tag: "script",
            attrs: { type: "module" },
            children: `import("${overlayModulePath}");`,
            injectTo: "body",
          },
          {
            tag: "script",
            attrs: { type: "module" },
            children: `import("${runtimeModulePath}").catch(error => console.warn("[domscribe] Failed to load TERP runtime bridge:", error instanceof Error ? error.message : String(error)));`,
            injectTo: "body",
          },
        ],
      };
    },
  };

  return [domscribePlugin, runtimeBridgePlugin];
}

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

  // TERP serves Vite from client/, so keep Domscribe artifacts at repo root.
  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (!isProd) {
    plugins.splice(1, 0, ...(await createTerpDomscribePlugins()));
  }

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

  // Sentry source maps plugin - only in production builds with auth token
  // This uploads source maps to Sentry for readable stack traces
  // CRITICAL: Dynamic import to prevent build crashes if package is missing
  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT;
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

  if (isProd && sentryOrg && sentryProject && sentryAuthToken) {
    try {
      // Dynamic import - if @sentry/vite-plugin is missing, catch handles it
      const { sentryVitePlugin } = await import("@sentry/vite-plugin");
      plugins.push(
        sentryVitePlugin({
          org: sentryOrg,
          project: sentryProject,
          authToken: sentryAuthToken,
          // Disable telemetry to avoid any potential issues
          telemetry: false,
          // Only upload source maps, don't inject debug IDs in dev
          sourcemaps: {
            filesToDeleteAfterUpload: ["**/*.map"], // Delete source maps after upload for security
          },
          // Release name for tracking versions
          release: {
            name: process.env.VITE_BUILD_VERSION || `build-${Date.now()}`,
          },
        })
      );
      console.log("✅ Sentry source maps plugin configured");
    } catch (error) {
      console.warn(
        "⚠️ Failed to load/configure Sentry source maps plugin:",
        error
      );
      console.log("   Build will continue without source map upload to Sentry");
      // Non-fatal - build continues without source map upload
    }
  } else if (isProd) {
    console.log(
      "ℹ️ Sentry source maps plugin disabled (missing SENTRY_ORG, SENTRY_PROJECT, or SENTRY_AUTH_TOKEN)"
    );
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
      // Enable source maps for Sentry stack traces
      // Source maps are deleted after upload when SENTRY_AUTH_TOKEN is set
      sourcemap: true,
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
              // AG Grid Enterprise — isolate from main vendor chunk
              if (
                id.includes("ag-grid-community") ||
                id.includes("ag-grid-enterprise")
              ) {
                return "ag-grid-vendor";
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
