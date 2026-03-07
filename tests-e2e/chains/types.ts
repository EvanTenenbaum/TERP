/**
 * Chain Test DSL Types
 *
 * Type definitions for the persona-driven chain test system.
 * Chains model multi-step business workflows with CRUD lifecycle testing.
 */

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

interface BaseAction {
  action: string;
  description?: string;
}

export interface NavigateAction extends BaseAction {
  action: "navigate";
  path: string;
  wait_for?: string;
  timeout?: number;
}

export interface ClickAction extends BaseAction {
  action: "click";
  target?: string;
  target_text?: string;
  wait_for?: string;
  wait_after?: number;
  timeout?: number;
}

export interface TypeAction extends BaseAction {
  action: "type";
  target: string;
  value: string;
  clear_first?: boolean;
}

export interface SelectAction extends BaseAction {
  action: "select";
  target: string;
  value: string;
}

export interface AssertAction extends BaseAction {
  action: "assert";
  visible?: string;
  not_visible?: string;
  text_contains?: string;
}

export interface WaitAction extends BaseAction {
  action: "wait";
  network_idle?: boolean;
  duration?: number;
  timeout?: number;
}

export interface ScreenshotAction extends BaseAction {
  action: "screenshot";
  name: string;
  full_page?: boolean;
}

export interface StoreAction extends BaseAction {
  action: "store";
  from: string;
  as: string;
}

export type OracleAction =
  | NavigateAction
  | ClickAction
  | TypeAction
  | SelectAction
  | AssertAction
  | WaitAction
  | ScreenshotAction
  | StoreAction;

// ---------------------------------------------------------------------------
// Phase and Chain
// ---------------------------------------------------------------------------

export interface ExpectedUIState {
  url_contains?: string;
  url_matches?: string;
  visible?: string[];
  not_visible?: string[];
  text_present?: string[];
}

export interface ChainPhase {
  phase_id: string;
  description: string;
  steps: OracleAction[];
  expected_ui?: ExpectedUIState;
  extract?: Record<string, string>;
  screenshot?: string;
  timeout?: number;
}

export interface ChainPreconditions {
  require_data?: string[];
  feature_flags?: string[];
  roles?: string[];
}

export interface ChainInvariant {
  name: string;
  description: string;
}

export interface TestChain {
  chain_id: string;
  description: string;
  tags: string[];
  phases: ChainPhase[];
  preconditions?: ChainPreconditions;
  invariants?: ChainInvariant[];
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Persona
// ---------------------------------------------------------------------------

export interface UserPersona {
  persona_id: string;
  name: string;
  role_description: string;
  daily_chains: string[];
  occasional_chains?: string[];
}
