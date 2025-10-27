import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class ClerkAuthService {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  async createSessionToken(
    userId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId: userId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return { openId, appId, name };
    } catch (error) {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = req.headers.cookie?.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>) || {};

    const sessionCookie = cookies[COOKIE_NAME];
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUser(sessionUserId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const clerkAuth = new ClerkAuthService();

export function registerClerkOAuthRoutes(app: Express) {
  // Clerk webhook to sync users
  app.post("/api/clerk/webhook", async (req: Request, res: Response) => {
    try {
      const event = req.body;
      
      if (event.type === "user.created" || event.type === "user.updated") {
        const user = event.data;
        await db.upsertUser({
          openId: user.id,
          name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
          email: user.email_addresses?.[0]?.email_address || null,
          loginMethod: "clerk",
          lastSignedIn: new Date(),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Clerk] Webhook failed", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Clerk callback handler
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    try {
      const clerkUserId = req.query.userId as string;
      
      if (!clerkUserId) {
        res.status(400).json({ error: "userId required" });
        return;
      }

      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      
      await db.upsertUser({
        openId: clerkUser.id,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
        loginMethod: "clerk",
        lastSignedIn: new Date(),
      });

      const sessionToken = await clerkAuth.createSessionToken(clerkUser.id, {
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[Clerk] Callback failed", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
}

