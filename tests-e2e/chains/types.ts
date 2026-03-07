/**
 * Chain Testing Types
 *
 * Extends the oracle system to support multi-step cross-domain business process chains
 * and realistic user persona simulations.
 */
import type {
  OracleAction,
  OracleContext,
  ExpectedUIState,
  NavigateAction,
  ClickAction,
  TypeAction,
  SelectAction,
  AssertAction,
  WaitAction,
  ScreenshotAction,
  StoreAction,
} from "../oracles/types";

// Re-export oracle types used by chain consumers
export type {
  OracleAction,
  OracleContext,
  ExpectedUIState,
  NavigateAction,
  ClickAction,
  TypeAction,
  SelectAction,
  AssertAction,
  WaitAction,
  ScreenshotAction,
  StoreAction,
};

// A single phase in a chain - represents one coherent user task
export interface ChainPhase {
  phase_id: string;
  description: string;
  // Navigate to a page and perform actions
  steps: OracleAction[];
  // What to verify after this phase
  expected_ui?: ExpectedUIState;
  // Values to extract and pass to next phase
  extract?: Array<{
    from: string; // CSS selector or "url" or "text:pattern"
    as: string; // key name in context.stored
    pattern?: string; // regex to extract from text
  }>;
  // Screenshot at end of phase
  screenshot?: string;
  // Max time for this phase in ms
  timeout?: number;
}

// A complete chain - sequence of phases that form a business process
export interface TestChain {
  chain_id: string;
  description: string;
  tags: string[];
  // All phases run sequentially, sharing context
  phases: ChainPhase[];
  // Preconditions (same format as oracles)
  preconditions?: {
    ensure?: Array<{
      entity: string;
      ref: string;
      where?: Record<string, unknown>;
    }>;
  };
  // DB invariants to check after entire chain completes
  invariants?: Array<{
    name: string;
    description: string;
    check: string; // "api" or "ui"
    endpoint?: string; // tRPC endpoint to verify
    page?: string; // page URL to verify
    assertions?: string[];
  }>;
}

// User persona - represents a real person's daily workflow
export interface UserPersona {
  persona_id: string;
  name: string;
  role_description: string;
  // Daily workflow chains this persona executes
  daily_chains: string[]; // chain_ids
  // Chains that happen occasionally (weekly, ad-hoc)
  occasional_chains?: string[];
  // How many times to repeat daily workflow in simulation
  daily_repetitions?: number;
}

// Simulation configuration
export interface SimulationConfig {
  simulation_id: string;
  description: string;
  personas: UserPersona[];
  // How many "business days" to simulate
  business_days: number;
  // Run personas sequentially or interleaved
  execution_mode: "sequential" | "interleaved";
  // Target URL
  base_url: string;
}

// Phase execution result
export interface PhaseResult {
  phase_id: string;
  success: boolean;
  duration_ms: number;
  steps_completed: number;
  total_steps: number;
  extracted_values: Record<string, unknown>;
  errors: string[];
  screenshots: string[];
  // Health classification
  failure_type?: "test_infra" | "app_bug" | "data_issue" | "network";
  failure_evidence?: string;
}

// Chain execution result
export interface ChainResult {
  chain_id: string;
  description: string;
  success: boolean;
  duration_ms: number;
  phases: PhaseResult[];
  invariant_results: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
  // Overall health classification
  failure_type?: "test_infra" | "app_bug" | "data_issue" | "network";
  tags_covered: string[];
}

// Day simulation result
export interface DayResult {
  day_number: number;
  persona_id: string;
  chains: ChainResult[];
  summary: {
    total_chains: number;
    passed: number;
    failed: number;
    app_bugs: number;
    test_issues: number;
    data_issues: number;
  };
}

// Full simulation result
export interface SimulationResult {
  simulation_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  config: SimulationConfig;
  days: DayResult[];
  coverage: {
    tags_covered: string[];
    tags_required: string[];
    percentage: number;
  };
  summary: {
    total_chains_run: number;
    total_passed: number;
    total_failed: number;
    app_bugs_found: number;
    test_infra_issues: number;
    data_issues: number;
    unique_pages_visited: string[];
    unique_api_endpoints_hit: string[];
  };
  // Separate lists for clarity
  app_bugs: Array<{
    chain_id: string;
    phase_id: string;
    description: string;
    evidence: string;
    screenshot?: string;
  }>;
  test_infra_issues: Array<{
    chain_id: string;
    phase_id: string;
    description: string;
    evidence: string;
  }>;
}
