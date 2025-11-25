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
import { initMonitoring, setupErrorHandler } from "./monitoring";
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
    
    // Create initial admin user if environment variables are provided
    const { env } = await import("./env");
    if (env.initialAdminUsername && env.initialAdminPassword) {
      const adminExists = await getUserByEmail(env.initialAdminUsername);
      if (!adminExists) {
        const newAdmin = await simpleAuth.createUser(
          env.initialAdminUsername, 
          env.initialAdminPassword, 
          `${env.initialAdminUsername} (Admin)`
        );
        logger.info(`Admin user created: ${env.initialAdminUsername}`);
        
        // Assign Super Admin role to the initial admin user
        if (newAdmin && newAdmin.openId) {
          await assignRoleToUser(newAdmin.openId, "Super Admin");
          logger.info(`Super Admin role assigned to ${env.initialAdminUsername}`);
        }
        
        // Security warning for default credentials
        logger.warn({
          msg: "SECURITY WARNING: Default admin credentials detected",
          username: env.initialAdminUsername,
          action: "Please change the admin password immediately after first login"
        });
      } else {
        logger.info(`Admin user already exists: ${env.initialAdminUsername}`);
      }
    } else {
      logger.info("No INITIAL_ADMIN_USERNAME/INITIAL_ADMIN_PASSWORD provided - skipping admin user creation");
      logger.info("Use /api/auth/create-first-user endpoint to create the first admin user");
    }
  } catch (error) {
    logger.warn({ msg: "Failed to seed defaults or create admin user", error });
  }
  
  const app = express();
  const server = createServer(app);
  
  // Sentry is now auto-instrumented via setupExpressErrorHandler
  
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

  // Version check endpoint to verify deployed code
  app.get("/api/version-check", async (req, res) => {
    let buildVersion = "unknown";
    try {
      const fs = await import("fs");
      const path = await import("path");
      const buildVersionPath = path.resolve(process.cwd(), ".build-version");
      if (fs.existsSync(buildVersionPath)) {
        buildVersion = fs.readFileSync(buildVersionPath, "utf-8").trim();
      }
    } catch (e) {
      // Ignore errors reading build version
    }
    res.json({
      version: "2025-11-25-v2",
      build: buildVersion,
      hasContextLogging: true,
      hasDebugEndpoint: true,
      hasDefensiveMiddleware: true,
      commit: process.env.GIT_COMMIT || "unknown",
      timestamp: new Date().toISOString(),
    });
  });

  // Debug endpoint to test createContext directly
  app.get("/api/debug/context", async (req, res) => {
    try {
      const context = await createContext({ req, res });
      res.json({
        success: true,
        user: {
          id: context.user.id,
          email: context.user.email,
          role: context.user.role,
        },
        message: "createContext called successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Sentry error handler (must be after all routes)
  setupErrorHandler(app);
  
  // Setup graceful shutdown
  setupGracefulShutdown();
  
  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
    logger.info(`Health check available at http://localhost:${port}/health`);
  });
}

startServer().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
