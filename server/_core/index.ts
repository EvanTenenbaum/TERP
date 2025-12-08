
import "dotenv/config";
// Global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerSimpleAuthRoutes } from "./simpleAuth";
import { appRouter } from "../../routers";
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
import { seedAllDefaults } from "../../services/seedDefaults"; // TEMPORARILY DISABLED
import { assignRoleToUser } from "../../services/seedRBAC";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail } from "../../db";
import { runAutoMigrations } from "../../autoMigrate";
import { createConnection } from "mysql2/promise";

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

  // Database Configuration
  let dbHost = process.env.DB_HOST || "localhost";
  let dbUser = process.env.DB_USER || "root";
  let dbPassword = process.env.DB_PASSWORD || "";
  let dbName = process.env.DB_NAME || "test";
  let dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      dbHost = url.hostname;
      dbUser = url.username;
      dbPassword = url.password;
      dbName = url.pathname.substring(1); // Remove the leading slash
      dbPort = parseInt(url.port, 10) || 3306;

      logger.info("Using DATABASE_URL configuration.");
    } catch (urlError) {
      logger.error({ msg: "Error parsing DATABASE_URL", error: urlError });
    }
  }

  logger.info({
    msg: "Attempting database connection",
    host: dbHost,
    user: dbUser,
    database: dbName,
    port: dbPort,
  });

  let connection;
  try {
    connection = await createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });
    logger.info("✅ Database connection successful");
  } catch (dbError: any) {
    logger.error({
      msg: "❌ Error during database connection",
      error: dbError,
      dbHost,
      dbUser,
      dbName,
      dbPort,
      errorMessage: dbError.message,
      errorCode: dbError.code,
      errorNumber: dbError.errno,
      stack: dbError.stack,
    });
    process.exit(1);
    return; // Ensure function exits after exiting process
  }


  // Run auto-migrations to fix schema drift (adds missing columns/tables)
  // This ensures the database schema matches what the code expects
  try {
    logger.info("🔄 Running auto-migrations to sync database schema...");
    await runAutoMigrations();
    logger.info("✅ Auto-migrations complete");
  } catch (error) {
    logger.warn({ msg: "Auto-migration failed (non-fatal)", error });
    // Continue - app may still work depending on what failed
  }

  // Seed default data and create admin user on first startup
  // TEMPORARILY DISABLED: Schema mismatch causing crashes on Railway
  // TODO: Fix schema drift and re-enable seeding
  //
  // NOTE: Seeding can be bypassed by setting SKIP_SEEDING=true environment variable
  // This allows the app to start even when schema drift prevents seeding
  try {
    if (
      process.env.SKIP_SEEDING === "true" ||
      process.env.SKIP_SEEDING === "1"
    ) {
      logger.info(
        "⏭️  SKIP_SEEDING is set - skipping all default data seeding"
      );
      logger.info(
        "💡 To enable seeding: remove SKIP_SEEDING or set it to false"
      );
    } else {
      logger.info("Checking for default data and admin user...");
      await seedAllDefaults(); // Currently disabled due to schema drift
    }

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
          logger.info(
            `Super Admin role assigned to ${env.initialAdminUsername}`
          );
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


  const app = express();

  // Trust Proxy
  app.set("trust proxy", 1);

  // Apply rate limiters
  app.use("/api/", apiLimiter); // Rate limit all /api routes
  app.use("/api/auth/", authLimiter); // Rate limit /api/auth routes

  // Log all requests
  app.use(requestLogger);

  app.use(cookieParser()); // Parse cookies

  // Health check endpoints
  app.get("/healthz", performHealthCheck); // Full health check
  app.get("/livez", livenessCheck); // Liveness probe
  app.get("/readyz", readinessCheck); // Readiness probe

  // Register simple auth routes (login, logout, register)
  registerSimpleAuthRoutes(app);

  // trpc handler
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: setupErrorHandler,
    })
  );

  // Serve static assets
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app);
  }

  // Error handling middleware (must be defined after all routes)
  setupErrorHandler(app);

  // Find an available port
  const port = parseInt(process.env.PORT || "3000", 10);
  const actualPort = await findAvailablePort(port);

  // Create HTTP server
  const server = createServer(app);

  // Set up graceful shutdown
  setupGracefulShutdown(server);

  // Start listening on the available port
  server.listen(actualPort, () => {
    logger.info(`Server listening at http://localhost:${actualPort}`);
  });
}

startServer();
