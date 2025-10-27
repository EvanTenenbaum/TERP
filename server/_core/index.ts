import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerClerkOAuthRoutes } from "./clerkAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiLimiter, authLimiter } from "./rateLimiter";
import { initMonitoring, getRequestHandler, getErrorHandler } from "./monitoring";
import { requestLogger } from "./requestLogger";
import { logger, replaceConsole } from "./logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Initialize monitoring
  initMonitoring();
  
  // Replace console with structured logger
  replaceConsole();
  
  const app = express();
  const server = createServer(app);
  
  // Sentry request handler (must be first)
  app.use(getRequestHandler());
  
  // Request logging
  app.use(requestLogger);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerClerkOAuthRoutes(app);
  
  // Apply rate limiting
  app.use("/api/trpc", apiLimiter);
  app.use("/api/trpc/auth", authLimiter);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Sentry error handler (must be last)
  app.use(getErrorHandler());
  
  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
