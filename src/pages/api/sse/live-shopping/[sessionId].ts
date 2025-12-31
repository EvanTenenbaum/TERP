/**
 * SSE API Route for Live Shopping Sessions
 * Provides real-time updates for cart changes, price updates, and session status
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { sessionEventManager } from "../../../../../server/lib/sse/sessionEventManager";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET for SSE
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  // Authenticate the request
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Get session ID from URL
  const { sessionId } = req.query;
  const sessionIdNum = parseInt(sessionId as string, 10);

  if (isNaN(sessionIdNum)) {
    return res.status(400).json({ error: "Invalid session ID" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", sessionId: sessionIdNum })}\n\n`);

  // Create listener for this session
  const listener = (event: { type: string; data: any }) => {
    try {
      // Format as SSE event with named event type
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    } catch (error) {
      console.error("[SSE] Error sending event:", error);
    }
  };

  // Subscribe to session events
  sessionEventManager.subscribe(sessionIdNum, listener);

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      // Connection closed
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    sessionEventManager.unsubscribe(sessionIdNum, listener);
    console.log(`[SSE] Client disconnected from session ${sessionIdNum}`);
  });

  // Handle errors
  req.on("error", (error) => {
    console.error("[SSE] Request error:", error);
    clearInterval(heartbeat);
    sessionEventManager.unsubscribe(sessionIdNum, listener);
  });
}
