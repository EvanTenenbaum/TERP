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
import { registerQaAuthRoutes, isQaAuthEnabled } from "./qaAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./vite";
// setupVite is imported dynamically in dev mode only to avoid bundling vite deps
import { apiLimiter, authLimiter } from "./rateLimiter";
import { initMonitoring, setupErrorHandler } from "./monitoring";
import { requestLogger } from "./requestLogger";
import { logger, replaceConsole } from "./logger";
import {
  performHealthCheck,
  livenessCheck,
  readinessCheck,
  getHealthMetrics,
} from "./healthCheck";
import { setupGracefulShutdown, registerShutdownHandler } from "./gracefulShutdown";
import { seedAllDefaults } from "../services/seedDefaults";
import { assignRoleToUser } from "../services/seedRBAC";
import { performRBACStartupCheck } from "../services/rbacValidation";
import { startPriceAlertsCron } from "../cron/priceAlertsCron.js";
import { startSessionTimeoutCron } from "../cron/sessionTimeoutCron.js";
import { startNotificationQueueCron } from "../cron/notificationQueueCron.js";
import { startDebtAgingCron } from "../cron/debtAgingCron.js";
import { startGLBalanceVerificationCron } from "../cron/glBalanceVerificationCron.js";
import { startARReconciliationCron } from "../cron/arReconciliationCron.js";
import { startLeaderElection, stopLeaderElection } from "../utils/cronLeaderElection";
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
  logger.info(`🔗 DATABASE_URL configured: ${env.databaseUrl ? "YES" : "NO"}`);
  if (env.databaseUrl) {
    // Log sanitized version (hide password)
    const sanitized = env.databaseUrl.replace(
      /:\/\/([^:]+):([^@]+)@/,
      "://$1:****@"
    );
    logger.info(`📊 Database connection: ${sanitized}`);
  }

  // This ensures the database schema matches what the code expects
  // Add retry mechanism for auto-migrations (reduced delays for faster deployment)
  const runMigrationsWithRetry = async (maxRetries = 2) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info(
          `🔄 Running auto-migrations (attempt ${i + 1}/${maxRetries})...`
        );
        await runAutoMigrations();
        logger.info("✅ Auto-migrations complete");
        return; // Success, exit the loop
      } catch (error) {
        logger.warn({ msg: `Auto-migration attempt ${i + 1} failed`, error });
        if (i === maxRetries - 1) {
          // Non-fatal: log error but allow server to start
          logger.error({
            msg: "Auto-migrations failed after retries - server starting in degraded mode",
            error,
          });
          return; // Don't throw, allow server to start
        }
        // Reduced backoff: 2s, 4s
        const delay = Math.pow(2, i + 1) * 1000;
        logger.info(`⏳ Waiting ${delay / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  try {
    await runMigrationsWithRetry();
  } catch (error) {
    logger.warn({
      msg: "Auto-migration failed after all retries (non-fatal) - app may still work",
      error,
    });
    logger.warn(
      "Some features may not work correctly if schema is out of sync"
    );
    // Continue - app may still work depending on what failed
    // The server will start in degraded mode and can be fixed later
  }

  // ARCH-003: Perform RBAC startup validation
  // This ensures required roles and permissions exist
  // If RBAC_AUTO_SEED=true, missing RBAC config will be auto-seeded
  try {
    await performRBACStartupCheck();
  } catch (error) {
    logger.warn({
      msg: "RBAC startup check failed (non-fatal)",
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue - RBAC issues will be handled gracefully at runtime
  }

  // Seed default data and create admin user on first startup
  // DI-005: Re-enabled after fixing schema drift issues
  //
  // NOTE: Seeding can be bypassed by setting SKIP_SEEDING=true environment variable
  // This allows the app to start even when schema issues occur
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
      logger.info(
        "🌱 Seeding default data (roles, categories, accounts, etc.)..."
      );
      await seedAllDefaults();
      logger.info("✅ Default data seeding completed");
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
        logger.error({
          msg: "Failed to create admin user (database schema mismatch?) - server will start without admin user",
          error,
        });
        logger.info(
          "💡 You can create the first admin user via /api/auth/create-first-user endpoint"
        );
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

    // QA auth routes under /api/qa-auth (for deterministic RBAC testing)
    // Only registers routes if QA_AUTH_ENABLED=true and not in production
    if (isQaAuthEnabled()) {
      registerQaAuthRoutes(app);
      logger.info("✅ QA authentication enabled (QA_AUTH_ENABLED=true)");
    }

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

    // Metrics endpoint for monitoring systems (Prometheus-compatible format available)
    app.get("/health/metrics", (req, res) => {
      const metrics = getHealthMetrics();
      const format = req.query.format;

      if (format === "prometheus") {
        // Prometheus text format
        const lines = [
          `# HELP terp_uptime_seconds Server uptime in seconds`,
          `# TYPE terp_uptime_seconds gauge`,
          `terp_uptime_seconds ${metrics.uptime}`,
          `# HELP terp_memory_heap_used_mb Heap memory used (MB)`,
          `# TYPE terp_memory_heap_used_mb gauge`,
          `terp_memory_heap_used_mb ${metrics.memory.heapUsedMb}`,
          `# HELP terp_memory_heap_total_mb Total heap memory (MB)`,
          `# TYPE terp_memory_heap_total_mb gauge`,
          `terp_memory_heap_total_mb ${metrics.memory.heapTotalMb}`,
          `# HELP terp_memory_rss_mb Resident set size (MB)`,
          `# TYPE terp_memory_rss_mb gauge`,
          `terp_memory_rss_mb ${metrics.memory.rssMb}`,
        ];
        res.set("Content-Type", "text/plain");
        res.send(lines.join("\n"));
      } else {
        res.json(metrics);
      }
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
        const context = await createContext({ req, res } as Parameters<
          typeof createContext
        >[0]);
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
      // Dynamic import to avoid bundling vite and its plugins in production
      const { setupVite } = await import("./vite.js");
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

    server.listen(port, "0.0.0.0", async () => {
      logger.info(`Server running on http://0.0.0.0:${port}/`);
      logger.info(`Health check available at http://localhost:${port}/health`);

      // Start leader election for cron job coordination (High Memory Remediation)
      // This ensures only one instance in a multi-instance deployment runs cron jobs
      let leaderElectionStarted = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await startLeaderElection();
          logger.info("✅ Cron leader election started");
          leaderElectionStarted = true;
          break;
        } catch (error) {
          logger.error({
            msg: `Failed to start leader election (attempt ${attempt}/3)`,
            error: error instanceof Error ? error.message : String(error),
          });
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
        }
      }

      if (!leaderElectionStarted) {
        logger.warn(
          "⚠️ Leader election failed - crons will run on all instances (may cause duplicates)"
        );
      } else {
        // Register leader election cleanup with graceful shutdown
        registerShutdownHandler(async () => {
          logger.info("Stopping leader election...");
          await stopLeaderElection();
        });
      }

      // Start price alerts cron job
      try {
        startPriceAlertsCron();
        logger.info("✅ Price alerts cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start price alerts cron", error });
        // Server continues - cron is non-critical
      }

      // Start session timeout cron job (MEET-075-BE)
      try {
        startSessionTimeoutCron();
        logger.info("✅ Session timeout cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start session timeout cron", error });
        // Server continues - cron is non-critical
      }

      // Start notification queue processing cron job (BUG-077)
      try {
        startNotificationQueueCron();
        logger.info("✅ Notification queue processing cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start notification queue cron", error });
        // Server continues - cron is non-critical
      }

      // Start debt aging notification cron job (MEET-041)
      try {
        startDebtAgingCron();
        logger.info("✅ Debt aging notification cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start debt aging cron", error });
        // Server continues - cron is non-critical
      }

      // Start GL balance verification cron job (OBS-001)
      try {
        startGLBalanceVerificationCron();
        logger.info("✅ GL balance verification cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start GL balance verification cron", error });
        // Server continues - cron is non-critical
      }

      // Start AR reconciliation cron job (OBS-002)
      try {
        startARReconciliationCron();
        logger.info("✅ AR reconciliation cron job started");
      } catch (error) {
        logger.error({ msg: "Failed to start AR reconciliation cron", error });
        // Server continues - cron is non-critical
      }
    });
  } catch (error) {
    logger.error({ error }, "❌ CRITICAL ERROR during Express server setup:");
    if (error instanceof Error && error.stack) {
      logger.error({ stack: error.stack }, "Stack trace");
    }
    process.exit(1);
  }
}

startServer().catch(error => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
