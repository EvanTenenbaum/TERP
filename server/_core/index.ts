import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerSimpleAuthRoutes } from "./simpleAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { apiLimiter, authLimiter } from "./rateLimiter";
import { initMonitoring, getRequestHandler, getErrorHandler } from "./monitoring";
import { requestLogger } from "./requestLogger";
import { logger, replaceConsole } from "./logger";
import { performHealthCheck, livenessCheck, readinessCheck } from "./healthCheck";
import { setupGracefulShutdown } from "./gracefulShutdown";
import { seedAllDefaults } from "../services/seedDefaults";
import { assignRoleToUser } from "../services/seedRBAC";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail } from "../db";

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
  
  // Seed default data and create admin user on first startup
  try {
    logger.info("Checking for default data and admin user...");
    await seedAllDefaults();
    
    // Create admin user if it doesn't exist
    const adminExists = await getUserByEmail("Evan");
    if (!adminExists) {
      const newAdmin = await simpleAuth.createUser("Evan", "oliver", "Evan (Admin)");
      logger.info("Admin user created: Evan / oliver");
      
      // Assign Super Admin role to the default admin user
      if (newAdmin && newAdmin.openId) {
        await assignRoleToUser(newAdmin.openId, "Super Admin");
        logger.info("Super Admin role assigned to Evan");
      }
    }
  } catch (error) {
    logger.warn({ msg: "Failed to seed defaults or create admin user", error });
  }
  
  const app = express();
  const server = createServer(app);
  
  // Sentry request handler (must be first)
  app.use(getRequestHandler());
  
  // Request logging
  app.use(requestLogger);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Cookie parser for session management
  app.use(cookieParser());
  
  // Trust proxy headers from DigitalOcean App Platform load balancer
  app.set('trust proxy', true);
  
  // Simple auth routes under /api/auth
  registerSimpleAuthRoutes(app);
  
  // GitHub webhook endpoint (must be before JSON body parser middleware)
  // We need raw body for signature verification
  app.post("/api/webhooks/github", 
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const { handleGitHubWebhook } = await import("../webhooks/github.js");
        // Convert raw body back to JSON if it's a Buffer
        if (Buffer.isBuffer(req.body)) {
          req.body = JSON.parse(req.body.toString());
        }
        await handleGitHubWebhook(req, res);
      } catch (error) {
        logger.error({ err: error, msg: "GitHub webhook route error" });
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Apply rate limiting
  app.use("/api/trpc", apiLimiter);
  app.use("/api/trpc/auth", authLimiter);
  
  // Health check endpoints
  app.get("/health", async (req, res) => {
    const health = await performHealthCheck();
    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
    res.status(statusCode).json(health);
  });
  
  app.get("/health/live", (req, res) => {
    res.json(livenessCheck());
  });
  
  app.get("/health/ready", async (req, res) => {
    const ready = await readinessCheck();
    const statusCode = ready.status === "ok" ? 200 : 503;
    res.status(statusCode).json(ready);
  });
  
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
  
  // Setup graceful shutdown
  setupGracefulShutdown();
  
  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
    logger.info(`Health check available at http://localhost:${port}/health`);
  });
}

startServer().catch(console.error);
