/**
 * AI Browser QA Agent Types
 *
 * Type definitions for the AI-driven browser QA system.
 */

export type ActionType =
  | "click"
  | "fill"
  | "select"
  | "hover"
  | "scroll"
  | "navigate"
  | "assert"
  | "screenshot"
  | "wait"
  | "done";

export interface AgentAction {
  action: ActionType;
  /** CSS selector or text to find element */
  selector?: string;
  /** Value for fill/select actions */
  value?: string;
  /** URL for navigate action */
  url?: string;
  /** Assertion description for assert action */
  assertion?: string;
  /** Reasoning for why this action was chosen */
  reasoning: string;
  /** Confidence level 0-1 */
  confidence: number;
}

export interface AgentState {
  url: string;
  pageTitle: string;
  stepNumber: number;
  previousActions: AgentAction[];
  errors: string[];
  networkFailures: Array<{ url: string; status: number }>;
}

export interface AgentConfig {
  /** Maximum steps before stopping */
  maxSteps: number;
  /** Task description for the agent */
  task: string;
  /** Starting URL */
  startUrl: string;
  /** Whether to require login first */
  requiresAuth: boolean;
  /** User role for auth */
  authRole?: "admin" | "standard" | "vipClient";
  /** Stop on first assertion failure */
  failFast: boolean;
  /** Take screenshots at each step */
  screenshotEachStep: boolean;
}

export interface AgentResult {
  success: boolean;
  stepsCompleted: number;
  actions: AgentAction[];
  assertions: Array<{ passed: boolean; description: string }>;
  errors: string[];
  screenshots: string[];
  duration: number;
}

export interface QAScenario {
  name: string;
  description: string;
  config: Partial<AgentConfig>;
}

export const DEFAULT_CONFIG: AgentConfig = {
  maxSteps: 20,
  task: "Explore the application and verify core functionality works",
  startUrl: "/",
  requiresAuth: true,
  authRole: "admin",
  failFast: false,
  screenshotEachStep: false,
};
