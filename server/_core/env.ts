// JWT_SECRET is required - no fallback allowed
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "terp-secret-key-change-in-production" || secret === "your-secret-key-change-in-production") {
    throw new Error("JWT_SECRET environment variable is required and must be set to a secure value (minimum 32 characters). Application cannot start without it.");
  }
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters for security. Current length: " + secret.length);
  }
  return secret;
};

export const env = {
  appId: process.env.VITE_APP_ID ?? "",
  JWT_SECRET: getJwtSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Initial admin credentials (optional - only used on first startup if user doesn't exist)
  initialAdminUsername: process.env.INITIAL_ADMIN_USERNAME ?? "",
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD ?? "",
};

// Legacy export for compatibility
export const ENV = env;
