import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../../../server/db";
import { liveShoppingSessions } from "../../../../../drizzle/schema-live-shopping";
import { eq } from "drizzle-orm";
import { sessionEventManager } from "../../../../../server/lib/sse/sessionEventManager";
import { validateSseSession, invalidateSseSession } from "../auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * VIP Live Shopping SSE Endpoint
 * Allows VIP clients to subscribe to session updates.
 *
 * SEC-021 Fix: Authentication now uses short-lived SSE session IDs
 * instead of exposing actual tokens in URL query parameters.
 *
 * Flow:
 * 1. Client first calls /api/sse/vip/auth with token in POST body
 * 2. Server returns short-lived SSE session ID
 * 3. Client connects here with SSE session ID (not actual token)
 *
 * Authentication: Expects 'sseSessionId' in query string
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for SSE
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const { roomCode, sseSessionId } = req.query;

  if (!roomCode || typeof roomCode !== "string") {
    return res.status(400).json({ error: "Missing room code" });
  }

  if (!sseSessionId || typeof sseSessionId !== "string") {
    return res.status(401).json({ error: "Missing SSE session ID" });
  }

  // 1. Validate SSE Session ID
  const sseSession = validateSseSession(sseSessionId);
  if (!sseSession) {
    return res.status(401).json({ error: "Invalid or expired SSE session" });
  }

  // 2. Verify Database Connection
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database unavailable" });
  }

  // 3. Find Session and Verify it matches the SSE session
  const session = await db.query.liveShoppingSessions.findFirst({
    where: eq(liveShoppingSessions.roomCode, roomCode),
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Verify that the session matches what was authorized
  if (session.id !== sseSession.sessionId || session.clientId !== sseSession.clientId) {
    return res.status(403).json({ error: "Unauthorized for this session" });
  }

  // 4. Setup SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable buffering for Nginx/Vercel
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", sessionId: session.id })}\n\n`);

  // 5. Setup Heartbeat to prevent connection timeout (15 second interval)
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`); // SSE comment format for keep-alive
      if ((res as any).flush) (res as any).flush();
    } catch (error) {
      // Connection closed
      clearInterval(heartbeat);
    }
  }, 15000);

  // 6. Subscription Handler
  const handleEvent = (event: { type: string; data: any }) => {
    try {
      // Format as SSE event with named event type
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
      if ((res as any).flush) (res as any).flush();
    } catch (error) {
      console.error("[VIP SSE] Error sending event:", error);
    }
  };

  // Subscribe to the specific session channel
  sessionEventManager.subscribe(session.id, handleEvent);

  // 7. Cleanup on Close
  req.on("close", () => {
    clearInterval(heartbeat);
    sessionEventManager.unsubscribe(session.id, handleEvent);
    // Invalidate the SSE session ID to prevent reuse
    invalidateSseSession(sseSessionId);
    console.log(`[VIP SSE] Client disconnected from session ${session.id}`);
  });

  // Handle errors
  req.on("error", (error) => {
    console.error("[VIP SSE] Request error:", error);
    clearInterval(heartbeat);
    sessionEventManager.unsubscribe(session.id, handleEvent);
    // Invalidate the SSE session ID to prevent reuse
    invalidateSseSession(sseSessionId);
  });
}
