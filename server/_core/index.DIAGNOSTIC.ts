
import "dotenv/config";
import { logger } from "./logger";

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
import { createConnection } from "mysql2/promise";
import http from 'http';

async function startServer() {
  logger.info("🔍 DIAGNOSTIC MODE ACTIVE");

  try {
    // Phase 1: Import statements
    logger.info("Phase 1: Import statements completed");

    // Phase 2: Database connection
    logger.info("Phase 2: Before Database connection");
    const dbHost = process.env.DB_HOST || "localhost";
    const dbUser = process.env.DB_USER || "root";
    const dbPassword = process.env.DB_PASSWORD || "";
    const dbName = process.env.DB_NAME || "test";
    const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
    await createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });
    logger.info("Phase 2: Database connection successful");

    // Phase 3: Express app creation
    logger.info("Phase 3: Before Express app creation");
    const app = express();
    logger.info("Phase 3: Express app creation completed");

    // Phase 4: Basic health route
    logger.info("Phase 4: Before Health Route");
    app.get("/health", (req, res) => {
      res.status(200).send("OK");
    });
    logger.info("Phase 4: Health Route completed");

    // Phase 5: server.listen()
    logger.info("Phase 5: Before server.listen()");

    const port = parseInt(process.env.PORT || "8080", 10);
    const server = http.createServer(app);

    server.listen(port, () => {
      logger.info(`Server running on http://0.0.0.0:${port}/`);
    });
    logger.info("Phase 5: server.listen() completed");

  } catch (error) {
    console.error("❌ Error during startup:", error);
    console.error("Stack:", (error as Error).stack);
    process.exit(1);
  }
}

startServer();
