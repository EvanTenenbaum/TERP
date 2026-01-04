import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import type { TrpcContext } from "../../server/_core/context";

function buildMockExpressRequest(): CreateExpressContextOptions["req"] {
  return {
    headers: {},
    cookies: {},
    url: "/",
  } as CreateExpressContextOptions["req"];
}

function buildMockExpressResponse(): CreateExpressContextOptions["res"] {
  return {
    setHeader: () => undefined,
    getHeader: () => undefined,
    clearCookie: () => undefined,
  } as CreateExpressContextOptions["res"];
}

export function createMockUser(overrides?: Partial<User>): User {
  const now = new Date();
  return {
    id: 999,
    openId: "test-user",
    email: "test@terp.app",
    name: "Test User",
    role: "admin",
    loginMethod: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    ...overrides,
  } as User;
}

export function createMockContext(
  overrides?: Partial<TrpcContext>
): TrpcContext {
  return {
    req: buildMockExpressRequest(),
    res: buildMockExpressResponse(),
    user: createMockUser(),
    isPublicDemoUser: false,
    ...overrides,
  } satisfies TrpcContext;
}
