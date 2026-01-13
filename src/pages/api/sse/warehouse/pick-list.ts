/**
 * SSE API Route for Warehouse Pick List
 * Provides real-time updates for warehouse staff during live shopping sessions
 * MEET-075-BE: Warehouse pick list real-time updates
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { warehouseEventManager } from "../../../../../server/services/live-shopping/sessionPickListService";
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

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`);

  // Create listener for warehouse events
  const listener = (event: { type: string; data: unknown }) => {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    } catch (error) {
      console.error("[Warehouse SSE] Error sending event:", error);
    }
  };

  // Subscribe to warehouse events
  warehouseEventManager.subscribe(listener);

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
    warehouseEventManager.unsubscribe(listener);
    console.log("[Warehouse SSE] Client disconnected");
  });

  // Handle errors
  req.on("error", (error) => {
    console.error("[Warehouse SSE] Request error:", error);
    clearInterval(heartbeat);
    warehouseEventManager.unsubscribe(listener);
  });
}
