/**
 * Oracle Test System
 *
 * Exports for the YAML-based test oracle system.
 */

// Types
export * from "./types.js";

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
} from "./auth-fixtures.js";

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
} from "./loader.js";

// Executor
export {
  executeOracle,
  createEmptyContext,
  formatOracleResult,
} from "./executor.js";
