/**
 * @deprecated This file is no longer used as the server entrypoint.
 * The production entrypoint is server/_core/index.ts
 * 
 * This file is retained for historical reference only. All functionality has been
 * migrated to the real entrypoint.
 * 
 * DO NOT USE THIS FILE FOR:
 * - Development (use pnpm dev which runs server/_core/index.ts)
 * - Production (DigitalOcean uses server/_core/index.ts)
 * - Testing (tests use server/_core/index.ts)
 * 
 * WHY RETAINED:
 * - Historical reference for debugging past issues (BUG-001)
 * - Contains diagnostic logging patterns that may be useful
 * - Safe to delete in future cleanup
 * 
 * @see server/_core/index.ts for the active entrypoint
 */

// Load environment variables from .env.production file FIRST
// This ensures DATABASE_URL is available before any other imports
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.production in production environment
if (process.env.NODE_ENV === 'production') {
  console.log('[BUG-001 FIX] Current __dirname:', __dirname);
  console.log('[BUG-001 FIX] Current working directory:', process.cwd());
  
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../.env.production'),
    path.join(process.cwd(), '.env.production'),
    './.env.production',
    '.env.production'
  ];
  
  console.log('[BUG-001 FIX] Trying to load .env.production from multiple paths...');
  let loaded = false;
  
  for (const envPath of possiblePaths) {
    console.log('[BUG-001 FIX] Trying path:', envPath);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('[BUG-001 FIX] ✅ Successfully loaded .env.production from:', envPath);
      console.log('[BUG-001 FIX] DATABASE_URL is now available:', !!process.env.DATABASE_URL);
      loaded = true;
      break;
    } else {
      console.log('[BUG-001 FIX] ❌ Failed to load from:', envPath, '- Error:', result.error.message);
    }
  }
  
  if (!loaded) {
    console.error('[BUG-001 FIX] ❌ FAILED TO LOAD .env.production FROM ANY PATH!');
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

startServer().catch((error) => {
  console.error("Server startup failed:", error);
});
