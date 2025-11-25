// JWT_SECRET with fallback to NEXTAUTH_SECRET for backward compatibility
// Production environments may have NEXTAUTH_SECRET configured (from previous auth system)
const getJwtSecret = (): string => {
  // Try JWT_SECRET first, fall back to NEXTAUTH_SECRET
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  
  const defaultSecrets = [
    "terp-secret-key-change-in-production",
    "your-secret-key-change-in-production"
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
    console.log("✅ Using JWT_SECRET for authentication");
  } else if (process.env.NEXTAUTH_SECRET) {
    console.log("✅ Using NEXTAUTH_SECRET as fallback for authentication (consider setting JWT_SECRET)");
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
