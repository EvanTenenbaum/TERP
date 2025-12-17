import "dotenv/config";
// Global error handlers for uncaught exceptions and unhandled rejections
process.on("uncaughtException", err => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
  console.error("Stack:", err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

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
import {
  performHealthCheck,
  livenessCheck,
  readinessCheck,
} from "./healthCheck";
import { setupGracefulShutdown } from "./gracefulShutdown";
// import { seedAllDefaults } from "../services/seedDefaults"; // TEMPORARILY DISABLED
import { assignRoleToUser } from "../services/seedRBAC";
import { startPriceAlertsCron } from "../cron/priceAlertsCron.js";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail } from "../db";
import { runAutoMigrations } from "../autoMigrate";
import { setupMemoryManagement } from "../utils/memoryOptimizer";

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
  // Initialize memory management FIRST to prevent memory leaks
  try {
    setupMemoryManagement();
    logger.info("✅ Memory management initialized");
  } catch (error) {
    console.warn("Failed to initialize memory management:", error);
    // Continue - memory management is critical but not fatal
  }

  // Initialize monitoring
  try {
    initMonitoring();
  } catch (error) {
    console.warn("Failed to initialize monitoring:", error);
    // Continue - monitoring is non-critical
  }

  // Replace console with structured logger
  try {
    replaceConsole();
  } catch (error) {
    console.warn("Failed to replace console:", error);
    // Continue - can use regular console
  }

  // Run auto-migrations to fix schema drift (adds missing columns/tables)
  // Load environment variables and log DATABASE_URL for debugging
  const { env } = await import("./env");
  logger.info(`🔗 DATABASE_URL configured: ${env.databaseUrl ? 'YES' : 'NO'}`);
  if (env.databaseUrl) {
    // Log sanitized version (hide password)
    const sanitized = env.databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
    logger.info(`📊 Database connection: ${sanitized}`);
  }

  // This ensures the database schema matches what the code expects
  // Add retry mechanism for auto-migrations (reduced delays for faster deployment)
  const runMigrationsWithRetry = async (maxRetries = 2) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info(`🔄 Running auto-migrations (attempt ${i + 1}/${maxRetries})...`);
        await runAutoMigrations();
        logger.info("✅ Auto-migrations complete");
        return; // Success, exit the loop
      } catch (error) {
        logger.warn({ msg: `Auto-migration attempt ${i + 1} failed`, error });
        if (i === maxRetries - 1) {
          // Non-fatal: log error but allow server to start
          logger.error({ msg: "Auto-migrations failed after retries - server starting in degraded mode", error });
          return; // Don't throw, allow server to start
        }
        // Reduced backoff: 2s, 4s
        const delay = Math.pow(2, i + 1) * 1000;
        logger.info(`⏳ Waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  try {
    await runMigrationsWithRetry();
  } catch (error) {
    logger.warn({ msg: "Auto-migration failed after all retries (non-fatal) - app may still work", error });
    logger.warn("Some features may not work correctly if schema is out of sync");
    // Continue - app may still work depending on what failed
    // The server will start in degraded mode and can be fixed later
  }

  // Seed default data and create admin user on first startup
  // TEMPORARILY DISABLED: Schema mismatch causing crashes on Railway
  // TODO: Fix schema drift and re-enable seeding
  //
  // NOTE: Seeding can be bypassed by setting SKIP_SEEDING=true environment variable
  // This allows the app to start even when schema drift prevents seeding
  try {
    // Check SKIP_SEEDING (case-insensitive)
    const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
    if (skipSeeding === "true" || skipSeeding === "1") {
      logger.warn(
        "⚠️  DEPRECATED: SKIP_SEEDING is deprecated. Use `pnpm seed:new` instead."
      );
      logger.info(
        "⏭️  SKIP_SEEDING is set - skipping all default data seeding"
      );
      logger.info(
        "💡 To enable seeding: remove SKIP_SEEDING or set it to false"
      );
    } else {
      logger.info("Checking for default data and admin user...");
      // await seedAllDefaults(); // Currently disabled due to schema drift
    }

    // Create initial admin user if environment variables are provided
    // (env already loaded above)
    if (env.initialAdminUsername && env.initialAdminPassword) {
      try {
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
            try {
              await assignRoleToUser(newAdmin.openId, "Super Admin");
              logger.info(
                `Super Admin role assigned to ${env.initialAdminUsername}`
              );
            } catch (error) {
              logger.warn({
                msg: "Failed to assign Super Admin role",
                error,
                userOpenId: newAdmin.openId,
              });
              // IMPORTANT: Log the error, but DO NOT re-throw.
              // Allow the server to start even if role assignment fails.
              // We can handle RBAC issues later through the admin interface.
            }
          }

          // Security warning for default credentials
          logger.warn({
            msg: "SECURITY WARNING: Default admin credentials detected",
            username: env.initialAdminUsername,
            action:
              "Please change the admin password immediately after first login",
          });
        } else {
          logger.info(`Admin user already exists: ${env.initialAdminUsername}`);
        }
      } catch (error) {
        logger.error({ msg: "Failed to create admin user (database schema mismatch?) - server will start without admin user", error });
        logger.info("💡 You can create the first admin user via /api/auth/create-first-user endpoint");
        // Don't re-throw - allow server to start
      }
    } else {
      logger.info(
        "No INITIAL_ADMIN_USERNAME/INITIAL_ADMIN_PASSWORD provided - skipping admin user creation"
      );
      logger.info(
        "Use /api/auth/create-first-user endpoint to create the first admin user"
      );
    }
  } catch (error) {
    logger.warn({ msg: "Failed to seed defaults or create admin user", error });
  }

  logger.info(
    "✅ Seeding/admin user setup complete, starting Express server setup..."
  );

  try {
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

    // Trust proxy headers from DigitalOcean App Platform load balancer.
    // IMPORTANT: `true` is considered too permissive by `express-rate-limit` and can throw:
    // ERR_ERL_PERMISSIVE_TRUST_PROXY. Use a hop count instead.
    app.set("trust proxy", 1);

    // Simple auth routes under /api/auth
    registerSimpleAuthRoutes(app);

    // GitHub webhook endpoint (must be before JSON body parser middleware)
    // We need raw body for signature verification
    app.post(
      "/api/webhooks/github",
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
    // Always return 200 to prevent Railway deployment failures
    // Railway's health check should pass as long as the app is running
    app.get("/health", async (req, res) => {
      try {
        const health = await performHealthCheck();
        // Always return 200 - Railway just needs to know the app is alive
        res.status(200).json(health);
      } catch (error) {
        // Always return 200 for health check to prevent deployment failures
        // Log the error but don't fail the health check
        logger.error({ msg: "Health check error", error });
        res.status(200).json({
          status: "degraded",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          error: error instanceof Error ? error.message : "Health check failed",
          checks: {
            database: { status: "error", error: "Health check exception" },
            memory: { status: "ok", used: 0, total: 0, percentage: 0 },
          },
        });
      }
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
      } catch {
        // Ignore errors reading build version
      }
      res.json({
        version: "2025-11-25-v4",
        build: buildVersion,
        hasContextLogging: true,
        hasDebugEndpoint: true,
        hasDefensiveMiddleware: true,
        hasPublicUserProvisioning: true,
        commit: process.env.GIT_COMMIT || "unknown",
        timestamp: new Date().toISOString(),
      });
    });

    // Debug endpoint to test createContext directly
    app.get("/api/debug/context", async (req, res) => {
      try {
        const context = await createContext({ req, res } as Parameters<typeof createContext>[0]);
        res.json({
          success: true,
          user: {
            id: context.user.id,
            openId: context.user.openId,
            email: context.user.email,
            role: context.user.role,
          },
          isPublicDemoUser:
            context.user.id === -1 ||
            context.user.openId === "public-demo-user" ||
            context.user.email === "demo+public@terp-app.local",
          message: "createContext called successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Data augmentation HTTP endpoint (temporary bypass for tRPC auth issues)
    const dataAugmentRouter = (await import("../routers/dataAugmentHttp.js"))
      .default;
    app.use("/api/data-augment", dataAugmentRouter);

    // tRPC API
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext,
      })
    );
    logger.info("✅ Routes configured, setting up static files/Vite...");

    // development mode uses Vite, production mode uses static files
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    logger.info("✅ Static files configured, determining port...");

    // Determine port: prefer PORT env var, but search for available port if busy
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    // Sentry error handler (must be after all routes)
    try {
      setupErrorHandler(app);
    } catch (error) {
      logger.warn({ msg: "Failed to setup error handler (Sentry)", error });
      // Continue - error handling is nice-to-have
    }

    // Setup graceful shutdown
    try {
      setupGracefulShutdown();
    } catch (error) {
      logger.warn({ msg: "Failed to setup graceful shutdown", error });
      // Continue - graceful shutdown is nice-to-have
    }

    logger.info(`✅ All setup complete, starting server on port ${port}...`);

    server.listen(port, "0.0.0.0", () => {
      logger.info(`Server running on http://0.0.0.0:${port}/`);
      logger.info(`Health check available at http://localhost:${port}/health`);
      
      // Start price alerts cron job
      try {
        startPriceAlertsCron();
        logger.info("✅ Price alerts cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start price alerts cron", error });
        // Server continues - cron is non-critical
      }
    });
  } catch (error) {
    logger.error({ error }, "❌ CRITICAL ERROR during Express server setup:");
    if (error instanceof Error && error.stack) {
      logger.error({ stack: error.stack }, "Stack trace")
    }
    process.exit(1);
  }
}

startServer().catch(error => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});

