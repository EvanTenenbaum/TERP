export const env = {
  appId: process.env.VITE_APP_ID ?? "",
  JWT_SECRET: process.env.JWT_SECRET ?? "terp-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

// Legacy export for compatibility
export const ENV = env;
