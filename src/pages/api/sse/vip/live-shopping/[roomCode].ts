import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../../../server/db";
import { vipPortalAuth } from "../../../../../drizzle/schema";
import { liveShoppingSessions } from "../../../../../drizzle/schema-live-shopping";
import { eq, and, gte } from "drizzle-orm";
import { sessionEventManager } from "../../../../../server/lib/sse/sessionEventManager";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * VIP Live Shopping SSE Endpoint
 * Allows VIP clients to subscribe to session updates.
 *
 * Authentication: Expects 'token' in query string (since EventSource doesn't support custom headers easily)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for SSE
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const { roomCode, token } = req.query;

  if (!roomCode || typeof roomCode !== "string") {
    return res.status(400).json({ error: "Missing room code" });
  }

  if (!token || typeof token !== "string") {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  // 1. Verify Database Connection
  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database unavailable" });
  }

  // 2. Authenticate Client
  // We manually verify the token here since this is an API route, not tRPC
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
  sessionEventManager.addListener(session.id, handleEvent);

  // 7. Cleanup on Close
  req.on("close", () => {
    clearInterval(heartbeat);
    sessionEventManager.removeListener(session.id, handleEvent);
    console.log(`[VIP SSE] Client disconnected from session ${session.id}`);
  });

  // Handle errors
  req.on("error", (error) => {
    console.error("[VIP SSE] Request error:", error);
    clearInterval(heartbeat);
    sessionEventManager.removeListener(session.id, handleEvent);
  });
}
