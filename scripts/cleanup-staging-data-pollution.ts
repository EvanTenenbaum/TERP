#!/usr/bin/env tsx

import mysql from "mysql2/promise";
import { loadAuditEnv } from "./_lib/loadAuditEnv";

const applyChanges = process.argv.includes("--write");

// The polluted comprehensive-seed calendar batch was inserted in the server's
// local timezone, so we match against the stored local timestamp rendering
// instead of the UTC-converted value returned by the driver.
const pollutingCalendarSeedLocalStart = "2026-02-22 21:39:16";
const pollutingCalendarSeedLocalEnd = "2026-02-22 21:39:20";

const clientNamePatterns = [
  "Stage Quick Add%",
  "Test Client %",
  "QA Chain Test Client %",
  "QA Write-Path Client %",
  "QA Concurrent Test Client %",
] as const;

function buildMysqlPoolFromDatabaseUrl(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);
  const sslMode = parsedUrl.searchParams.get("ssl-mode");
  parsedUrl.searchParams.delete("ssl-mode");
  parsedUrl.searchParams.delete("ssl");

  return mysql.createPool({
    uri: parsedUrl.toString(),
    waitForConnections: true,
    connectionLimit: 2,
    ssl:
      sslMode?.toUpperCase() === "REQUIRED"
        ? { rejectUnauthorized: false }
        : undefined,
  });
}

async function main() {
  const { loadedFrom } = loadAuditEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for staging cleanup.");
  }

  const pool = buildMysqlPoolFromDatabaseUrl(process.env.DATABASE_URL);
  const connection = await pool.getConnection();

  try {
    const [calendarRows] = await connection.query<
      Array<{ id: number; title: string; created_at: string }>
    >(
      `select id, title, created_at
       from calendar_events
       where deleted_at is null
         and (
           title like 'QA Chain Event%'
           or (
             date_format(created_at, '%Y-%m-%d %H:%i:%s') between ? and ?
             and title regexp '^(MEETING|DELIVERY|TASK|PAYMENT DUE|FOLLOW UP|INTAKE|AR COLLECTION|AP PAYMENT) - '
           )
         )
       order by created_at asc`,
      [pollutingCalendarSeedLocalStart, pollutingCalendarSeedLocalEnd]
    );

    const patternClause = clientNamePatterns
      .map(() => "name like ?")
      .join(" or ");

    const [clientRows] = await connection.query<
      Array<{ id: number; name: string; created_at: string }>
    >(
      `select id, name, created_at
       from clients
       where deleted_at is null
         and (${patternClause})
       order by created_at asc`,
      [...clientNamePatterns]
    );

    const clientIds = clientRows.map(row => row.id);
    const [orderRows] =
      clientIds.length === 0
        ? [[]]
        : await connection.query<
            Array<{ id: number; order_number: string; client_id: number }>
          >(
            `select id, order_number, client_id
             from orders
             where deleted_at is null
               and client_id in (${clientIds.map(() => "?").join(", ")})
             order by created_at asc`,
            clientIds
          );

    console.info(
      JSON.stringify(
        {
          mode: applyChanges ? "write" : "dry-run",
          loadedEnvFrom: loadedFrom,
          calendarEventCount: calendarRows.length,
          calendarEvents: calendarRows,
          clientCount: clientRows.length,
          clients: clientRows,
          orderCount: Array.isArray(orderRows) ? orderRows.length : 0,
          orders: Array.isArray(orderRows) ? orderRows : [],
        },
        null,
        2
      )
    );

    if (!applyChanges) {
      return;
    }

    if (calendarRows.length > 0) {
      const calendarIds = calendarRows.map(row => row.id);
      await connection.query(
        `update calendar_events
         set deleted_at = now(), updated_at = now()
         where id in (${calendarIds.map(() => "?").join(", ")})
           and deleted_at is null`,
        calendarIds
      );
    }

    if (Array.isArray(orderRows) && orderRows.length > 0) {
      const orderIds = orderRows.map(row => row.id);
      await connection.query(
        `update orders
         set deleted_at = now(), updated_at = now()
         where id in (${orderIds.map(() => "?").join(", ")})
           and deleted_at is null`,
        orderIds
      );
    }

    if (clientRows.length > 0) {
      await connection.query(
        `update clients
         set deleted_at = now(), updated_at = now()
         where id in (${clientIds.map(() => "?").join(", ")})
           and deleted_at is null`,
        clientIds
      );
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(
    "[cleanup-staging-data-pollution] Failed:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
