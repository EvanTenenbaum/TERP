/**
 * Test Oracle DSL Types
 *
 * Type definitions for the YAML-based test oracle system.
 */

export type QARole =
  | "SuperAdmin"
  | "SalesManager"
  | "SalesRep"
  | "InventoryManager"
  | "Fulfillment"
  | "AccountingManager"
  | "Auditor";

export type OracleActionType =
  | "navigate"
  | "click"
  | "type"
  | "select"
  | "add_line_item"
  | "assert"
  | "wait"
  | "screenshot"
  | "store"
  | "custom";

// Base action interface
interface BaseAction {
  action: OracleActionType;
  description?: string;
}

// Navigate action
export interface NavigateAction extends BaseAction {
  action: "navigate";
  path: string;
  wait_for?: string;
}

// Click action
export interface ClickAction extends BaseAction {
  action: "click";
  target?: string;
  target_text?: string;
  target_label?: string;
  wait_after?: number;
  wait_for_navigation?: boolean;
}

// Type/Fill action
export interface TypeAction extends BaseAction {
  action: "type";
  target: string;
  value?: string;
  value_ref?: string;
  clear_first?: boolean;
}

// Select action
export interface SelectAction extends BaseAction {
  action: "select";
  target: string;
  value?: string;
  value_ref?: string;
  option_value?: string;
  option_index?: number;
  type_to_search?: boolean;
}

// Add line item action (domain-specific)
export interface AddLineItemAction extends BaseAction {
  action: "add_line_item";
  batch_ref?: string;
  product_ref?: string;
  quantity: number;
  unit_price?: number;
  discount_percent?: number;
}

// Assert action
export interface AssertAction extends BaseAction {
  action: "assert";
  visible?: string;
  not_visible?: string;
  text_contains?: string;
  value_equals?: {
    target: string;
    value: string;
  };
}

// Wait action
export interface WaitAction extends BaseAction {
  action: "wait";
  for?: string;
  duration?: number;
  network_idle?: boolean;
  timeout?: number;
}

// Screenshot action
export interface ScreenshotAction extends BaseAction {
  action: "screenshot";
  name: string;
  full_page?: boolean;
}

// Store action
export interface StoreAction extends BaseAction {
  action: "store";
  from: string;
  as: string;
}

// Custom action
export interface CustomAction extends BaseAction {
  action: "custom";
  code: string;
}

export type OracleAction =
  | NavigateAction
  | ClickAction
  | TypeAction
  | SelectAction
  | AddLineItemAction
  | AssertAction
  | WaitAction
  | ScreenshotAction
  | StoreAction
  | CustomAction;

// Precondition entity reference
export interface EntityPrecondition {
  entity: string;
  ref: string;
  where?: Record<string, unknown>;
}

// Precondition create entity
export interface CreateEntityPrecondition {
  entity: string;
  ref: string;
  data: Record<string, unknown>;
}

// Preconditions section
export interface OraclePreconditions {
  ensure?: EntityPrecondition[];
  create?: CreateEntityPrecondition[];
  feature_flags?: string[];
}

// Expected UI state
export interface ExpectedUIState {
  url_contains?: string;
  url_matches?: string;
  url_equals?: string;
  visible?: string[];
  not_visible?: string[];
  text_present?: string[];
  fields?: Record<string, string | number>;
  totals?: Record<string, number>;
  table?: {
    selector: string;
    min_rows?: number;
    max_rows?: number;
    columns?: Array<{
      header: string;
      contains?: string;
      equals?: string;
    }>;
  };
}

// DB where clause
export interface DBWhereClause {
  [key: string]: unknown;
}

// DB expect clause
export interface DBExpectClause {
  [key: string]: unknown;
}

// DB table assertion
export interface DBTableAssertion {
  where: DBWhereClause;
  expect: DBExpectClause;
  count?: number;
  store_as?: string;
}

// DB invariant
export interface DBInvariant {
  name: string;
  query: string;
  assert: string;
}

// Expected DB state
export interface ExpectedDBState {
  [tableName: string]: DBTableAssertion[] | DBInvariant[] | undefined;
  invariants?: DBInvariant[];
}

// Retry configuration
export interface OracleRetryConfig {
  count: number;
  delay: number;
}

// Complete Oracle definition
export interface TestOracle {
  flow_id: string;
  description: string;
  role: QARole;
  seed_profile?: string;
  tags?: string[];
  timeout?: number;
  retry?: OracleRetryConfig;
  preconditions: OraclePreconditions;
  steps: OracleAction[];
  expected_ui?: ExpectedUIState;
  expected_db?: ExpectedDBState;
}

// Seed profile entity
export interface SeedProfileEntity {
  table: string;
  data: Record<string, unknown>;
}

// Seed profile definition
export interface SeedProfile {
  profile: string;
  description: string;
  entities: Record<string, SeedProfileEntity>;
}

// Oracle execution context
export interface OracleContext {
  seed: Record<string, Record<string, unknown>>;
  stored: Record<string, unknown>;
  created: Record<string, Record<string, unknown>>;
  temp: Record<string, Record<string, unknown>>;
}

// Oracle execution result
export interface OracleResult {
  flow_id: string;
  success: boolean;
  duration: number;
  steps_completed: number;
  total_steps: number;
  ui_assertions: {
    passed: number;
    failed: number;
    details: Array<{
      assertion: string;
      passed: boolean;
      error?: string;
    }>;
  };
  db_assertions: {
    passed: number;
    failed: number;
    details: Array<{
      table: string;
      assertion: string;
      passed: boolean;
      error?: string;
    }>;
  };
  errors: string[];
  screenshots: string[];
}

// QA role credentials mapping
export const QA_CREDENTIALS: Record<QARole, { email: string; password: string }> = {
  SuperAdmin: {
    email: "qa.superadmin@terp.test",
    password: "TerpQA2026!",
  },
  SalesManager: {
    email: "qa.salesmanager@terp.test",
    password: "TerpQA2026!",
  },
  SalesRep: {
    email: "qa.salesrep@terp.test",
    password: "TerpQA2026!",
  },
  InventoryManager: {
    email: "qa.inventory@terp.test",
    password: "TerpQA2026!",
  },
  Fulfillment: {
    email: "qa.fulfillment@terp.test",
    password: "TerpQA2026!",
  },
  AccountingManager: {
    email: "qa.accounting@terp.test",
    password: "TerpQA2026!",
  },
  Auditor: {
    email: "qa.auditor@terp.test",
    password: "TerpQA2026!",
  },
};
