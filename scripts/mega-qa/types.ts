/**
 * Mega QA Types - Machine-readable report bundle schema
 *
 * These types define the structure of the Mega QA report bundle,
 * optimized for AI-only consumption and replay.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface MegaQAConfig {
  /** Seed scenario: light, full, edge, chaos */
  scenario: "light" | "full" | "edge" | "chaos";

  /** Number of randomized journeys to run */
  journeyCount: number;

  /** Master RNG seed for reproducibility (random if not provided) */
  seed?: number;

  /** Base URL for the app under test */
  baseURL: string;

  /** Output directory for report bundle */
  outputDir: string;

  /** Run mode */
  mode: "standard" | "soak" | "quick";

  /** Soak duration in minutes (only for soak mode) */
  soakDuration?: number;

  /** Whether to run in headless mode */
  headless: boolean;

  /** CI mode (stricter timeouts, no retries) */
  ci: boolean;
}

// ============================================================================
// Coverage Types
// ============================================================================

export interface CoverageTag {
  /** Tag identifier (e.g., TS-001, route:/orders, api:orders.create) */
  id: string;

  /** Tag category */
  category: "ts-protocol" | "route" | "api" | "regression";

  /** Human-readable description */
  description: string;

  /** Whether this tag is required (vs optional) */
  required: boolean;
}

export interface CoverageReport {
  /** All required tags */
  required: CoverageTag[];

  /** Tags that were hit during the run */
  covered: string[];

  /** Tags that were missed */
  missing: string[];

  /** Explicitly waived tags with rationale */
  waivers: Array<{ tagId: string; rationale: string }>;

  /** Coverage percentage */
  coveragePercent: number;

  /** Whether coverage gate passed */
  passed: boolean;
}

// ============================================================================
// Failure Types
// ============================================================================

export interface FailureReplay {
  /** RNG seed used for this journey/test */
  seed: number;

  /** Persona used (admin, standard, vip, logged-out) */
  persona: string;

  /** Step-by-step transcript of actions taken */
  steps: FailureStep[];

  /** URL history during the failure */
  urlHistory: string[];

  /** Command to replay this failure */
  replayCommand: string;
}

export interface FailureStep {
  /** Step index */
  index: number;

  /** Action type (click, type, navigate, assert, etc.) */
  action: string;

  /** Selector or target */
  target?: string;

  /** Input value if applicable */
  value?: string;

  /** Timestamp */
  timestamp: string;

  /** Whether this step succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

export interface FailureEvidence {
  /** Console errors captured */
  consoleErrors: string[];

  /** Network failures (4xx, 5xx, timeouts) */
  networkFailures: NetworkFailure[];

  /** Path to trace file */
  tracePath?: string;

  /** Path to screenshot */
  screenshotPath?: string;

  /** Path to video if captured */
  videoPath?: string;
}

export interface NetworkFailure {
  /** Request URL */
  url: string;

  /** HTTP method */
  method: string;

  /** Response status code */
  status: number;

  /** Error message */
  error?: string;

  /** Response body snippet (truncated) */
  responseSnippet?: string;
}

export interface Failure {
  /** Unique failure ID */
  id: string;

  /** Failure classification */
  classification: "frontend" | "backend" | "seed" | "environment" | "unknown";

  /** Suite that produced this failure */
  suite: string;

  /** Test name */
  testName: string;

  /** Error message */
  errorMessage: string;

  /** Error stack trace */
  errorStack?: string;

  /** Replay information */
  replay: FailureReplay;

  /** Evidence captured */
  evidence: FailureEvidence;

  /** Timestamp */
  timestamp: string;

  /** Whether this is a known failure from history */
  isKnown: boolean;

  /** Tags covered by this test (even if it failed) */
  coveredTags: string[];
}

// ============================================================================
// Report Bundle Types
// ============================================================================

export interface RunManifest {
  /** Run ID (timestamp-based) */
  runId: string;

  /** Git SHA at time of run */
  gitSha: string;

  /** Git branch */
  gitBranch: string;

  /** Run timestamp */
  timestamp: string;

  /** Configuration used */
  config: MegaQAConfig;

  /** Environment info */
  environment: {
    nodeVersion: string;
    platform: string;
    ci: boolean;
  };

  /** Duration in milliseconds */
  durationMs: number;

  /** Overall result */
  result: "pass" | "fail" | "error";

  /** Exit code */
  exitCode: 0 | 1 | 2;
}

export interface SuiteResult {
  /** Suite name */
  name: string;

  /** Suite category */
  category:
    | "must-hit"
    | "journey"
    | "invariant"
    | "contract"
    | "property"
    | "concurrency"
    | "perf"
    | "a11y"
    | "visual"
    | "resilience"
    | "soak"
    | "security";

  /** Number of tests run */
  testsRun: number;

  /** Number of tests passed */
  testsPassed: number;

  /** Number of tests failed */
  testsFailed: number;

  /** Number of tests skipped */
  testsSkipped: number;

  /** Duration in milliseconds */
  durationMs: number;

  /** Failure IDs from this suite */
  failureIds: string[];

  /** Tags covered by this suite */
  coveredTags: string[];
}

export interface ArtifactIndex {
  /** Trace files */
  traces: Array<{ failureId: string; path: string }>;

  /** Screenshot files */
  screenshots: Array<{ failureId: string; path: string }>;

  /** Video files */
  videos: Array<{ failureId: string; path: string }>;

  /** Visual diff files */
  visualDiffs: Array<{ name: string; path: string }>;

  /** Other artifacts */
  other: Array<{ name: string; path: string }>;
}

export interface MegaQAReportBundle {
  /** Run manifest */
  manifest: RunManifest;

  /** Coverage report */
  coverage: CoverageReport;

  /** Suite results */
  suites: SuiteResult[];

  /** All failures */
  failures: Failure[];

  /** Artifact index */
  artifacts: ArtifactIndex;

  /** Summary statistics */
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    coveragePercent: number;
    newFailures: number;
    knownFailures: number;
  };
}

// ============================================================================
// Journey Types
// ============================================================================

export interface JourneyAction {
  /** Action type */
  type:
    | "navigate"
    | "click"
    | "type"
    | "select"
    | "assert"
    | "wait"
    | "keyboard";

  /** Target selector or URL */
  target: string;

  /** Value for type actions */
  value?: string;

  /** Coverage tags this action contributes to */
  tags: string[];

  /** Weight for random selection (higher = more likely) */
  weight: number;

  /** Guard condition (function returning boolean) */
  guard?: string;
}

export interface JourneyPersona {
  /** Persona name */
  name: "admin" | "standard" | "vip" | "logged-out";

  /** Login credentials */
  credentials?: {
    email: string;
    password: string;
  };

  /** Available actions for this persona */
  availableActions: string[];
}

export interface JourneyResult {
  /** Journey index */
  index: number;

  /** RNG seed used */
  seed: number;

  /** Persona used */
  persona: string;

  /** Steps executed */
  steps: FailureStep[];

  /** Tags covered */
  coveredTags: string[];

  /** Whether journey passed */
  passed: boolean;

  /** Failure ID if failed */
  failureId?: string;

  /** Duration in milliseconds */
  durationMs: number;
}
