/**
 * Safe Batch Image Seeder (PRODUCTION SAFE)
 *
 * Goal:
 * - Fill in missing batch images in `product_images` WITHOUT deleting anything.
 * - Only seeds batches that have ZERO existing `product_images` rows (idempotent).
 * - Sources images from:
 *   1) batch.metadata.mediaFiles (preferred)
 *   2) productMedia (fallback)
 *
 * Safety defaults:
 * - Dry-run by default (no writes)
 * - Requires `--write` to insert records
 * - Does NOT auto-load `.env.production`
 *
 * Usage:
 *   npx tsx scripts/seed/seeders/seed-batch-images-safe.ts --env-file .env.production
 *   npx tsx scripts/seed/seeders/seed-batch-images-safe.ts --env-file .env.production --write --limit 200
 */

import { config } from "dotenv";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { batches, productImages, productMedia, users } from "../../../drizzle/schema";

type Flags = {
  envFile?: string;
  write: boolean;
  limit: number;
  verbose: boolean;
};

function parseArgs(argv: string[]): Flags {
  const flags: Flags = {
    envFile: undefined,
    write: false,
    limit: 500,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--write") flags.write = true;
    else if (arg === "--verbose") flags.verbose = true;
    else if (arg === "--help" || arg === "-h") {
      // eslint-disable-next-line no-console
      console.log(`
Safe Batch Image Seeder

Flags:
  --env-file <path>   Load env vars from a specific file (recommended)
  --write             Actually insert records (default: dry-run)
  --limit <n>         Max number of batches to process (default: 500)
  --verbose           Print per-batch details

Examples:
  npx tsx scripts/seed/seeders/seed-batch-images-safe.ts --env-file .env.production
  npx tsx scripts/seed/seeders/seed-batch-images-safe.ts --env-file .env.production --write --limit 200
`);
      process.exit(0);
    } else if (arg === "--env-file" && argv[i + 1]) {
      flags.envFile = argv[i + 1];
      i++;
    } else if (arg.startsWith("--env-file=")) {
      flags.envFile = arg.split("=", 2)[1];
    } else if (arg === "--limit" && argv[i + 1]) {
      flags.limit = Number(argv[i + 1]);
      i++;
    } else if (arg.startsWith("--limit=")) {
      flags.limit = Number(arg.split("=", 2)[1]);
    }
  }

  if (!Number.isFinite(flags.limit) || flags.limit < 1) {
    throw new Error("--limit must be a positive number");
  }

  return flags;
}

function parseBatchMetadata(metadata: unknown): {
  mediaFiles?: Array<{ url?: unknown; fileName?: unknown }>;
} {
  if (!metadata) return {};

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof metadata === "object") {
    return metadata as Record<string, unknown>;
  }

  return {};
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function needsSsl(databaseUrl: string): boolean {
  return (
    databaseUrl.includes("digitalocean.com") ||
    databaseUrl.toLowerCase().includes("ssl=") ||
    databaseUrl.toLowerCase().includes("ssl-mode=required") ||
    databaseUrl.toLowerCase().includes("sslmode=require")
  );
}

