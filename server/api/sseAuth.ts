import { Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { users, vipPortalAuth } from "../../drizzle/schema";
import { liveShoppingSessions } from "../../drizzle/schema-live-shopping";
import { eq, and, gt } from "drizzle-orm";
import * as jwt from "jsonwebtoken";

/**
 * Extended Request interface to hold auth info
 */
export interface AuthenticatedSseRequest extends Request {
  auth?: {
    type: "STAFF" | "VIP";
    userId?: number; // If Staff
    clientId?: number; // If VIP
    sessionId: number;
  };
  user?: {
    id: number;
    role: string;
  };
}

/**
 * SSE Authentication Middleware
 * Validates access to a Live Shopping SSE stream.
 * 
 * Supports:
 * 1. Staff: Via Authorization Bearer token (JWT) or upstream middleware
 * 2. VIP: Via x-vip-session-token header
 * 
 * Path expected: /api/sse/live-shopping/:sessionId
 * 
 * IMPORTANT: Listener cleanup must be handled by the route handler:
 * ```
 * req.on("close", () => {
 *   sessionEventManager.off(roomId, listener);
 * });
 * ```
 */
export async function sseAuthMiddleware(
  req: AuthenticatedSseRequest,
  res: Response,
  next: NextFunction
) {
  const { sessionId } = req.params;
  const parsedSessionId = parseInt(sessionId, 10);

  if (isNaN(parsedSessionId)) {
    res.status(400).json({ error: "Invalid Session ID" });
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Database unavailable" });
      return;
    }

    // 1. Fetch the Session to verify ownership
    const session = await db.query.liveShoppingSessions.findFirst({
      where: eq(liveShoppingSessions.id, parsedSessionId),
      columns: {
        id: true,
        hostUserId: true,
        clientId: true,
        status: true,
      }
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.status === 'ENDED' || session.status === 'CANCELLED') {
      res.status(403).json({ error: "Session is closed" });
      return;
    }

    // 2. Check for VIP Token (Header: x-vip-session-token)
    const vipToken = req.headers['x-vip-session-token'] as string;
    
    if (vipToken) {
      const now = new Date();
      const vipAuth = await db.query.vipPortalAuth.findFirst({
        where: and(
          eq(vipPortalAuth.sessionToken, vipToken),
          gt(vipPortalAuth.sessionExpiresAt, now)
        )
      });

      if (vipAuth && vipAuth.clientId === session.clientId) {
        req.auth = {
          type: "VIP",
          clientId: vipAuth.clientId,
          sessionId: parsedSessionId
        };
        console.log(`SSE Auth Success: VIP clientId=${vipAuth.clientId} sessionId=${sessionId}`);
        return next();
      } else {
        console.warn(`SSE Auth Failed: Invalid VIP token or wrong session sessionId=${sessionId}`);
        res.status(403).json({ error: "Unauthorized access to this session" });
        return;
      }
    }

    // 3. Check for Staff Authentication
    // Option A: If upstream middleware (e.g., Clerk, Auth.js) has populated req.user
    if (req.user && req.user.id) {
      // Verify the user is the host of this session OR has admin role
      const isHost = req.user.id === session.hostUserId;
      const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
      
      if (isHost || isAdmin) {
        req.auth = {
          type: "STAFF",
          userId: req.user.id,
          sessionId: parsedSessionId
        };
        console.log(`SSE Auth Success: Staff userId=${req.user.id} sessionId=${sessionId}`);
        return next();
      } else {
        console.warn(`SSE Auth Failed: User ${req.user.id} is not host of session ${sessionId}`);
        res.status(403).json({ error: "You are not the host of this session" });
        return;
      }
    }

    // Option B: Check Authorization header for JWT
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify JWT - use the same secret as the main app
        const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
        if (!jwtSecret) {
          console.error("SSE Auth: No JWT_SECRET configured");
          res.status(500).json({ error: "Server configuration error" });
          return;
        }
        
        const decoded = jwt.verify(token, jwtSecret) as { userId: number; role?: string };
        
        // Verify the user is the host of this session OR has admin role
        const isHost = decoded.userId === session.hostUserId;
        const isAdmin = decoded.role === 'admin' || decoded.role === 'superadmin';
        
        if (isHost || isAdmin) {
          req.auth = {
            type: "STAFF",
            userId: decoded.userId,
            sessionId: parsedSessionId
          };
          console.log(`SSE Auth Success: Staff (JWT) userId=${decoded.userId} sessionId=${sessionId}`);
          return next();
        } else {
          console.warn(`SSE Auth Failed: JWT user ${decoded.userId} is not host of session ${sessionId}`);
          res.status(403).json({ error: "You are not the host of this session" });
          return;
        }
      } catch (jwtError) {
        console.warn(`SSE Auth Failed: Invalid JWT token`, jwtError);
        res.status(401).json({ error: "Invalid authentication token" });
        return;
      }
    }

    // Default Reject - no valid authentication provided
    res.status(401).json({ error: "Authentication required" });
    return;

  } catch (err) {
    console.error("SSE Auth Middleware Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
}
