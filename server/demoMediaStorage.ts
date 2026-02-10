import type { Request } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { demoMediaBlobs } from "../drizzle/schema";
import { getDb } from "./db";

const DEMO_MEDIA_PATH_PREFIX = "/api/media";
const DEMO_MEDIA_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export type DemoMediaBlobRecord = {
  id: string;
  fileName: string;
  contentType: string;
  bytes: Buffer;
  fileSize: number;
  createdAt: Date;
};

type CreateDemoMediaBlobInput = {
  fileName: string;
  contentType: string;
  bytes: Buffer;
  uploadedBy?: number | null;
  batchId?: number | null;
};

export async function createDemoMediaBlob(
  input: CreateDemoMediaBlobInput
): Promise<{ id: string }> {
  const db = await getDb();
  const id = randomBytes(16).toString("hex");

  await db.insert(demoMediaBlobs).values({
    id,
    fileName: input.fileName.slice(0, 255),
    contentType: input.contentType.slice(0, 128),
    bytesBase64: input.bytes.toString("base64"),
    fileSize: input.bytes.length,
    uploadedBy:
      input.uploadedBy && input.uploadedBy > 0 ? input.uploadedBy : null,
    batchId: input.batchId ?? null,
  });

  return { id };
}

export async function getDemoMediaBlobById(
  id: string
): Promise<DemoMediaBlobRecord | null> {
  if (!DEMO_MEDIA_ID_PATTERN.test(id)) {
    return null;
  }

  const db = await getDb();
  const [row] = await db
    .select({
      id: demoMediaBlobs.id,
      fileName: demoMediaBlobs.fileName,
      contentType: demoMediaBlobs.contentType,
      bytesBase64: demoMediaBlobs.bytesBase64,
      fileSize: demoMediaBlobs.fileSize,
      createdAt: demoMediaBlobs.createdAt,
    })
    .from(demoMediaBlobs)
    .where(and(eq(demoMediaBlobs.id, id), isNull(demoMediaBlobs.deletedAt)))
    .limit(1);

  if (!row || !row.bytesBase64) {
    return null;
  }

  return {
    id: row.id,
    fileName: row.fileName,
    contentType: row.contentType,
    bytes: Buffer.from(row.bytesBase64, "base64"),
    fileSize: row.fileSize,
    createdAt: row.createdAt,
  };
}

export async function deleteDemoMediaBlob(id: string): Promise<boolean> {
  if (!DEMO_MEDIA_ID_PATTERN.test(id)) {
    return false;
  }

  const db = await getDb();
  await db.delete(demoMediaBlobs).where(eq(demoMediaBlobs.id, id));
  return true;
}

export function buildDemoMediaUrl(req: Request, id: string): string {
  const forwardedProtoHeader = req.headers["x-forwarded-proto"];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "https";

  const forwardedHostHeader = req.headers["x-forwarded-host"];
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host") || "localhost:3000";

  return `${protocol}://${host}${DEMO_MEDIA_PATH_PREFIX}/${id}`;
}

export function extractDemoMediaBlobIdFromUrl(urlOrPath: string): string | null {
  try {
    const parsed = new URL(urlOrPath, "http://local");
    const match = parsed.pathname.match(
      new RegExp(`^${DEMO_MEDIA_PATH_PREFIX}/([a-zA-Z0-9_-]{8,64})$`)
    );
    if (!match?.[1]) {
      return null;
    }
    return match[1];
  } catch {
    return null;
  }
}
