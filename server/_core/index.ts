
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

    // Log database environment variables
    console.log("Database Environment Variables:");
    console.log(`DB_HOST: ${process.env.DB_HOST}`);
    console.log(`DB_USER: ${process.env.DB_USER}`);
    console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '********' : ''}`);
    console.log(`DB_NAME: ${process.env.DB_NAME}`);
    console.log(`DB_PORT: ${process.env.DB_PORT}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? (process.env.DATABASE_URL.includes(':') ? process.env.DATABASE_URL.substring(0, process.env.DATABASE_URL.indexOf(':')) + ':********' + process.env.DATABASE_URL.substring(process.env.DATABASE_URL.lastIndexOf('@')) : '********') : ''}`);

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

        console.log("Using DATABASE_URL configuration.");
      } catch (urlError) {
        console.error("Error parsing DATABASE_URL:", urlError);
      }
    }

    console.log("Attempting database connection with:");
    console.log(`Host: ${dbHost}`);
    console.log(`User: ${dbUser}`);
    console.log(`Database: ${dbName}`);
    console.log(`Port: ${dbPort}`);

    let connection;
    try {
      connection = await createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        port: dbPort,
      });
      console.log("✅ Database connection successful");
      console.log("Phase 2: After Database connection");
    } catch (dbError: any) {
      console.error("❌ Error during database connection:", dbError);
      console.error("Error Message:", dbError.message);
      console.error("Error Code:", dbError.code);
      console.error("Error Number:", dbError.errno);
      console.error("Stack:", dbError.stack);
      process.exit(1);
    }

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

  } catch (error: any) {
    console.error("❌ Error during startup:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

startServer();
