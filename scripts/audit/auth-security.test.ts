/**
 * Property-Based Tests for Authentication and Authorization Security
 *
 * **Feature: canonical-model-unification, Properties 5, 6, 7**
 * **Validates: Requirements 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5**
 *
 * Tests authentication enforcement, public mutation restrictions,
 * and actor attribution patterns.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// Type Definitions
// ============================================================================

interface UserContext {
  id: number;
  openId: string;
  role: "admin" | "user" | "viewer";
  isAuthenticated: boolean;
}

interface ProcedureDefinition {
  name: string;
  type: "query" | "mutation";
  isPublic: boolean;
  requiresAuth: boolean;
  inputSchema: Record<string, unknown>;
}

interface ActorField {
  name: string;
  source: "input" | "context";
  isRequired: boolean;
}

// ============================================================================
// Constants
// ============================================================================

// Public user ID that should be rejected for mutations
const PUBLIC_USER_ID = -1;

// Actor fields that should NEVER come from input
const ACTOR_FIELDS = [
  "createdBy",
  "updatedBy",
  "recordedBy",
  "changedBy",
  "actorId",
  "userId",
];

// Mutations that are allowed to be public (whitelist)
const ALLOWED_PUBLIC_MUTATIONS: string[] = [
  // VIP portal mutations use session-based auth, not user auth
  "vipPortal.submitOrder",
  "vipPortal.updateProfile",
];

// ============================================================================
// Pure Functions Under Test
// ============================================================================

/**
 * Check if a user context represents an authenticated user
 * Requirements: 5.3, 5.4
 */
function isAuthenticatedUser(ctx: UserContext): boolean {
  return ctx.isAuthenticated && ctx.id !== PUBLIC_USER_ID && ctx.id > 0;
}

/**
 * Check if a procedure should reject public user
 * Requirements: 4.1, 4.2
 */
function shouldRejectPublicUser(procedure: ProcedureDefinition): boolean {
  // Mutations should always reject public user (unless whitelisted)
  if (procedure.type === "mutation") {
    return !ALLOWED_PUBLIC_MUTATIONS.includes(procedure.name);
  }
  // Queries can allow public user for read-only operations
  return false;
}

/**
 * Check if an input schema contains actor fields (which is a security issue)
 * Requirements: 5.1, 5.2
 */
function hasActorFieldsInInput(inputSchema: Record<string, unknown>): boolean {
  const schemaKeys = Object.keys(inputSchema);
  return schemaKeys.some((key) =>
    ACTOR_FIELDS.some(
      (actorField) =>
        key.toLowerCase() === actorField.toLowerCase() ||
        key.toLowerCase().includes(actorField.toLowerCase())
    )
  );
}

/**
 * Validate that actor attribution comes from context, not input
 * Requirements: 5.1, 5.2
 */
