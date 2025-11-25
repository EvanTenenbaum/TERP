import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { simpleAuth } from "./simpleAuth";
import { getUserByEmail, getUser, upsertUser } from "../db";
import { env } from "./env";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const PUBLIC_USER_EMAIL =
  env.PUBLIC_DEMO_USER_EMAIL || "demo+public@terp-app.local";
const PUBLIC_USER_ID = env.PUBLIC_DEMO_USER_ID || "public-demo-user";

async function getOrCreatePublicUser(): Promise<User | null> {
  try {
    const existing = await getUserByEmail(PUBLIC_USER_EMAIL);
    if (existing) {
      return existing;
    }

    await upsertUser({
      openId: PUBLIC_USER_ID,
      email: PUBLIC_USER_EMAIL,
      name: "Public Demo User",
      role: "user",
      lastSignedIn: new Date(),
    });

    const created = await getUser(PUBLIC_USER_ID);
    if (created) {
      return created;
    }
  } catch (error) {
    logger.warn(
      { error },
      "[Public Access] Failed to provision public demo user"
    );
  }

  const now = new Date();
  return {
    id: -1,
    openId: PUBLIC_USER_ID,
    email: PUBLIC_USER_EMAIL,
    name: "Public Demo User",
    role: "user",
    loginMethod: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await simpleAuth.authenticateRequest(opts.req);
    logger.info({ userId: user?.id }, "[Context] Authenticated user found");
  } catch (error) {
    // Authentication is optional - this is expected for public access
    logger.info("[Context] No authenticated user, provisioning public user");
    user = null;
  }

  if (!user) {
    try {
      user = await getOrCreatePublicUser();
      logger.info({ userId: user?.id, email: user?.email }, "[Context] Public user provisioned");
    } catch (error) {
      logger.warn({ error }, "[Public Access] Failed to get/create public user, using synthetic fallback");
      // Fallback to synthetic user if everything fails
      const now = new Date();
      user = {
        id: -1,
        openId: PUBLIC_USER_ID,
        email: PUBLIC_USER_EMAIL,
        name: "Public Demo User",
        role: "user",
        loginMethod: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      };
      logger.info("[Context] Using synthetic public user fallback");
    }
  }

  // Ensure user is never null
  if (!user) {
    const now = new Date();
    user = {
      id: -1,
      openId: PUBLIC_USER_ID,
      email: PUBLIC_USER_EMAIL,
      name: "Public Demo User",
      role: "user",
      loginMethod: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    logger.warn("[Context] Final fallback: created synthetic user");
  }

  logger.info({ userId: user.id, email: user.email, openId: user.openId }, "[Context] Context created with user");

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

