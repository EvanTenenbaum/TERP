import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { runAutoMigrations } from "./autoMigrate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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
  });
}

startServer().catch(console.error);
