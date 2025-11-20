// Load environment variables from .env.production file FIRST
// This ensures DATABASE_URL is available before any other imports
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.production in production environment
if (process.env.NODE_ENV === 'production') {
  const envPath = path.join(__dirname, '../.env.production');
  console.log('[BUG-001 FIX] Loading .env.production from:', envPath);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('[BUG-001 FIX] Failed to load .env.production:', result.error);
  } else {
    console.log('[BUG-001 FIX] Successfully loaded .env.production');
    console.log('[BUG-001 FIX] DATABASE_URL is now available:', !!process.env.DATABASE_URL);
  }
}

import express from "express";
import { createServer } from "http";
import { runAutoMigrations } from "./autoMigrate.js";
import { startPriceAlertsCron } from "./cron/priceAlertsCron.js";

async function startServer() {
  // === DIAGNOSTIC LOGGING FOR BUG-001 ===
  console.log("\n=== [BUG-001 DEBUG] DATABASE CONNECTIVITY CHECK ===");
  console.log("[BUG-001] process.env.DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("[BUG-001] process.env.DATABASE_URL length:", process.env.DATABASE_URL?.length || 0);
  console.log("[BUG-001] process.env.DATABASE_URL (first 50 chars):", process.env.DATABASE_URL?.substring(0, 50) || "UNDEFINED");
  console.log("[BUG-001] process.env.NODE_ENV:", process.env.NODE_ENV);
  console.log("=== [BUG-001 DEBUG] END ===");
  console.log("");
  // === END DIAGNOSTIC LOGGING ===

  // Run auto-migrations on startup
  await runAutoMigrations();

  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // Serve static files with proper cache headers
  app.use(
    express.static(staticPath, {
      setHeaders: (res, filePath) => {
        // HTML files: no cache (always check for updates)
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
        // Hashed assets (JS, CSS): long-term cache (1 year)
        else if (/\.(js|css)$/.test(filePath) && /-[a-zA-Z0-9]{8,}\.(js|css)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Other assets: short-term cache (1 day)
        else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    })
  );

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    // Set no-cache headers for HTML
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start cron jobs
    startPriceAlertsCron();
  });
}

startServer().catch(console.error);