function stripSslParams(databaseUrl: string): string {
  let clean = databaseUrl
    .replace(/[?&]ssl=[^&]*/gi, "")
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "");

  if (!clean.includes("?") && clean.includes("&")) {
    clean = clean.replace("&", "?");
  }
  clean = clean.replace(/\?&/, "?");
  return clean;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.envFile) {
    config({ path: flags.envFile });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Provide it via environment variables or pass --env-file <path>."
    );
  }

  const pool = mysql.createPool({
    uri: stripSslParams(databaseUrl),
    waitForConnections: true,
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 60_000,
    queueLimit: 0,
    connectTimeout: 30_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    ssl: needsSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = drizzle(pool as any, { schema: { batches, productImages, productMedia, users }, mode: "default" });

  // eslint-disable-next-line no-console
  console.log("Safe Batch Image Seeder");
  // eslint-disable-next-line no-console
  console.log(`Mode: ${flags.write ? "WRITE" : "DRY-RUN"}`);
  // eslint-disable-next-line no-console
  console.log(`Limit: ${flags.limit}`);
  // eslint-disable-next-line no-console
  console.log("");

  const [systemUser] = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(users.id)
    .limit(1);

  const uploadedBy = systemUser?.id ?? null;

  // Candidate batches: no existing product_images rows at all.
  const candidates = await db
    .select({
      batchId: batches.id,
      productId: batches.productId,
      metadata: batches.metadata,
    })
    .from(batches)
    .leftJoin(productImages, eq(productImages.batchId, batches.id))
    .where(and(isNull(batches.deletedAt), isNull(productImages.id)))
    .orderBy(desc(batches.id))
    .limit(flags.limit);

  const candidateBatchCount = candidates.length;
  if (candidateBatchCount === 0) {
    // eslint-disable-next-line no-console
    console.log("No batches found with zero product_images rows. Nothing to do.");
    await pool.end();
    return;
  }

  const productIds = Array.from(
    new Set(
      candidates
        .map(c => c.productId)
        .filter((id): id is number => typeof id === "number")
    )
  );

  const productFallbackImageMap = new Map<number, string>();
  if (productIds.length > 0) {
    const rows = await db
      .select({
        productId: productMedia.productId,
        url: productMedia.url,
      })
      .from(productMedia)
      .where(
        and(
          inArray(productMedia.productId, productIds),
          eq(productMedia.type, "image"),
          isNull(productMedia.deletedAt)
        )
      )
      .orderBy(productMedia.productId, productMedia.id);

    for (const row of rows) {
      if (!productFallbackImageMap.has(row.productId)) {
        productFallbackImageMap.set(row.productId, row.url);
      }
    }
  }

  let batchesWithMetadata = 0;
  let batchesWithProductFallback = 0;
  let batchesWithNoSource = 0;
  let rowsToInsert = 0;

  const inserts: Array<{
    batchId: number;
    productId: number | null;
    imageUrl: string;
    caption: string | null;
    isPrimary: boolean;
    sortOrder: number;
    status: "APPROVED";
    uploadedBy: number | null;
    uploadedAt: Date;
  }> = [];

  for (const c of candidates) {
    const meta = parseBatchMetadata(c.metadata);
    const mediaFilesRaw = Array.isArray(meta.mediaFiles) ? meta.mediaFiles : [];

    const mediaFiles = mediaFilesRaw
      .map(m => ({
        url: m?.url,
        fileName: m?.fileName,
      }))
      .filter(m => isNonEmptyString(m.url))
      .map(m => ({
        url: (m.url as string).trim(),
        fileName: isNonEmptyString(m.fileName) ? (m.fileName as string).trim() : undefined,
      }));

    let source: "metadata" | "productMedia" | "none" = "none";
    let urls: Array<{ url: string; caption?: string }> = [];

    if (mediaFiles.length > 0) {
      source = "metadata";
      urls = mediaFiles.map(m => ({ url: m.url, caption: m.fileName }));
    } else if (typeof c.productId === "number" && productFallbackImageMap.has(c.productId)) {
      source = "productMedia";
      urls = [{ url: productFallbackImageMap.get(c.productId) as string }];
    }

    if (source === "metadata") batchesWithMetadata++;
    else if (source === "productMedia") batchesWithProductFallback++;
    else batchesWithNoSource++;

    if (source === "none") {
      if (flags.verbose) {
        // eslint-disable-next-line no-console
        console.log(`[SKIP] batchId=${c.batchId} (no metadata.mediaFiles, no productMedia image)`);
      }
      continue;
    }

    // Cap how many images we seed per batch to avoid accidental huge inserts.
    const capped = urls.slice(0, 10);
    rowsToInsert += capped.length;

    capped.forEach((u, idx) => {
      inserts.push({
        batchId: c.batchId,
        productId: typeof c.productId === "number" ? c.productId : null,
        imageUrl: u.url,
        caption: u.caption ? u.caption.slice(0, 255) : null,
        isPrimary: idx === 0,
        sortOrder: idx,
        status: "APPROVED",
        uploadedBy,
        uploadedAt: new Date(),
      });
    });

    if (flags.verbose) {
      // eslint-disable-next-line no-console
      console.log(
        `[PLAN] batchId=${c.batchId} source=${source} images=${capped.length} primary=${capped[0]?.url}`
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log("Summary");
  // eslint-disable-next-line no-console
  console.log(`- Candidate batches (0 product_images): ${candidateBatchCount}`);
  // eslint-disable-next-line no-console
  console.log(`- Seed source metadata.mediaFiles: ${batchesWithMetadata}`);
  // eslint-disable-next-line no-console
  console.log(`- Seed source productMedia fallback: ${batchesWithProductFallback}`);
  // eslint-disable-next-line no-console
  console.log(`- No seed source (skipped): ${batchesWithNoSource}`);
  // eslint-disable-next-line no-console
  console.log(`- product_images rows to insert: ${rowsToInsert}`);
  // eslint-disable-next-line no-console
  console.log("");

  if (!flags.write) {
    // eslint-disable-next-line no-console
    console.log("Dry-run complete. Re-run with --write to apply inserts.");
    await pool.end();
    return;
  }

  if (inserts.length === 0) {
    // eslint-disable-next-line no-console
    console.log("Nothing to insert (no candidates had a usable image source).");
    await pool.end();
    return;
  }

  // Insert in chunks to avoid huge single statements.
  const CHUNK_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
    const chunk = inserts.slice(i, i + CHUNK_SIZE);
    await db.insert(productImages).values(chunk);
    inserted += chunk.length;
    // eslint-disable-next-line no-console
    console.log(`Inserted ${inserted}/${inserts.length}...`);
  }

  // eslint-disable-next-line no-console
  console.log("");
  // eslint-disable-next-line no-console
  console.log(`Done. Inserted ${inserted} product_images rows.`);

  await pool.end();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
