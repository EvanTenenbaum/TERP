// JWT_SECRET with fallback to NEXTAUTH_SECRET for backward compatibility
// Production environments may have NEXTAUTH_SECRET configured (from previous auth system)

// Cache the JWT secret once validated to avoid repeated logging
let cachedJwtSecret: string | null = null;

const getJwtSecret = (): string => {
  // Return cached value if already validated
  if (cachedJwtSecret !== null) {
    return cachedJwtSecret;
  }

  // Try JWT_SECRET first, fall back to NEXTAUTH_SECRET
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  const defaultSecrets = [
    "terp-secret-key-change-in-production",
    "your-secret-key-change-in-production",
  ];

  if (!secret) {
    throw new Error(
      "JWT_SECRET (or NEXTAUTH_SECRET) environment variable is required. " +
        "Set JWT_SECRET to a secure value (minimum 32 characters). " +
        "NEXTAUTH_SECRET is accepted as a fallback for backward compatibility."
    );
  }

  if (defaultSecrets.includes(secret)) {
    throw new Error(
      "JWT_SECRET must be set to a secure value, not a default placeholder. " +
        "Current value appears to be a default that should be changed."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters for security. Current length: ${secret.length}`
    );
  }

  // Log which variable is being used (helpful for debugging)
  if (process.env.JWT_SECRET) {
    console.info("✅ Using JWT_SECRET for authentication");
  } else if (process.env.NEXTAUTH_SECRET) {
    console.info(
      "✅ Using NEXTAUTH_SECRET as fallback for authentication (consider setting JWT_SECRET)"
    );
  }

  // Cache the validated secret
  cachedJwtSecret = secret;
  return secret;
};

// Use an object with getters to defer environment variable access until runtime
// This allows the module to be imported during build without requiring env vars
export const env = {
  get appId() {
    return process.env.VITE_APP_ID ?? "";
  },
  get JWT_SECRET() {
    return getJwtSecret();
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get ownerId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.BUILT_IN_FORGE_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.BUILT_IN_FORGE_API_KEY ?? "";
  },
  // Initial admin credentials (optional - only used on first startup if user doesn't exist)
  get initialAdminUsername() {
    return process.env.INITIAL_ADMIN_USERNAME ?? "";
  },
  get initialAdminPassword() {
    return process.env.INITIAL_ADMIN_PASSWORD ?? "";
  },
  // Public demo user (for unauthenticated access)
  get PUBLIC_DEMO_USER_EMAIL() {
    return process.env.PUBLIC_DEMO_USER_EMAIL ?? "demo+public@terp-app.local";
  },
  get PUBLIC_DEMO_USER_ID() {
    return process.env.PUBLIC_DEMO_USER_ID ?? "public-demo-user";
  },
  // Test auth endpoint (for AI agent E2E testing)
  get enableTestAuth() {
    return process.env.ENABLE_TEST_AUTH === "true";
  },
  // QA authentication (for deterministic RBAC testing)
  // SECURITY: Only enabled in non-production environments
  get qaAuthEnabled() {
    const enabled = process.env.QA_AUTH_ENABLED === "true";
    const isProduction = process.env.NODE_ENV === "production";
    // Safety: Never enable in production
    return enabled && !isProduction;
  },
  // Demo mode: Auto-login as Super Admin for demo/internal use
  // When enabled:
  // - Visitors are auto-authenticated as Super Admin
  // - Role switcher is visible to test different roles
  // - Works in production NODE_ENV (explicit demo flag)
  get DEMO_MODE() {
    return process.env.DEMO_MODE === "true";
  },
};

// Legacy export for compatibility
export const ENV = env;
