/**
 * Oracle Test System
 *
 * Exports for the YAML-based test oracle system.
 */

// Types
export * from "./types";

// Auth fixtures
export {
  loginAsRole,
  loginAsSuperAdmin,
  loginAsSalesManager,
  loginAsSalesRep,
  loginAsInventoryManager,
  loginAsFulfillment,
  loginAsAccountingManager,
  loginAsAuditor,
  logout,
  isLoggedIn,
  ensureLoggedInAs,
} from "./auth-fixtures";

// Loader
export {
  loadOracle,
  loadOraclesFromDir,
  loadOraclesByDomain,
  loadOraclesByTags,
  loadTier1Oracles,
  loadTier2Oracles,
  loadSmokeOracles,
  loadSeedProfile,
  getAllOracleIds,
  findOracleById,
  generateOracleSummary,
} from "./loader";

// Executor
export {
  executeOracle,
  createEmptyContext,
  formatOracleResult,
} from "./executor";