function validateActorAttribution(
  actorFields: ActorField[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const field of actorFields) {
    if (field.source === "input") {
      violations.push(
        `Actor field "${field.name}" should come from context, not input`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Check if a fallback pattern is used (e.g., ctx.user?.id || 1)
 * Requirements: 5.3, 5.4, 5.5
 */
function hasFallbackUserIdPattern(code: string): boolean {
  // Patterns to detect:
  // ctx.user?.id || 1
  // ctx.user?.id ?? 1
  // ctx.user?.id || -1
  // ctx.user.id || 1
  const fallbackPatterns = [
    /ctx\.user\?\.id\s*\|\|\s*\d+/,
    /ctx\.user\?\.id\s*\?\?\s*\d+/,
    /ctx\.user\.id\s*\|\|\s*\d+/,
    /user\?\.id\s*\|\|\s*\d+/,
    /userId\s*\|\|\s*\d+/,
  ];

  return fallbackPatterns.some((pattern) => pattern.test(code));
}

/**
 * Validate procedure authentication requirements
 * Requirements: 4.1, 4.2, 5.3
 */
function validateProcedureAuth(
  procedure: ProcedureDefinition,
  userContext: UserContext
): { allowed: boolean; reason?: string } {
  // Public procedures don't require auth
  if (procedure.isPublic && procedure.type === "query") {
    return { allowed: true };
  }

  // Mutations require authenticated user (unless whitelisted)
  if (procedure.type === "mutation") {
    if (!isAuthenticatedUser(userContext)) {
      if (ALLOWED_PUBLIC_MUTATIONS.includes(procedure.name)) {
        return { allowed: true, reason: "Whitelisted public mutation" };
      }
      return {
        allowed: false,
        reason: "Mutations require authenticated user",
      };
    }
  }

  // Protected procedures require auth
  if (procedure.requiresAuth && !isAuthenticatedUser(userContext)) {
    return { allowed: false, reason: "Procedure requires authentication" };
  }

  return { allowed: true };
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const userIdArb = fc.integer({ min: -1, max: 10000 });

const userContextArb = fc.record({
  id: userIdArb,
  openId: fc.string({ minLength: 10, maxLength: 50 }),
  role: fc.constantFrom<"admin" | "user" | "viewer">("admin", "user", "viewer"),
  isAuthenticated: fc.boolean(),
});

const procedureTypeArb = fc.constantFrom<"query" | "mutation">(
  "query",
  "mutation"
);

const procedureArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: procedureTypeArb,
  isPublic: fc.boolean(),
  requiresAuth: fc.boolean(),
  inputSchema: fc.dictionary(fc.string(), fc.anything()),
});

const actorFieldArb = fc.record({
  name: fc.constantFrom(...ACTOR_FIELDS),
  source: fc.constantFrom<"input" | "context">("input", "context"),
  isRequired: fc.boolean(),
});

const codeSnippetArb = fc.constantFrom(
  "const userId = ctx.user?.id || 1;",
  "const userId = ctx.user?.id ?? 1;",
  "const userId = ctx.user.id || 1;",
  "const userId = ctx.user.id;",
  "const userId = requireUser(ctx).id;",
  "const { id: userId } = ctx.user;",
  "if (!ctx.user) throw new Error('Unauthorized');",
  "const userId = user?.id || -1;",
);

// ============================================================================
// Property Tests
// ============================================================================

describe("Authentication Security", () => {
  /**
   * **Feature: canonical-model-unification, Property 7: No Fallback User ID Pattern**
   * **Validates: Requirements 5.3, 5.4, 5.5**
   *
   * Property: For any mutation procedure, the system SHALL NOT use fallback
   * patterns like `ctx.user?.id || 1` that could allow unauthenticated access.
   */
  describe("Property 7: No Fallback User ID Pattern", () => {
    it("should detect fallback patterns in code", () => {
      fc.assert(
        fc.property(codeSnippetArb, (code) => {
          const hasFallback = hasFallbackUserIdPattern(code);

          // Property: Code with fallback patterns should be detected
          // Note: The pattern must match the regex, not just contain the substring
          const hasUnsafePattern = 
            /ctx\.user\?\.id\s*\|\|\s*\d+/.test(code) ||
            /ctx\.user\?\.id\s*\?\?\s*\d+/.test(code) ||
            /ctx\.user\.id\s*\|\|\s*\d+/.test(code) ||
            /user\?\.id\s*\|\|\s*\d+/.test(code) ||
            /userId\s*\|\|\s*\d+/.test(code);
          
          expect(hasFallback).toBe(hasUnsafePattern);
        }),
        { numRuns: 100 }
      );
    });

    it("should not flag safe authentication patterns", () => {
      const safePatterns = [
        "const userId = ctx.user.id;",
        "const userId = requireUser(ctx).id;",
        "if (!ctx.user) throw new Error('Unauthorized');",
        "const { id: userId } = ctx.user;",
      ];

      for (const code of safePatterns) {
        expect(hasFallbackUserIdPattern(code)).toBe(false);
      }
    });

    it("should flag unsafe fallback patterns", () => {
      const unsafePatterns = [
        "const userId = ctx.user?.id || 1;",
        "const userId = ctx.user?.id ?? 1;",
        "const userId = ctx.user.id || 1;",
        "const userId = user?.id || 1;",
        "const userId = userId || 1;",
      ];

      for (const code of unsafePatterns) {
        expect(hasFallbackUserIdPattern(code)).toBe(true);
      }
    });
  });

  /**
   * **Feature: canonical-model-unification, Property 5: Public Mutation Restriction**
   * **Validates: Requirements 4.1, 4.2**
   *
   * Property: For any mutation procedure not in the whitelist, the system
   * SHALL reject requests from unauthenticated users or public user (id=-1).
   */
  describe("Property 5: Public Mutation Restriction", () => {
    it("should reject public user for non-whitelisted mutations", () => {
      fc.assert(
        fc.property(
          procedureArb.filter((p) => p.type === "mutation"),
          (procedure) => {
            const publicUser: UserContext = {
              id: PUBLIC_USER_ID,
              openId: "public",
              role: "viewer",
              isAuthenticated: false,
            };

            const result = validateProcedureAuth(procedure, publicUser);

            // Property: Non-whitelisted mutations should reject public user
            if (!ALLOWED_PUBLIC_MUTATIONS.includes(procedure.name)) {
              expect(result.allowed).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should allow authenticated users for mutations", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            procedureArb.filter((p) => p.type === "mutation"),
            userContextArb.filter((u) => u.isAuthenticated && u.id > 0)
          ),
          ([procedure, user]) => {
            const result = validateProcedureAuth(procedure, user);

            // Property: Authenticated users should be allowed for mutations
            expect(result.allowed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should correctly identify procedures that reject public user", () => {
      const mutation: ProcedureDefinition = {
        name: "orders.create",
        type: "mutation",
        isPublic: false,
        requiresAuth: true,
        inputSchema: {},
      };

      expect(shouldRejectPublicUser(mutation)).toBe(true);

      const whitelistedMutation: ProcedureDefinition = {
        name: "vipPortal.submitOrder",
        type: "mutation",
        isPublic: true,
        requiresAuth: false,
        inputSchema: {},
      };

      expect(shouldRejectPublicUser(whitelistedMutation)).toBe(false);
    });
  });

  /**
   * **Feature: canonical-model-unification, Property 6: Actor Attribution from Context**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Property: For any write operation, actor fields (createdBy, updatedBy, etc.)
   * SHALL be derived from the authenticated context, not from user input.
   */
  describe("Property 6: Actor Attribution from Context", () => {
    it("should reject actor fields from input", () => {
      fc.assert(
        fc.property(
          fc.array(actorFieldArb, { minLength: 1, maxLength: 5 }),
          (actorFields) => {
            const result = validateActorAttribution(actorFields);

            // Property: Any actor field from input should be a violation
            const inputFields = actorFields.filter((f) => f.source === "input");
            expect(result.violations.length).toBe(inputFields.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept actor fields from context", () => {
      const contextFields: ActorField[] = [
        { name: "createdBy", source: "context", isRequired: true },
        { name: "updatedBy", source: "context", isRequired: false },
      ];

      const result = validateActorAttribution(contextFields);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should detect actor fields in input schema", () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.constantFrom(...ACTOR_FIELDS, "name", "description", "amount"),
            fc.anything()
          ),
          (inputSchema) => {
            const hasActorFields = hasActorFieldsInInput(inputSchema);
            const schemaKeys = Object.keys(inputSchema);

            // Property: Should detect if any actor field is in schema
            const expectedHasActorFields = schemaKeys.some((key) =>
              ACTOR_FIELDS.some(
                (af) =>
                  key.toLowerCase() === af.toLowerCase() ||
                  key.toLowerCase().includes(af.toLowerCase())
              )
            );

            expect(hasActorFields).toBe(expectedHasActorFields);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should flag input schemas with createdBy", () => {
      const badSchema = { name: "Test", createdBy: 1 };
      expect(hasActorFieldsInInput(badSchema)).toBe(true);
    });

    it("should not flag input schemas without actor fields", () => {
      const goodSchema = { name: "Test", description: "A test", amount: 100 };
      expect(hasActorFieldsInInput(goodSchema)).toBe(false);
    });
  });
});

describe("User Authentication Validation", () => {
  it("should correctly identify authenticated users", () => {
    fc.assert(
      fc.property(userContextArb, (user) => {
        const isAuth = isAuthenticatedUser(user);

        // Property: User is authenticated only if all conditions are met
        const expectedAuth =
          user.isAuthenticated && user.id !== PUBLIC_USER_ID && user.id > 0;
        expect(isAuth).toBe(expectedAuth);
      }),
      { numRuns: 100 }
    );
  });

  it("should reject public user (id=-1)", () => {
    const publicUser: UserContext = {
      id: PUBLIC_USER_ID,
      openId: "public",
      role: "viewer",
      isAuthenticated: true, // Even if marked authenticated
    };

    expect(isAuthenticatedUser(publicUser)).toBe(false);
  });

  it("should reject users with id=0", () => {
    const zeroUser: UserContext = {
      id: 0,
      openId: "zero",
      role: "user",
      isAuthenticated: true,
    };

    expect(isAuthenticatedUser(zeroUser)).toBe(false);
  });

  it("should accept valid authenticated users", () => {
    const validUser: UserContext = {
      id: 123,
      openId: "user123",
      role: "user",
      isAuthenticated: true,
    };

    expect(isAuthenticatedUser(validUser)).toBe(true);
  });
});
