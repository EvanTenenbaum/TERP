import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../../../server/db";
import { vipPortalAuth } from "../../../../../drizzle/schema";
import { liveShoppingSessions } from "../../../../../drizzle/schema-live-shopping";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";

/**
 * SEC-021: VIP SSE Authentication Endpoint
 *
 * This endpoint exchanges a VIP session token for a short-lived SSE session ID.
 * This prevents exposing the actual authentication token in URL query parameters.
 *
 * Flow:
 * 1. Client POSTs { token, roomCode } to this endpoint
 * 2. Server validates token and room ownership
 * 3. Server generates short-lived SSE session ID (15-minute expiry)
 * 4. Client uses SSE session ID to connect to SSE endpoint
 *
 * Benefits:
 * - Actual auth token never appears in URLs or server logs
 * - SSE session IDs are short-lived and single-purpose
 * - Can be invalidated independently from main session
 */

// In-memory store for SSE session IDs (consider Redis for production scaling)
interface SseSession {
  clientId: number;
  sessionId: number;
  expiresAt: Date;
}

const sseSessions = new Map<string, SseSession>();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [sseSessionId, session] of sseSessions.entries()) {
    if (session.expiresAt < now) {
      sseSessions.delete(sseSessionId);
    }
  }
}, 5 * 60 * 1000);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { token, roomCode } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Missing authentication token" });
  }

  if (!roomCode || typeof roomCode !== "string") {
    return res.status(400).json({ error: "Missing room code" });
  }

  // 1. Verify Database Connection
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database unavailable" });
  }

  // 2. Authenticate Client
  const authRecord = await db.query.vipPortalAuth.findFirst({
    where: and(
      eq(vipPortalAuth.sessionToken, token),
      gte(vipPortalAuth.sessionExpiresAt, new Date())
    ),
  });

  if (!authRecord) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // 3. Find Session and Verify Ownership
  const session = await db.query.liveShoppingSessions.findFirst({
    where: eq(liveShoppingSessions.roomCode, roomCode),
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (session.clientId !== authRecord.clientId) {
    return res.status(403).json({ error: "Unauthorized for this session" });
  }

  // 4. Generate SSE Session ID
  const sseSessionId = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // 5. Store SSE Session
  sseSessions.set(sseSessionId, {
    clientId: authRecord.clientId,
    sessionId: session.id,
    expiresAt,
  });

  console.log(`[SSE Auth] Generated SSE session for client ${authRecord.clientId}, live session ${session.id}`);

  // 6. Return SSE Session ID
  return res.status(200).json({
    sseSessionId,
    sessionId: session.id,
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Helper function to validate SSE session ID
 * Used by the SSE endpoint to verify the connection
 */
export function validateSseSession(sseSessionId: string): SseSession | null {
  const session = sseSessions.get(sseSessionId);
  if (!session) {
    return null;
  }

  // Check expiry
  if (session.expiresAt < new Date()) {
    sseSessions.delete(sseSessionId);
    return null;
  }

  return session;
}

/**
 * Helper function to invalidate SSE session
 * Called when SSE connection closes
 */
export function invalidateSseSession(sseSessionId: string): void {
  sseSessions.delete(sseSessionId);
}
