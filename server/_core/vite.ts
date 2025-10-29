import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
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
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../..", "dist", "public")
      : path.resolve(__dirname, "public");
  
  console.log('[serveStatic] __dirname:', __dirname);
  console.log('[serveStatic] distPath:', distPath);
  console.log('[serveStatic] distPath exists:', fs.existsSync(distPath));
  
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log('[serveStatic] Files in distPath:', files);
  }
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve static files with proper cache headers
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // HTML files: no cache (always check for updates)
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Hashed assets (JS, CSS with hash in filename): long-term cache (1 year)
      else if (/\.(js|css)$/.test(filePath) && /-[a-zA-Z0-9]{8,}\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Other assets: short-term cache (1 day)
      else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  // but don't catch /health, /api, or /assets routes
  app.use((req, res, next) => {
    const reqPath = req.path;
    // Skip health check, API routes, and assets - let them 404 if not handled
    if (reqPath.startsWith('/health') || reqPath.startsWith('/api') || reqPath.startsWith('/assets')) {
      return next();
    }
    // Only serve index.html for non-API, non-asset routes
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
