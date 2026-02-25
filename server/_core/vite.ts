import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NOTE: vite and vite.config are now dynamically imported inside setupVite()
// This allows production builds to use `pnpm install --prod` without vite
// See: .kiro/specs/deployment-optimization/design.md

export async function setupVite(app: Express, server: Server) {
  // Dynamic imports - only loaded when this function is called (dev mode only)
  // This is critical for enabling --prod builds in production
  const { createServer: createViteServer } = await import("vite");

  // Load Vite config from disk so async/function configs are resolved correctly.
  // Spreading a function export silently drops settings (e.g. client root), which
  // can leave the app stuck on the loading shell in dev/E2E.
  const viteConfigCandidates = [
    path.resolve(__dirname, "../..", "vite.config.ts"),
    path.resolve(__dirname, "../..", "vite.config.js"),
  ];
  const viteConfigFile = viteConfigCandidates.find(candidate =>
    fs.existsSync(candidate)
  );

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: viteConfigFile,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const acceptsHtml = req.headers.accept?.includes("text/html");
    if (!acceptsHtml) {
      return next();
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use process.cwd() for reliable path resolution in production
  // [FIX APPLIED] Verified fix for spinning wheel issue (DO App Platform path resolution)
  // When bundled, __dirname points to dist/, but process.cwd() is always the app root
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../..", "dist", "public")
      : path.resolve(process.cwd(), "dist", "public");

  // Log the resolved path for debugging (critical for production issues)
  // Use try-catch to prevent logger errors from crashing server startup
  try {
    logger.info({ distPath, cwd: process.cwd() }, "Resolving static file path");
  } catch {
    // Logger might not be initialized yet, use console as fallback
    console.info(
      `[serveStatic] Resolving static file path: ${distPath} (cwd: ${process.cwd()})`
    );
  }

  // Only log errors if directory missing (critical startup issue)
  if (!fs.existsSync(distPath)) {
    const errorInfo = {
      distPath,
      cwd: process.cwd(),
      exists: fs.existsSync(path.resolve(process.cwd(), "dist")),
      distContents: fs.existsSync(path.resolve(process.cwd(), "dist"))
        ? fs.readdirSync(path.resolve(process.cwd(), "dist"))
        : [],
    };
    try {
      logger.error(
        errorInfo,
        "Could not find the build directory - make sure to build the client first"
      );
    } catch {
      console.error(
        "[serveStatic] ERROR: Could not find build directory:",
        errorInfo
      );
    }
  } else {
    try {
      const files = fs.readdirSync(distPath).slice(0, 10);
      logger.info(
        { distPath, fileCount: files.length },
        "Serving static files from build directory"
      );
    } catch {
      console.info(`[serveStatic] Serving static files from: ${distPath}`);
    }
  }

  // Serve static files with proper cache headers
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        // HTML files: no cache (always check for updates)
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
        // Hashed assets (JS, CSS with hash in filename): long-term cache (1 year)
        else if (
          /\.(js|css)$/.test(filePath) &&
          /-[a-zA-Z0-9]{8,}\.(js|css)$/.test(filePath)
        ) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
        // Other assets: short-term cache (1 day)
        else {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  // but don't catch /health, /api, or /assets routes
  app.use((req, res, next) => {
    const reqPath = req.path;
    // Skip health check, API routes, and assets - let them 404 if not handled
    if (
      reqPath.startsWith("/health") ||
      reqPath.startsWith("/api") ||
      reqPath.startsWith("/assets")
    ) {
      return next();
    }
    // Only serve index.html for non-API, non-asset routes
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
