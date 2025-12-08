
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
import { createConnection } from "mysql2/promise";
import { logger } from "./logger";
import http from 'http';

async function startServer() {
  console.log("🔍 DIAGNOSTIC MODE ACTIVE");

  try {
    // Phase 1: Import statements
    console.log("Phase 1: Before Import statements");
    console.log("Phase 1: After Import statements");

    // Phase 2: Database connection
    console.log("Phase 2: Before Database connection");
    const dbHost = process.env.DB_HOST || "localhost";
    const dbUser = process.env.DB_USER || "root";
    const dbPassword = process.env.DB_PASSWORD || "";
    const dbName = process.env.DB_NAME || "test";
    const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
    const connection = await createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
    });
    console.log("✅ Database connection successful");
    console.log("Phase 2: After Database connection");

    // Phase 3: Express app creation
    console.log("Phase 3: Before Express app creation");
    const app = express();
    console.log("Phase 3: After Express app creation");

    // Phase 4: Basic health route
    console.log("Phase 4: Before Health Route");
    app.get("/health", (req, res) => {
      res.status(200).send("OK");
    });
    console.log("Phase 4: After Health Route");

    // Phase 5: server.listen()
    console.log("Phase 5: Before server.listen()");

    const port = parseInt(process.env.PORT || "8080", 10);
    const server = http.createServer(app);

    server.listen(port, () => {
      console.log(`Server running on http://0.0.0.0:${port}/`);
    });
    console.log("Phase 5: After server.listen()");

  } catch (error) {
    console.error("❌ Error during startup:", error);
    console.error("Stack:", (error as any).stack);
    process.exit(1);
  }
}

startServer();
